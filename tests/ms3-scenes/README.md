# Mission 3/4/5 native regression fixtures

Run from the repository root with Node.js and `@napi-rs/canvas` installed. Set absolute `MS3_CORE_JS` and `MS3_ROM_ZIP` paths to authorized local game assets. Neither asset nor native snapshots are included in the repository.

```sh
node --test tests/ms3-scenes/owner-guard.test.mjs
node tests/ms3-scenes/m3-geometry.cjs
node tests/ms3-scenes/m3-walk.cjs
node tests/ms3-scenes/m3-lift.cjs
node tests/ms3-scenes/m4-recovery.cjs
COUNT=5 node tests/ms3-scenes/m5-natural.cjs
node tests/ms3-scenes/m5-variants.cjs
```

- Geometry: invokes the native rectangle predicate with no player inside, then each of the five players individually inside. The test-only BIOS caller sets screen coordinates immediately before invocation.
- Lift: creates a native M3 factory lift, then moves its parent vertically to put its full travel inside the viewport. Runs its original movement, collision, bounds and reversal routines. Requires lower bound 0 and native upper viewport bound 184. This is a controlled native fixture, not a recording of an uninterrupted campaign.
- Ownership: reproduces the diagnostic's P2-owner-0 condition in the M4 larva substage. Opposite inputs must produce the same independent positions as the healthy control; wrong ownership without repair makes P2 follow P1. Also checks all five seats.
- M5 entry: uses the original boss/scene state machines. Invulnerability and a controlled boss defeat at frame 1200 shorten setup. The natural entry, abduction and subsequent transition are not skipped.
- M5 variants: restores the generated pre-abduction snapshot and removes seats to test 1–5 remaining players, a P2/P4 pair, and each extra player alone. Requires exactly one captive, all other active players as witnesses, and transition beyond substage 2 without reset.
- Unit tests exclude inactive, deleted, unlinked and non-player records from ownership repair and verify the diagnostic's sanitized repair history.

Generated files are confined to ignored `evidence/`. Do not commit ROMs, BIOS images, native snapshots, or original member diagnostics. Rebuild native deltas with `python tools/ms3-build-scene-fixes.py`; it needs no game assets.
