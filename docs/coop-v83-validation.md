# v83 coin balance recovery

The v82 gateway implemented `/api/gems`, but the production Worker's explicit route list omitted it. Production logs confirm repeated HTTP 404 responses. Gateway-only mocks did not exercise this boundary; the v82 verification was insufficient.

- Register `/api/gems` in the actual Worker for both POST and CORS OPTIONS. Existing authentication remains required.
- Treat the displayed balance as advisory. A failed, pending, stale or insufficient cached balance no longer disables a valid quantity. The existing authoritative purchase endpoint verifies funds and performs charging; no billing or retry semantics changed.
- Keep invalid quantities disabled and show balance lookup delays explicitly. Successful refreshes still display the current balance.
- Cache-bust changed frontend entry and purchase modules to v83. The simulation protocol stays v82, so no game reset is required for this fix.

Validation: 65 frontend tests, including rejected balance reads followed by a valid purchase and recovery/invalid quantities; 64 backend tests including the real production Worker source dispatching `/api/gems` to the authenticated gateway instead of the page handler. Production build passed before packaging. No real user purchase was made.

The actual Worker entry is transpiled in the routing test; external page/connector handlers are injected and fail if called for the gem path. This closes the test coverage gap which allowed v82's missing route to pass.
