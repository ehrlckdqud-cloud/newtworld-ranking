# Space Escape v28

The lobby coin sound uses a per-cue gain of 3 relative to v27. Its original WAV, full tail and playback rate are unchanged; the existing master volume/mute still applies and other effects retain their gains. The cue's dedicated gain node disconnects on completion.

Space Escape rejects recognized mobile/tablet devices before membership/admin checks or asset loading, hides the login/retry controls and shows a PC-only message. The same check runs on direct URL entry, login submission and permission checks. Android/iPhone/iPad and desktop-style iPadOS are blocked; Windows touch PCs and narrow desktop windows remain supported. Detection uses browser device signals rather than window width; user-agent emulation can bypass this presentation restriction, so it is not a security boundary.

The existing shared stylesheet adds top-right device badges to the game-selection cards: marble and pond show `PC/모바일`, Space Escape shows `PC`. Narrow-card copy spacing prevents overlap. Selectors are scoped to the picker; the large root HTML/member data does not need to be re-uploaded.

Validation: v28 focused tests check gain routing, waveform reuse and node cleanup, desktop/touch-PC allow cases, phone/tablet rejection before authentication/loading, mobile login re-entry and stylesheet labels. v21/v24/v25/v26/v27 regressions and JavaScript syntax/diff checks pass. No combat simulation, outcome selection or native animation data changes. Device tests use mocked navigator/DOM signals; no claim of browser screenshot validation is made.
