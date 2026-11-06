import Foundation
import AVFoundation
import UIKit

final class LocalLibrary {
    let directory: URL
    init(directory custom: URL? = nil) {
        directory = custom ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Music", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try? FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: directory.path)
    }
    func read() -> [[String: Any]] {
        guard let data = try? Data(contentsOf: directory.appendingPathComponent("library.json")), let items = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return [] }
        return items
    }
    private func save(_ tracks: [[String: Any]]) throws {
        let data = try JSONSerialization.data(withJSONObject: tracks)
        try data.write(to: directory.appendingPathComponent("library.json"), options: .atomic)
    }
    func importFile(_ source: URL) throws {
        let access = source.startAccessingSecurityScopedResource()
        defer { if access { source.stopAccessingSecurityScopedResource() } }
        let id = "local-" + UUID().uuidString
        let suffix = source.pathExtension.lowercased()
        let safeSuffix = !suffix.isEmpty && suffix.count <= 8 && suffix.allSatisfy({ $0.isASCII && ($0.isLetter || $0.isNumber) }) ? suffix : "mp3"
        let filename = id + "." + safeSuffix
        let audio = directory.appendingPathComponent(filename), art = directory.appendingPathComponent(id + ".jpg")
        do {
            var copyError: Error?, coordinationError: NSError?
            NSFileCoordinator().coordinate(readingItemAt: source, options: [], error: &coordinationError) { url in
                do { try FileManager.default.copyItem(at: url, to: audio) } catch { copyError = error }
            }
            if let error = coordinationError ?? copyError as NSError? { throw error }
            try FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: audio.path)
            let asset = AVURLAsset(url: audio)
            let duration = asset.duration.seconds
            guard duration.isFinite && duration > 0 && !asset.tracks(withMediaType: .audio).isEmpty else { throw NSError(domain: "NewtWorld", code: 1, userInfo: [NSLocalizedDescriptionKey: "재생 가능한 음악 파일이 아닙니다."]) }
            func text(_ key: AVMetadataKey) -> String? { AVMetadataItem.metadataItems(from: asset.commonMetadata, withKey: key, keySpace: .common).first?.stringValue }
            if let data = AVMetadataItem.metadataItems(from: asset.commonMetadata, withKey: AVMetadataKey.commonKeyArtwork, keySpace: .common).first?.dataValue, let image = UIImage(data: data) {
                let ratio = min(1, 512 / max(image.size.width, image.size.height))
                let size = CGSize(width: image.size.width * ratio, height: image.size.height * ratio)
                let thumbnail = UIGraphicsImageRenderer(size: size).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
                if let jpeg = thumbnail.jpegData(compressionQuality: 0.8) { try jpeg.write(to: art, options: .atomic) }
            }
            var tracks = read()
            tracks.append(["id":id, "title":text(.commonKeyTitle) ?? source.deletingPathExtension().lastPathComponent, "artist":text(.commonKeyArtist) ?? "", "duration":duration, "local":true, "filename":filename])
            try save(tracks)
        } catch { try? FileManager.default.removeItem(at: audio); try? FileManager.default.removeItem(at: art); throw error }
    }
    func delete(_ id: String) throws {
        let tracks = read()
        guard let track = tracks.first(where: { $0["id"] as? String == id }) else { throw NSError(domain: "NewtWorld", code: 2) }
        try save(tracks.filter { $0["id"] as? String != id })
        try? FileManager.default.removeItem(at: directory.appendingPathComponent(track["filename"] as? String ?? (id + ".audio")))
        try? FileManager.default.removeItem(at: directory.appendingPathComponent(id + ".jpg"))
    }
    func nativeTracks() -> [[String: Any]] {
        read().compactMap { track in
            guard let id = track["id"] as? String else { return nil }
            var track = track
            let audio = directory.appendingPathComponent(track["filename"] as? String ?? (id + ".audio"))
            guard FileManager.default.fileExists(atPath: audio.path) else { return nil }
            track["url"] = audio.absoluteString
            track["artwork"] = directory.appendingPathComponent(id + ".jpg").absoluteString
            return track
        }
    }
    func webTracks() -> [[String: Any]] {
        nativeTracks().map { track in
            var track = track
            let id = track["id"] as! String
            track.removeValue(forKey: "url"); track.removeValue(forKey: "artwork")
            track["audio"] = "native:" + id
            if let data = try? Data(contentsOf: directory.appendingPathComponent(id + ".jpg")) { track["cover"] = "data:image/jpeg;base64," + data.base64EncodedString() }
            return track
        }
    }
}
