# Local client integration fixture

This development-only fixture runs the real `coop/play.mjs` in three iframes with three local cores. Its room API and ordered data channels are simulated. It must not be used as evidence of actual WebRTC/WAN connectivity, billing validation, or remote audio quality.

To assemble in a local Sites preview, copy `coop/` to a temporary public `qa71/` directory, add the existing core.js and authorized source ZIP as `core.js` and `rom.zip`. Replace the index's newtworld-entry script with core.js and fixture.mjs; remove its external UI script. Serve qa71.html and qa71-parent.mjs at the preview root. Delete the temporary public fixture before packaging. Never publish the raw source ZIP or authentication mocks.

2026-10-30: browser execution was blocked by managed preview infrastructure (connection refused, stale Vinext server lock). This fixture has NOT passed browser QA. The separate Node controller tests and native dual-process tests did pass.
