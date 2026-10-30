# Co-op v80 validation — 2026-10-30

Base: f2fa8b1 (PR #122, v79). This revision caches result panels until displayed counters change and applies the effects volume to the purchase chime. Native score calculation, payment authorization and lockstep protocol are unchanged.

## Reported issues

| Issue | Existing implementation and verification |
| --- | --- |
| P3 desync | v78 sends a complete serialized core snapshot at startup. Independent boot states are not assumed equal. Cross-process startup restore and subsequent failover pass. |
| P3–P5 invisible on first life | v78 actor rendering initialization; native pixel-difference tests pass for all three slots with three lives. |
| Continue waits until zero | v78 retry of definite stale lifecycle refusals, signed command fast path; native test enters selection within five frames of authorization, then respawns on selection. Network and human selection time are separate. |
| Departed member cannot rejoin / wrong room count | Backend token rotation, owner-bound fixed-seat resume, departed-seat count exclusion; relay tests and native P3 rejoin pass. |
| Effects volume | Persistent waiting music, button effects and mixed game audio controls exist. v80 also applies button/coin effects level to the purchase chime. Native game music and effects remain a combined stream. |
| Intermittent stutter | v77 batches enlarged display composition and avoids redundant DOM/credit work. Real WAN frame pacing is not certified. |
| Coin purchase freeze | Input stays enabled while the payment request is pending; the quantity dialog intentionally captures keyboard input. Controller test passes. |
| Results stutter | v79 eliminates synchronous background pixel readback; v80 caches the panel until score/rescue values change while continuing native simulation and HUD updates. |

## Executed checks

- 58 frontend co-op tests passed (`node --test tests/coop-*.test.mjs`).
- 49 backend relay tests passed against the existing Sites checkout (`node --test tests/relay.test.mjs`).
- Native engine: first spawn P3/P4/P5, immediate P1 continue, expired P3 rejoin, independent five-player lockstep (4,000 frames / 22 hash checks), and three-process startup-snapshot/failover passed.
- The previous failover fixture assumed independently booted engines started identically and failed before any transfer. It now follows the production startup protocol: restore the coordinator's complete snapshot to deliberately offset followers before comparing forward simulation.
- Chrome Canvas fixture: 300 cached frames preserve identical pixels; HUD updates every frame; counter changes repaint; next-mission background replaces the old background. Passed in managed preview. Fixture uses synthetic glyphs and engine counters, not full gameplay.
- No real member was charged by validation. Real remote-PC WebRTC play, prolonged WAN latency, and full natural mission completion were not tested here.
