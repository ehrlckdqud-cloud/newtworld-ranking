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
}
