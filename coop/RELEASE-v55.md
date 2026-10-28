# v55 — J-authorized credits and observer rooms

- Departure prepares the native title without debiting a member. Each player explicitly presses J; the durable wallet debits exactly once and the native CREDIT digits reflect the confirmed balance. The team begins once every player has requested start.
- Host boot and initial native coin readiness run during operations loading. The title remains paused until start authorization, preventing the original idle countdown from consuming a waiting window. The original title-to-selection transition is retained.
- Start sends the native Start pulse and then a separate attack confirmation, avoiding a second human J press to advance the title. Native continue still uses the original presentation.
- Host continue commands carry the current native player states in the same server transaction. Host command responses execute directly (event-ID deduplication); other peers receive faster state updates. Network latency and the native selection transition remain.
- Preparation locks coin purchase. An in-flight payment locks readiness; uncertain payment outcomes retain their request ID and require retry/reconciliation. Definitive payment failures release the lock.
- NewtWorld grades are derived from server-verified lifetime score, using the existing seven badge assets.
- Observers have separate authenticated identities, outside the five player slots. They cannot spend coins, ready, start, send controls, or change native state. Chat is separated by server-assigned audience; observer messages do not produce character bubbles.
- Fullscreen hides site chrome and keeps controls/chat in black side gutters. The left observer chat is hidden when no observers are present.

## Verification and limits

Server tests cover J-only debit, duplicate starts, cross-room wallet races, payment locks, full-room observer admission and authorization. Native controlled fixtures cover original CREDIT 2 before start, CREDIT 1 after authorization, native title input and immediate continue acceptance. These fixtures are not full natural mission playthroughs.

Browser UI checks use mock member/payment/network responses: no real member gems are spent. Actual five-computer Internet gameplay and high observer counts are not validated. There is no artificial observer seat limit, but video currently uses host-originated WebRTC connections; a large audience requires a separate fan-out/SFU streaming service and bandwidth/capacity validation. This release does not claim unlimited concurrent video capacity.

Rankings are intentionally not implemented pending a selected scoring policy. Suggested categories: weekly mission clears, personal best score, and team completion records.
