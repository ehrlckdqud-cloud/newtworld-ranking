# Space Escape v21

Enemy waves and attackable structures now wait until after the first actual explorer H projectile. Early scheduled waves are deferred instead of discarded. Small meteors retain the later logo-exit gate. The boss update also receives the actual-fire gate.

Lateral propulsion uses original Metal Slug 3 animation streams executed from the native thruster actor (0x7ae3a), direction table 0x7b05a: 0x39b05e on the left arm when moving right, 0x39b1a2 on the right arm when moving left, palette 0x930. Nine native frames per direction retain their original pixel positions and animation rate. The effect follows simulated horizontal movement, with a 5 px/s deadband; unarmed, dead and docking ships do not show it. Existing H/C firing and departure/cruise engine layers remain separate.

Final mothership collapse destroys all surviving ordinary enemies, attackable structures and escorts with their existing native death animations and sound cues. Hostile shots are cleared and further spawning is stopped. The cleanup runs once and does not damage explorers.

Validation: `node tests/space-v21.cjs`, `node tests/space-v20.cjs`, and `node tests/space-escape-integration.cjs`. The integration suite covers 15 rounds across 2–300 entrants and 90–180 second durations, including no enemies before actual fire and no surviving enemies after collapse. The native data was inspected locally; no new browser playthrough is claimed.
