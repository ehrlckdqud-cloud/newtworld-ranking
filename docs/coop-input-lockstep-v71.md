# v71 local-core migration

Every player and observer loads the same patched MS3 core and validated ROM locally. The active client no longer captures a canvas, adds media tracks, receives host video, or sends audio. Old backend game.html/play.mjs entrypoints redirect to the NewtWorld client.

The host remains a room coordinator and input sequencer, not a video source. Reliable ordered WebRTC DataChannels carry frame-numbered inputs, command IDs, chat, and state hashes. TURN is still a fallback for these data connections. Six frames of input lead are buffered (~100 ms at 60 fps); this is deterministic lockstep, not rollback or zero-latency prediction. Slow clients can stall a frame. Missing inputs are never silently guessed. All participants apply a server-authorized coin/continue command on the same committed frame.

Each PC installs once from the existing authorized package endpoint. READY requires local core readiness. All cores boot exactly 1400 frames. Matching boot hashes allow startup without a full state transfer. Late observers and reconnecting clients receive a bounded, chunked native checkpoint plus FiveSession lifecycle data and recent committed frames. Checkpoint transfers are exceptional; steady-state traffic contains no game media. A state mismatch halts rather than silently splitting the game.

Core execution continues through a dedicated worker clock while requestAnimationFrame is suspended for a hidden tab. Inputs are neutralized while hidden/away. OS suspension or a broken connection still requires recovery. The host is still needed; host migration during an active game is not implemented.

Wallet/member authentication, role restrictions and paid command proofs stay server-authoritative. Build ID changed to nw-ms3-input-lockstep-v71; old sessions cannot mix protocols. Existing persistent wallet balances and rankings remain stored.

Validation: 53 backend checks; 22 frontend/protocol/controller checks including actual 1–5-client controller functions over simulated ordered links; two independent native processes ran 4000 frames with 22 matching RAM/lifecycle hashes and checkpoint restoration, including different local CREDIT display values. These are NOT real multi-PC Internet, browser audio, full-mission or long-session tests. Managed browser preview could not launch due to stale Vinext infrastructure; external operator testing remains necessary.
