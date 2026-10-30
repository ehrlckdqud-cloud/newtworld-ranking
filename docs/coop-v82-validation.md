# Coop v82 validation

## Reported disconnect and freeze

Production request logs included room poll/action failures (HTTP 400, 409 and 500). The available logs did not contain enough response/error detail to identify the initiating failure conclusively. The client screenshot matches PLAYER_DISCONNECTED.

Confirmed code defects: the previous server clock deadline was 12 seconds while client requests could wait 15 seconds; timeout processing preceded a returning heartbeat; one failed poll ended the polling loop; a peer hash mismatch deliberately stopped the whole game. A disconnected peer's required input could also stall the sequencer until server departure.

Changes: 30-second clock/link grace, refresh the valid current-epoch heartbeat before timeout processing, independent 2-second client heartbeat, retry transient read failures with the last cursor, suspend disconnected/stalled inputs and restore the affected peer from the coordinator's full snapshot. Other players continue with zero input for that seat. Stalled input recovery begins after 1.5 seconds; server expiry is separate. Snapshot transfers too far behind retained history reconnect instead of leaving a permanent missing frame.

## Participation and continue

Running rooms accept a first-time member into an unused/departed seat (up to five), or return the disconnected member to their existing seat. Existing tokens are invalidated. A full snapshot plus ordered native-presence commands initializes added actors, including P3–P5 sprite state. Joining starts as a spectator; J or the join button spends one server-authorized coin and enters play. A complete game does not accept new player joins.

Continue uses one J press and the current character after payment authorization. Player commands bypass queued ICE requests; uncertain payment requests are never automatically repeated. Solo native continue automatically confirms native character selection; multiplayer continues spawn directly. Protocol v82 prevents mixing old/new simulation rules within running rooms. Existing v78 rooms remain compatible with old clients during deployment; v82 users should make a new room after everyone refreshes.

## Stutter diagnostics and balance

Removed the extra native redraw after each normal emulation batch. Every native frame is still observed by result/transition drawing. No claim that all WAN/OS/GPU stutter is fixed.

Bounded diagnostic recording collects render gaps over 50 ms, slow core steps over 30 ms, input starvation, HTTP status/error codes, connection recovery and one-second frame/queue samples. Repeated frame/input/peer events are limited to once per second. At most 500 events and 600 samples are retained; browser storage is saved every 10 seconds and on exit. Both game controls and the channel panel offer **끊김 기록 JSON 저장**. Credentials, member names, chat, SDP, room IDs and balances are excluded. A user downloads and shares the JSON explicitly; nothing is automatically uploaded.

Coin purchase dialog reads the verified member's fresh gem balance on opening, every five seconds while open and on window focus. It shows an unavailable state on failures and disables a purchase exceeding the balance; server billing remains authoritative.

## Executed checks

- 63 frontend tests: existing 1–5 client startup, resume, snapshot failover, transient poll cursor recovery, one-peer hash repair, bounded diagnostic persistence and privacy, payment and UI handlers.
- 63 backend tests: relay and authentication/gateway tests, delayed healthy heartbeat, preserved failover fencing, newcomer admission into a departed seat, old-token rejection, paid late join, and fresh gem balance reads.
- Actual WASM core: P3/P4/P5 first-life sprite rendering; a solo-start mission expanding through newly admitted P2/P3/P4/P5, visible sprite differences across 80 frames, then P3 leave/rejoin; one authorized J with no subsequent J input revives solo; full-snapshot multi-process failover continues 400 matching frames.
- Browser with explicitly mocked API responses: create room, show 2,400-gem balance, disable 13-coin/2,600-gem purchase, download diagnostic JSON. No real purchase/account transaction was performed.
- Backend production build completed. Backend patch is included in `coop-v82-backend.patch`; the Sites source repository remains canonical.

## Limits

No simultaneous multi-PC WAN play session or natural full-mission run was performed. Native deaths/admission use controlled fixtures. Pixel visibility compares multiple frames because respawn invulnerability blinks; a single late P5 frame initially gave a false negative, while the full 80-frame comparison confirms visibility. The new JSON record is needed to distinguish remaining network starvation from browser/main-thread or core timing delays on the affected PCs.
