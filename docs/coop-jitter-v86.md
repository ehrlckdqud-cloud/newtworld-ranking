# v86 intermittent frame stalls

The supplied October 31 diagnostic export contains multiple sessions. Its latest 600 samples include input waits over 100 ms and a low of 38 simulated frames in a second. This is evidence of input starvation, not proof of a particular participant's network fault. The export's version 82 was hardcoded.

Changes:
- Drain ready frames when authenticated peer input arrives, without waiting for the host's next animation callback.
- Send future input before native frame execution and rendering work.
- Keep up to five frames of elapsed time during an input shortage, allowing bounded catch-up on recovery. Never fabricate missing input. Long outages still wait and use the existing recovery path.
- Use one monotonic clock for animation and worker callbacks.
- Record the missing slot and resumed wait duration; label exports v86 while retaining prior diagnostic history.

The protocol and six-frame input lead remain unchanged. No server/payment rules changed.

Validation: actual controller startup, departure, coordinator migration and resynchronization tests for 1–5 clients; ordered-link simulation with repeated 110 ms jitter for 2–5 clients. Over 15 simulated seconds, common completed frames improved from 880/880/879/886 to 898 for 2/3/4/5 players, with equal inputs on all clients. These are simulation results, not a WAN guarantee or a guarantee of zero visible stalls. The test also checks actual message-handler delivery before another animation callback and bounded catch-up through outages.
