# NewtWorld native player — device validation candidate

The production website is unchanged. The application bundles its existing player markup,
CSS and theme module. Native engines own audio and the queue, so track transitions do not
rely on background JavaScript timers.

## Implemented
- Android Media3 ExoPlayer + MediaSessionService: media notification, system controls,
  audio focus/headphone unplug, native repeat/shuffle and background queue transitions.
- iOS AVPlayer + playback AVAudioSession: background audio, Now Playing/remote commands,
  interruptions/headphone unplug, repeat/shuffle without repeating a song within a cycle.
- Default catalog: administrator order, deletions, metadata, covers and synchronized lyrics.
  Explicit refresh reconciles the current queue; a cached catalog remains available offline.
  Default music still requires a network connection; caching the catalog does not download audio.
- Personal audio: system file picker, app-owned copies, metadata/artwork extraction, durable
  library and individual deletion. Default songs have no delete button and native deletion
  rejects identifiers not belonging to the personal library. No application file-size/song-count
  cap; available device storage and supported audio formats remain physical constraints.
- Five-band equalizer: Android session audio effect, iOS native PCM biquad processing tap.
  Horizontal touch sliders, enable/reset and saved settings. Android hardware band centers
  are interpolated from the five requested controls and effect availability is device dependent.
  iOS uses automatic headroom and a final output clamp to limit overload with positive gains.
- Persisted theme, cover visibility, volume, repeat/shuffle and EQ; cover-off expands lyrics.
- Android Back backgrounds the task. Explicit playback stop is available in app settings.

## Build and checks
`python3 mobile/tools/bundle-web.py` bundles the existing web UI.
- Android: JDK 17, SDK 35, Gradle 8.9; `gradle -p mobile/android assembleDebug`.
- iOS: Xcode + XcodeGen; `xcodegen generate --spec mobile/ios/project.yml` then build NewtWorld.
- Catalog checks: `node --test mobile/tests/*.test.cjs`.
- DSP checks: compile `mobile/tests/dsp_test.c` with `mobile/ios/NewtWorld/EqualizerDSP.c` and libm.
- Android instrumentation: persistent import/source deletion/reload/deletion and three native
  track transitions without JavaScript. Run `connectedDebugAndroidTest` on an Android 10+ emulator.
- iOS XCTest: persistent import/source deletion/reload/deletion on a simulator.

## Trust and release boundaries
Only the bundled main-frame UI can invoke bridge commands. Default audio URLs must be HTTPS
repository assets; private file URLs are constructed from the native library, not trusted from
JavaScript. No member authentication tokens or personal audio are uploaded to the server.
Personal files/settings in the existing browser are not automatically transferred to this app.
An app uninstall removes its private library. Test APK signing is developmental and is not a
production signing setup; a different signing key requires uninstall/reinstall. Back up personal
source files before replacing a trial installation.

This branch is not merged into the production website. CI emits a debug APK and builds an
unsigned iOS simulator app. Physical iPhone installation requires Apple signing/provisioning;
store submission, production Android signing and public app distribution are not configured.

Before release, validate on real Samsung and iPhone devices: at least three complete default
tracks and personal tracks with the screen locked; metadata at each transition; remote controls;
Android Back/task removal; interruption/headphone unplug; audible EQ response; catalog refresh;
network loss/retry; large imports/storage exhaustion. Simulator/unit tests are not a substitute
for those device checks. Force-stop and OS termination cannot be bypassed.
