import UIKit
import WebKit
import AVFoundation
import MediaPlayer

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

final class PlayerViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate {
    var web: WKWebView!
    let engine = AudioEngine()
    var root: URL!
    override func viewDidLoad() {
        super.viewDidLoad()
        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "newt")
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
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
        engine.command(data)
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let valid = navigationAction.request.url?.standardizedFileURL == root.appendingPathComponent("index.html").standardizedFileURL
        decisionHandler(valid ? .allow : .cancel)
    }
}

final class AudioEngine {
    let player = AVPlayer()
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
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        observer = player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.5, preferredTimescale: 600), queue: .main) { [weak self] _ in self?.report() }
        NotificationCenter.default.addObserver(self, selector: #selector(ended), name: .AVPlayerItemDidPlayToEndTime, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(interrupted(_:)), name: AVAudioSession.interruptionNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(routeChanged(_:)), name: AVAudioSession.routeChangeNotification, object: nil)
        let center = MPRemoteCommandCenter.shared()
        center.playCommand.addTarget { [weak self] _ in self?.play(); return .success }
        center.pauseCommand.addTarget { [weak self] _ in self?.player.pause(); self?.report(); return .success }
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
        case "ready": emit?(["type": "ready"])
        case "queue":
            guard tracks.isEmpty, let incoming = data["tracks"] as? [[String: Any]], incoming.count <= 500 else { report(); return }
            tracks = incoming.filter { validURL($0["url"] as? String ?? "") != nil }
            modes(data)
            if !tracks.isEmpty { select(0, autoplay: false) }
        case "play": play()
        case "pause": player.pause(); report()
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
        shuffle = data["shuffle"] as? Bool ?? false
    }
    func play() {
        if player.currentItem?.status == .failed { select(index, autoplay: false) }
        if let duration = player.currentItem?.duration.seconds, duration.isFinite, player.currentTime().seconds >= duration { seek(0) }
        do { stopped = false; try AVAudioSession.sharedInstance().setActive(true); player.play(); report() }
        catch { emit?(["type":"error", "message":"오디오 재생을 시작하지 못했습니다."]) }
    }
    func stop() {
        stopped = true; player.pause(); MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        report(updateMetadata: false)
    }
    func select(_ i: Int, autoplay: Bool) {
        guard tracks.indices.contains(i), let url = validURL(tracks[i]["url"] as? String ?? "") else { return }
        index = i; artwork = nil
        let item = AVPlayerItem(url: url)
        player.replaceCurrentItem(with: item)
        itemObservation = item.observe(\.status, options: [.new]) { [weak self] item, _ in
            if item.status == .failed { DispatchQueue.main.async { self?.emit?(["type":"error", "message":"음원을 불러오지 못했습니다. 재생 버튼을 다시 눌러주세요."]) } }
        }
        if autoplay { play() } else { report() }
        let id = tracks[i]["id"] as? String
        if let artURL = validURL(tracks[i]["artwork"] as? String ?? "") {
            URLSession.shared.dataTask(with: artURL) { [weak self] data, _, _ in
                guard let data = data, data.count <= 8_000_000, let image = UIImage(data: data) else { return }
                DispatchQueue.main.async {
                    guard let self = self, self.tracks.indices.contains(self.index), self.tracks[self.index]["id"] as? String == id else { return }
                    self.artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }; self.report()
                }
            }.resume()
        }
    }
    func next() {
        guard !tracks.isEmpty else { return }
        if shuffle && tracks.count > 1 { select(tracks.indices.filter { $0 != index }.randomElement()!, autoplay: true) }
        else if index + 1 < tracks.count { select(index + 1, autoplay: true) }
        else if repeatAll { select(0, autoplay: true) }
        else { player.pause(); report() }
    }
    func previous() { if player.currentTime().seconds > 3 { seek(0) } else { select(max(0, index - 1), autoplay: true) } }
    func seek(_ seconds: Double) {
        guard seconds.isFinite else { return }
        player.seek(to: CMTime(seconds: max(0, seconds), preferredTimescale: 600)) { [weak self] _ in self?.report() }
    }
    @objc func ended(_ note: Notification) { if let item = note.object as? AVPlayerItem, item === player.currentItem { next() } }
    @objc func interrupted(_ note: Notification) {
        guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt, let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        if type == .began { resumeAfterInterruption = player.rate > 0; player.pause() }
        else if resumeAfterInterruption, let rawOptions = note.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt, AVAudioSession.InterruptionOptions(rawValue: rawOptions).contains(.shouldResume) { play() }
        report()
    }
    @objc func routeChanged(_ note: Notification) {
        if let reason = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt, reason == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue { player.pause(); report() }
    }
    func report(updateMetadata: Bool = true) {
        guard tracks.indices.contains(index) else { return }
        let track = tracks[index], p = player.currentTime().seconds, d = player.currentItem?.duration.seconds ?? 0
        let position = p.isFinite ? p : 0, duration = d.isFinite ? d : 0
        emit?(["type":"state", "id":track["id"] ?? "", "position":position, "duration":duration, "playing":player.rate > 0])
        if updateMetadata && !stopped {
            var info: [String: Any] = [MPMediaItemPropertyTitle: track["title"] ?? "", MPMediaItemPropertyArtist: track["artist"] ?? "", MPNowPlayingInfoPropertyElapsedPlaybackTime: position, MPMediaItemPropertyPlaybackDuration: duration, MPNowPlayingInfoPropertyPlaybackRate: player.rate]
            if let artwork = artwork { info[MPMediaItemPropertyArtwork] = artwork }
            MPNowPlayingInfoCenter.default().nowPlayingInfo = info
        }
    }
}
