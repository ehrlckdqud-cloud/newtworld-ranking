# Survival Pond revival

45/60 seconds keep the original 12-round schedule and 200-gem default course.
90/120 seconds use 18/24 rounds and courses `pond:90` / `pond:120`, priced at 300 gems.
Only the long modes allow a configurable revival count (default 3, zero disables).
One midpoint round delivers one leaf per randomly chosen eliminated participant.
Insufficient eligible participants reduce the actual count; each participant revives at most once.
Revived participants rejoin ordinary random elimination and can win. The final winner count remains unchanged.

The uploaded dragonfly clip is converted to 120 transparent frames in 15 WebP atlas pages.
The blue backdrop and dangling stem are removed, with a short dissolve to the game leaf at delivery.
Frames are shared between insects and decoded pages are bounded. Short modes do not load these assets.
Sound uses a generated flutter and delivery chime, with no background music in the revival asset.
Space pause, effect volume and recording use the existing game controls.

## Deployment dependency

Backend branch: `ehrlckdqud-cloud/newtworld-automation:feat/pond-long-price`, commit `d885d71`.
Merge a PR for that branch to deploy through the existing Apps Script workflow.
The workflow requires a merged PR and checks live source against the parent version; do not bypass it.
Until the live backend advertises both long courses, long-mode starts fail closed before charging.
Existing short modes remain available.

## Validation

- `node --test tests/pond-revival.test.mjs tests/pond-random-attacks.test.mjs`
- Serve the repository on localhost:8010, then run `NODE_PATH=/workspace/newtworld-tools/node_modules node tests/pond-revival-browser.cjs` with Chromium installed.
- Backend: `npm run check` in newtworld-automation.

Engine checks compare 45/60 against the previous production engine, cover participant/count boundaries,
and prove a revived participant can become the final winner. Browser checks cover pricing, cancellation,
one charge, delivery, pause/resume, persistence and unavailable-backend rejection using mocked billing.
Production gem transactions are not performed by these tests.
