# NewtWorld cooperative game

1–5 player browser client. NewtWorld profileData verifies membership; the relay checks credentials again and assigns the verified nickname. ROM/BIOS ZIP is read only on the host PC, never uploaded. No NewtGem charges.

Public entry: ./index.html. The existing compiled emulator is loaded from the already deployed /core.js on the relay host; no emulator binary or original ROM/BIOS is added to this repository. Relay: https://newtworld-ms3-coop-5p.pluckypeach517.chatgpt.site

FBNeo revision 2b0c1c0679df115cada7df9199ea2762222e58fd. Core build recipe, changed host adapter and patch: source/. All license notices: licenses/. The final package.py step in the historical build recipe is not required for compiling core.js.

Known limitations: actual separate-PC internet/WebRTC test is pending; TURN is not provisioned. Disconnect currently pauses the game and requires a new room. Game-specific fixes are deferred until after migration.
