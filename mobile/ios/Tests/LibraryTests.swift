import XCTest
import AVFoundation
@testable import NewtWorld

final class LibraryTests: XCTestCase {
    func testImportedMusicSurvivesSourceDeletionAndReload() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let source = root.appendingPathComponent("source.wav")
        let format = AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 1)!
        do {
        let file = try AVAudioFile(forWriting: source, settings: format.settings)
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 22050)!
        buffer.frameLength = 22050
        for i in 0..<22050 { buffer.floatChannelData![0][i] = Float(sin(Double(i) * 2 * .pi * 440 / 44100) * 0.1) }
        try file.write(from: buffer)
        }
        let folder = root.appendingPathComponent("library")
        let library = LocalLibrary(directory: folder)
        try library.importFile(source)
        try FileManager.default.removeItem(at: source)
        let restored = LocalLibrary(directory: folder)
        XCTAssertEqual(restored.read().count, 1)
        let track = try XCTUnwrap(restored.nativeTracks().first)
        let id = try XCTUnwrap(track["id"] as? String)
        let url = try XCTUnwrap(URL(string: track["url"] as? String ?? ""))
        XCTAssertTrue(FileManager.default.fileExists(atPath: url.path))
        XCTAssertThrowsError(try restored.delete("builtin-1"))
        try restored.delete(id)
        XCTAssertEqual(LocalLibrary(directory: folder).read().count, 0)
        XCTAssertFalse(FileManager.default.fileExists(atPath: url.path))
    }
    @MainActor func testNativeQueueAdvancesWithoutJavascript() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let source = root.appendingPathComponent("source.wav")
        do {
            let format = AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 1)!
            let file = try AVAudioFile(forWriting: source, settings: format.settings)
            let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 22050)!
            buffer.frameLength = 22050
            for i in 0..<22050 { buffer.floatChannelData![0][i] = Float(sin(Double(i) * 2 * .pi * 440 / 44100) * 0.1) }
            try file.write(from: buffer)
        }
        let library = LocalLibrary(directory: root.appendingPathComponent("library"))
        for _ in 0..<3 { try library.importFile(source) }
        let engine = AudioEngine(library: library, registerRemoteCommands: false)
        engine.defaults = []; engine.player.volume = 0; engine.repeatAll = false
        let ids = library.read().compactMap { $0["id"] as? String }
        var visited = Set<String>(), completed = false
        let finish = expectation(description: "Three native tracks finish without a web view")
        engine.emit = { data in
            if data["type"] as? String == "state", let id = data["id"] as? String {
                visited.insert(id)
                if id == ids.last && data["playing"] as? Bool == false && (data["position"] as? Double ?? 0) >= 0.45 && !completed { completed = true; finish.fulfill() }
            }
        }
        engine.refreshQueue(); engine.play()
        wait(for: [finish], timeout: 30)
        XCTAssertEqual(visited, Set(ids)); engine.stop()
    }

}
