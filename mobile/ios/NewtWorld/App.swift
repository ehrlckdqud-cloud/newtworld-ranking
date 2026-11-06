import UIKit
import WebKit
import AVFoundation
import MediaPlayer
import UniformTypeIdentifiers

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = PlayerViewController()
        window?.makeKeyAndVisible()
        return true
    }
}

final class PlayerViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate, UIDocumentPickerDelegate {
    var web: WKWebView!
    let engine = AudioEngine()
    var root: URL!
    let fileQueue = DispatchQueue(label: "world.newt.import")
    override func viewDidLoad() {
        super.viewDidLoad()
        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "newt")
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.uiDelegate = self
        view.backgroundColor = UIColor(red: 0.06, green: 0.17, blue: 0.12, alpha: 1)
        view.addSubview(web)
        web.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            web.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        root = Bundle.main.url(forResource: "web", withExtension: nil)!
        web.loadFileURL(root.appendingPathComponent("index.html"), allowingReadAccessTo: root)
        engine.emit = { [weak self] data in
            guard let bytes = try? JSONSerialization.data(withJSONObject: data), let json = String(data: bytes, encoding: .utf8) else { return }
            self?.web.evaluateJavaScript("window.NWNativeReceive&&window.NWNativeReceive(\(json))", completionHandler: nil)
        }
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let url = message.frameInfo.request.url,
              url.isFileURL, url.standardizedFileURL.path == root.appendingPathComponent("index.html").standardizedFileURL.path,
              let text = message.body as? String, let bytes = text.data(using: .utf8),
              let data = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any], data["version"] as? Int == 1 else { return }
        switch data["command"] as? String {
        case "import":
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.audio], asCopy: true)
            picker.allowsMultipleSelection = true; picker.delegate = self; present(picker, animated: true)
        case "delete":
            guard let id = data["id"] as? String else { return }
            fileQueue.async { [weak self] in
                guard let self = self else { return }
                do { try self.engine.library.delete(id); DispatchQueue.main.async { self.engine.refreshQueue(); self.engine.sendLibrary() } }
                catch { DispatchQueue.main.async { self.engine.emit?(["type":"error", "message":"개인 곡을 삭제하지 못했습니다."]) } }
            }
        default: engine.command(data)
        }
    }
    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        engine.emit?(["type":"notice", "message":"음악을 저장하는 중…"])
        fileQueue.async { [weak self] in
            guard let self = self else { return }; var count = 0, failed = 0
            for url in urls { do { try self.engine.library.importFile(url); count += 1 } catch { failed += 1 } }
            let message = "\(count)곡 저장 완료" + (failed > 0 ? ", \(failed)곡 실패 — 파일 형식과 저장공간을 확인해주세요." : "")
            DispatchQueue.main.async { self.engine.refreshQueue(); self.engine.sendLibrary(); self.engine.emit?(["type":"notice", "message":message]) }
        }
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: "뉴트월드", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "취소", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "삭제", style: .destructive) { _ in completionHandler(true) })
        present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let valid = navigationAction.request.url?.standardizedFileURL == root.appendingPathComponent("index.html").standardizedFileURL
        decisionHandler(valid ? .allow : .cancel)
    }
}

final class AudioEngine {
    let player = AVPlayer()
    let library = LocalLibrary()
    var defaults: [[String: Any]] = []
    var order: [Int] = [], cursor = 0
    var selection = UUID()
    var eqAvailable = false
    var wantsToPlay = false
    var tracks: [[String: Any]] = []
    var index = 0
    var repeatAll = false
    var shuffle = false
    var emit: (([String: Any]) -> Void)?
    var observer: Any?
    var resumeAfterInterruption = false
    var artwork: MPMediaItemArtwork?
    var stopped = false
    var itemObservation: NSKeyValueObservation?
    init() {
        if let saved = UserDefaults.standard.data(forKey: "defaultQueue"), let queue = try? JSONSerialization.jsonObject(with: saved) as? [[String: Any]] { defaults = queue }
        if let settings = UserDefaults.standard.dictionary(forKey: "equalizer") { equalizer(settings) }
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        observer = player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.5, preferredTimescale: 600), queue: .main) { [weak self] _ in self?.report() }
        NotificationCenter.default.addObserver(self, selector: #selector(ended), name: .AVPlayerItemDidPlayToEndTime, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(interrupted(_:)), name: AVAudioSession.interruptionNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(routeChanged(_:)), name: AVAudioSession.routeChangeNotification, object: nil)
        let center = MPRemoteCommandCenter.shared()
        center.playCommand.addTarget { [weak self] _ in self?.play(); return .success }
        center.pauseCommand.addTarget { [weak self] _ in self?.pause(); return .success }
        center.nextTrackCommand.addTarget { [weak self] _ in self?.next(); return .success }
        center.previousTrackCommand.addTarget { [weak self] _ in self?.previous(); return .success }
        center.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let event = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            self?.seek(event.positionTime); return .success
        }
        center.stopCommand.addTarget { [weak self] _ in self?.stop(); return .success }
    }
    func validURL(_ value: String) -> URL? {
        guard let url = URL(string: value), url.scheme == "https", url.host == "ehrlckdqud-cloud.github.io", url.path.hasPrefix("/newtworld-ranking/assets/") else { return nil }
        return url
    }
    func command(_ data: [String: Any]) {
        switch data["command"] as? String {
        case "ready": if tracks.isEmpty { refreshQueue() }; emit?(["type": "ready"]); sendLibrary()
        case "queue":
            guard let incoming = data["tracks"] as? [[String: Any]], incoming.allSatisfy({ validURL($0["url"] as? String ?? "") != nil && !(($0["id"] as? String ?? "").hasPrefix("local-")) }) else { return }
            defaults = incoming
            if let bytes = try? JSONSerialization.data(withJSONObject: incoming) { UserDefaults.standard.set(bytes, forKey: "defaultQueue") }
            modes(data); refreshQueue()
        case "library": sendLibrary()
        case "equalizer": if let settings = data["settings"] as? [String: Any] { equalizer(settings) }
        case "play": play()
        case "pause": pause()
        case "stop": stop()
        case "next": next()
        case "previous": previous()
        case "select": if let id = data["id"] as? String, let i = tracks.firstIndex(where: { $0["id"] as? String == id }) { select(i, autoplay: true) }
        case "seek": seek(data["position"] as? Double ?? 0)
        case "volume": player.volume = Float(max(0, min(1, data["value"] as? Double ?? 0.35)))
        case "modes": modes(data)
        default: report()
        }
    }
    func modes(_ data: [String: Any]) {
        repeatAll = data["repeat"] as? String == "all"
        let wasShuffle = shuffle
        shuffle = data["shuffle"] as? Bool ?? false
        if shuffle != wasShuffle { rebuildOrder() }
    }
    func pause() { wantsToPlay = false; player.pause(); report() }
    func play() {
        wantsToPlay = true
        guard player.currentItem != nil else { report(); return }
        if player.currentItem?.status == .failed { select(index, autoplay: true); return }
        if let duration = player.currentItem?.duration.seconds, duration.isFinite, player.currentTime().seconds >= duration { seek(0) }
        do { stopped = false; try AVAudioSession.sharedInstance().setActive(true); player.play(); report() }
        catch { emit?(["type":"error", "message":"오디오 재생을 시작하지 못했습니다."]) }
    }
    func stop() {
        stopped = true; wantsToPlay = false; player.pause(); MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        report(updateMetadata: false)
    }
    func select(_ i: Int, autoplay: Bool, resetOrder: Bool = true) {
        guard tracks.indices.contains(i), let url = URL(string: tracks[i]["url"] as? String ?? "") else { return }
        index = i; artwork = nil; wantsToPlay = autoplay
        if resetOrder { rebuildOrder() }
        let token = UUID(); selection = token
        let item = AVPlayerItem(url: url)
        player.pause(); player.replaceCurrentItem(with: nil); eqAvailable = false
        let asset = item.asset
        asset.loadTracks(withMediaType: .audio) { [weak self] audioTracks, _ in
            DispatchQueue.main.async {
                guard let self = self, self.selection == token else { return }
                if let track = audioTracks?.first, let tap = NWCreateEqualizerTap() {
                    let input = AVMutableAudioMixInputParameters(track: track)
                    input.audioTapProcessor = tap
                    let mix = AVMutableAudioMix(); mix.inputParameters = [input]; item.audioMix = mix
                    self.eqAvailable = true
                }
                self.player.replaceCurrentItem(with: item)
                if self.wantsToPlay { self.play() } else { self.report() }
            }
        }
        itemObservation = item.observe(\.status, options: [.new]) { [weak self] item, _ in
            if item.status == .failed { DispatchQueue.main.async { self?.emit?(["type":"error", "message":"음원을 불러오지 못했습니다. 재생 버튼을 다시 눌러주세요."]) } }
        }
        report()
        let id = tracks[i]["id"] as? String
        if tracks[i]["local"] as? Bool == true, let artURL = URL(string: tracks[i]["artwork"] as? String ?? ""), let image = UIImage(contentsOfFile: artURL.path) {
            artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }; report()
        } else if let artURL = validURL(tracks[i]["artwork"] as? String ?? "") {
            URLSession.shared.dataTask(with: artURL) { [weak self] data, _, _ in
                guard let data = data, data.count <= 8_000_000, let image = UIImage(data: data) else { return }
                DispatchQueue.main.async {
                    guard let self = self, self.tracks.indices.contains(self.index), self.tracks[self.index]["id"] as? String == id else { return }
                    self.artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }; self.report()
                }
            }.resume()
        }
    }
    func rebuildOrder() {
        guard tracks.indices.contains(index) else { order = []; cursor = 0; return }
        order = shuffle ? [index] + tracks.indices.filter { $0 != index }.shuffled() : Array(tracks.indices)
        cursor = order.firstIndex(of: index) ?? 0
    }
    func next() {
        guard !tracks.isEmpty else { return }
        if cursor + 1 < order.count { cursor += 1; select(order[cursor], autoplay: true, resetOrder: false) }
        else if repeatAll {
            if shuffle { order = Array(tracks.indices).shuffled(); if order.count > 1 && order[0] == index { order.swapAt(0,1) } }
            cursor = 0; select(order[cursor], autoplay: true, resetOrder: false)
        } else { pause() }
    }
    func previous() {
        if player.currentTime().seconds > 3 { seek(0) }
        else if cursor > 0 { cursor -= 1; select(order[cursor], autoplay: true, resetOrder: false) }
        else { seek(0) }
    }
    func sendLibrary() { emit?(["type":"library", "tracks":library.webTracks()]) }
    func refreshQueue() {
        let current = tracks.indices.contains(index) ? tracks[index] : [:], wasPlaying = wantsToPlay
        let previousIndex = index
        tracks = defaults + library.nativeTracks()
        guard !tracks.isEmpty else { selection = UUID(); wantsToPlay = false; player.replaceCurrentItem(with: nil); index = 0; order = []; MPNowPlayingInfoCenter.default().nowPlayingInfo = nil; report(); return }
        if let match = tracks.firstIndex(where: { $0["id"] as? String == current["id"] as? String && $0["url"] as? String == current["url"] as? String }) {
            index = match; rebuildOrder(); report()
        } else { select(min(previousIndex, tracks.count - 1), autoplay: wasPlaying) }
    }
    func equalizer(_ settings: [String: Any]) {
        let values = settings["gains"] as? [Double] ?? []
        let gains: [Float] = (0..<5).map { Float(max(-12, min(12, $0 < values.count ? values[$0] : 0))) }
        let enabled = settings["enabled"] as? Bool ?? false
        gains.withUnsafeBufferPointer { NWSetEqualizer(enabled, $0.baseAddress!) }
        UserDefaults.standard.set(["enabled":enabled, "gains":gains.map { Double($0) }], forKey: "equalizer")
        report()
    }
    func seek(_ seconds: Double) {
        guard seconds.isFinite else { return }
        player.seek(to: CMTime(seconds: max(0, seconds), preferredTimescale: 600)) { [weak self] _ in self?.report() }
    }
    @objc func ended(_ note: Notification) { if let item = note.object as? AVPlayerItem, item === player.currentItem { next() } }
    @objc func interrupted(_ note: Notification) {
        guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt, let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        if type == .began { resumeAfterInterruption = wantsToPlay; pause() }
        else if resumeAfterInterruption, let rawOptions = note.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt, AVAudioSession.InterruptionOptions(rawValue: rawOptions).contains(.shouldResume) { play() }
        report()
    }
    @objc func routeChanged(_ note: Notification) {
        if let reason = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt, reason == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue { pause() }
    }
    func report(updateMetadata: Bool = true) {
        guard tracks.indices.contains(index) else { emit?(["type":"state", "id":"", "position":0, "duration":0, "playing":false]); return }
        let track = tracks[index], p = player.currentTime().seconds, d = player.currentItem?.duration.seconds ?? 0
        let position = p.isFinite ? p : 0, duration = d.isFinite ? d : 0
        emit?(["type":"state", "id":track["id"] ?? "", "position":position, "duration":duration, "playing":wantsToPlay, "eqAvailable":eqAvailable])
        if updateMetadata && !stopped {
            var info: [String: Any] = [MPMediaItemPropertyTitle: track["title"] ?? "", MPMediaItemPropertyArtist: track["artist"] ?? "", MPNowPlayingInfoPropertyElapsedPlaybackTime: position, MPMediaItemPropertyPlaybackDuration: duration, MPNowPlayingInfoPropertyPlaybackRate: player.rate]
            if let artwork = artwork { info[MPMediaItemPropertyArtwork] = artwork }
            MPNowPlayingInfoCenter.default().nowPlayingInfo = info
        }
    }
}
