# v72: participant departure and coordinator failover

Every PC still runs its own emulator. A server-authorized coordinator sequences inputs; a coordinator is a role, not an actor slot. During gameplay slots are never renumbered. The server elects a live player when the coordinator departs, using most recently reported simulation frame then slot as a deterministic tie-break.

- Each running player's simulation clock renews a lease every 2 seconds. No clock heartbeat for more than 12 seconds marks only that player departed. Polling alone cannot keep a frozen simulation alive.
- Explicit room leave commits departure immediately. The last player leaving closes the room. Viewers cannot become coordinator.
- Server increments a durable host epoch on migration. Departed seat tokens cannot act again. Signaling and data-channel callbacks from previous epochs are discarded.
- New coordinator keeps its local emulator state, removes departed actors, clears uncommitted frames, starts a fresh input window and sends a checkpoint to peers. Other clients replace their state and resume with identical frame numbers.
- Pending paid commands and acceptance results survive transition. Migration does not debit coins or reset surviving players' lives. Resetting to a new lobby reassigns slots only after the game is over/all have returned.
- Completed games are not evicted by the simulation-clock timeout; the normal connection timeout still applies.

## Limits

This is failover, not rollback netcode or a dedicated simulation server. Abrupt failure can pause the group while the 12-second lease expires, the new WebRTC links connect, and checkpoints transfer. It does not guarantee zero interruption. Actual WAN paths, Windows sleep/resume and browser suspension need operator testing. No claim of real remote-PC verification is made.

## Validation

- Real browser-controller functions in VM with ordered simulated data channels: 1–5 startup; non-coordinator departure; repeated coordinator replacement down to one survivor; snapshot synchronization; old-channel fault ignored; survivors advance frames.
- Backend SQLite relay suite: durable host election, expired-token rejection, stale-epoch rejection, fixed slot identities, coin preservation, explicit departures and last-player closure; existing wallet/member gates.
- Native core in three independent processes: freeze P1, remove P1/P5, transfer P2 checkpoint to P3 at a different frame, compare hashes after 400 more frames, then remove P2 and verify P3 keeps playing. This is not a browser/WAN test.

Update requires all participants to refresh and create a v72 room. Installed ROM data and persistent wallets are retained.
