# NewtWorld cooperative game

1–5 player browser client. NewtWorld profileData verifies membership; the relay checks credentials again and assigns the verified nickname. ROM/BIOS ZIP is read only on the host PC, never uploaded. No NewtGem charges.

Public entry: ./index.html. The existing compiled emulator is loaded from the already deployed /core.js on the relay host; no emulator binary or original ROM/BIOS is added to this repository. Relay: https://newtworld-ms3-coop-5p.pluckypeach517.chatgpt.site

FBNeo revision 2b0c1c0679df115cada7df9199ea2762222e58fd. Core build recipe, changed host adapter and patch: source/. All license notices: licenses/. The final package.py step in the historical build recipe is not required for compiling core.js.

Known limitations: actual separate-PC internet/WebRTC test is pending; TURN is not provisioned. Disconnect currently pauses the game and requires a new room. Game-specific fixes are deferred until after migration.

## Channel lobby (2026-10-29)

Three member-gated channels list independent rooms, participant counts and waiting/playing states. Hosts create rooms and load their local game data; other participants need no ROM. Mobile clients are blocked before entry and by the create/join/list gateway. IndexedDB keeps one validated local ZIP per browser for later automatic preparation. This does not distribute a ROM to a first-time solo host.

Solo continue now invokes the original native routine (0x43606), countdown, sounds, selector and door. Cooperative 2–5-player continue still uses the existing per-seat overlay; original multi-seat continue presentation is not yet restored. Do not describe that as complete.

## Staff test gate
Member identification and a separate server-side test password are both required. The password is configured only as a secret runtime variable, never in this public source. Every room/lobby/action/poll request is gated; existing seat tokens alone are insufficient. The password is held only in the current page memory and must be re-entered after reload. It is not an administrator credential or role grant. The installation confirmation stores a validated user-selected ZIP locally; it does not provide ROM downloads.
