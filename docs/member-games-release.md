# Member games release

The frontend removes the staff entry gates from marble factory, pond and space;
membership checks and server-side payment authorization remain required. Prices
come from ContentAccess.js: marble 100, factory 200, pond 200, space 300. Online
coins remain 200 per coin, with the shared gem icon in the quantity confirmation.

Owner entry remains visible during transient profile refresh failures, but opening
the admin hub still requires a successful owner check. Waiting music recovers
after tab changes; active rounds remain paused until explicitly resumed. Space
atlas frames reuse one decoded source bitmap to avoid repeated large-image
decoding during entry.

The checked-in generated Parcel bundles are the available source of truth in this
repository. Only the active bundles referenced by the HTML import maps were
patched; historical unused bundles were left alone. Their URLs and entry modules
use `member-games-1` to refresh cached clients.

The old client-only engine callbacks named `setAdminCourseCheck` and
`setAdminCheck` now reflect a resolved account; entry and `NWContent.start` still
perform the real member/payment checks before running a game. No administrator
token is automatically passed to skip payment. The explicit owner game-admin
mode remains separate.

## Verification

Run a static server at the repository root, then:

```
node --test tests/*.test.mjs
node tests/member-games-owner.cjs
node tests/content-client.cjs
node tests/newt-ui.cjs
node tests/space-score.cjs
NODE_PATH=/workspace/newtworld-tools/node_modules node tests/member-games-release.cjs
```

The browser suite uses Playwright and `/usr/bin/chromium`; `CHROMIUM_PATH` and
`NW_TEST_BASE` can override the executable and server. Member/payment APIs are
mocked, so this suite does not prove production payment or live relay behavior.

## Required online relay release

The external relay source is not in either connected repository. Before deploying
the public online client, its maintainer must remove the staff password condition
from `/api/test-access` and every lobby, room/action/poll, installation and ranking
gate, while preserving member verification, site-session validation, room/seat
authorization, rate limits and idempotent coin payments. Do not expose staff
passwords or disable membership checks. `/api/test-access` must accept the public
client's member credentials plus site-session headers without a staff password.

Until that relay release is applied, the client reports that server publication
is pending when it receives `TEST_PASSWORD_REQUIRED` or
`TEST_ACCESS_UNAVAILABLE`. This repository cannot by itself complete the relay
deployment. Production Apps Script prices and Google Pages deployment must also
be verified after release; local tests are not deployment evidence.
