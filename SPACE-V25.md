# Space Escape v25

Fuel pickup OK playback now retains the complete native ADPCM sample tail. The previous extraction trace muted channel 5 at 0.8875 s while its native sample still continued to 1.50369 s. Replaying command 0x1124 with the premature channel-volume-zero writes suppressed restores that tail. The packaged clip is 1.377 s (20 ms preroll, 120 ms tail, 20 Hz DC removal, 24 kHz mono). Both old and repaired clips were transcribed as “Okay” by a local tiny.en model; waveform/end-address inspection establishes the truncation correction. Metadata includes the exact packaged SHA-256. Pickup gain remains 2.

Fuel voice events start at offset zero even when the simulation dispatch is late; pending full-playback cues tolerate up to three seconds of delay. Ordinary combat sounds retain their synchronization behavior. Explicit pause, mute and round reset still stop active sounds.

Performance changes retain resolution, sprites, animation frames, particles, projectile count/cadence, enemy populations and exact contact checks:
- Spatial broad phase skips distant H-projectile collision candidates, retaining original hull order and swept collision tests.
- Immutable boss-frame geometry is cached; missile-owner counts and nearest-target searches avoid repeated filtering/sorting.
- Meteor push preselects eligible large rocks; live pilot count is maintained on roster reset and death.
- Roster rows are created once per round, then moved to newest-first elimination order without rebuilding all participant nodes.

Validation: tests/space-v25.cjs checks 10,000 seeded broad-phase queries against brute force (identical overlapping hulls/order; candidates 2.2867% of the brute-force set in this synthetic fixture), delayed full voice playback/no automatic cutoff, audio hash and 299 deaths with zero additional DOM element allocations. Existing v20, v21, v23 and v24 checks pass. The full integration suite covers 2/20/50/100/300 participants at 90/120/180 seconds, critical-only eliminations, winners and final enemy cleanup. CPU profiles identified the optimized hot paths; these are headless simulation checks, not a measured browser FPS guarantee. Device/GPU-specific stutter remains possible.
