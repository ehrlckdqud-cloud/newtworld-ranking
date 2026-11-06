# NewtWorld native player — development preview

The production website is unchanged. This separate application bundles its player markup,
CSS and theme module. Native engines own audio and the queue, so track transitions do not
rely on background JavaScript timers.

- Android: Media3 ExoPlayer + MediaSessionService, system media notification, audio focus.
- iOS: AVPlayer + AVAudioSession playback, background audio, Now Playing and remote commands.
- Shared: default catalog, administrator order/deletions/edits, lyrics and cover display,
  playback controls, repeat/shuffle, background color and cover visibility.
- Protocol: JSON `{version:1,command,...}`. Queue items contain id/url/title/artist/artwork.
  Only bundled main-frame UI can call native commands; media URLs are limited to the
  repository's HTTPS assets. No authentication tokens are sent by the preview.

## Build
Run `python3 mobile/tools/bundle-web.py` from the repository root, then:
- Android: JDK 17, SDK 35, Gradle 8.9; `gradle -p mobile/android assembleDebug`.
- iOS: Xcode + XcodeGen; `cd mobile/ios && xcodegen generate` then build NewtWorld.
- Shared checks: `node --test mobile/tests/*.test.cjs`.
The native-player workflow builds a debug APK and an unsigned iOS simulator application.
A simulator build is not an installable iPhone release. Signing/account provisioning is
required before physical iPhone distribution. No store submission is configured.

## Outstanding before release
Personal MP3 import/persistence and native equalizer are not implemented in this first
preview; their buttons explain this. Existing browser imports/settings are not automatically
shared with a separately installed app. No production website capability has been removed.
Library refresh while an existing native queue is alive, offline handling, accessibility,
shuffle history, and small-screen/tablet layouts need additional verification.

Physical-device acceptance: play at least three complete default tracks with screen locked;
check notification/Now Playing metadata at each transition; next/previous/pause/seek from
system controls; background/return; Android Back and task removal; audio interruption and
headphone unplug; repeat/shuffle; changed admin catalog; network loss/recovery.
Force-stop, OS termination, and user removal of playback cannot be bypassed.
