# Space Escape v26

Waiting ships now use an independent presentation clock: each unarmed craft gently drifts horizontally (3 px) and vertically (6 px) with a different phase, plus a subtle rocking motion. Combat time stays at zero while waiting.

After the final mothership collapse animation, survivors retain a snapshot of their starting positions, gather into a compact central formation for 2 seconds, hold for 0.5 seconds and enter together over 3.8 seconds. Every winner uses the same entry progress; the previous per-ship stagger is removed. The existing 6.4-second post-collapse phase still completes normally. HUD text distinguishes gathering, ready and entry.

Rendering and input work is reduced without lowering resolution, particle counts, animation cadence or projectile/enemy populations:
- Nickname outlines/text are rasterized once per name at the maximum supported canvas pixel ratio × zoom (3.75), then reused; long labels retain the original path.
- Flight base positions cache the two most recent timestamps and canvas dimensions. Dynamic push/pilot/gravity offsets remain live and uncached.
- Wheel events preserve order and cursor anchoring but share one bounding-rectangle read on the next animation frame. Zoom/status DOM text changes only when its displayed value changes. DOM control lookups are cached.
- Canvas backing storage is not reallocated for unchanged dimensions.
- Fully offscreen H bullets skip drawing with a conservative 23-unit margin; simulation and contact checks are retained. Drawing uses the current camera bounds, including while paused.
- Native boss/electric collision pixel data is prepared during asset loading instead of on the first electric collision.

Validation: `tests/space-v26.cjs` covers idle motion, exact flight positions and cache invalidation, 40 wheel events sharing one layout read, settled zoom label writes, gather/hold/synchronized entry for 1–300 winners, text reuse and edge-inclusive bullet culling. v20/v21/v24/v25 checks pass. The integration suite passes 15 rounds (2/20/50/100/300 ships × 90/120/180 seconds), retaining physical eliminations, winner counts, native boss phases and completed docking. JavaScript syntax and git whitespace checks pass.

These tests establish behavior and reduced repeated operations, not measured FPS on the user's device. A local Chromium rendering run was attempted but the browser binary download failed, so no visual screenshot or hardware acceleration/FPS claim is made. Browser/GPU/recording-specific stalls may still require measurement on the affected PC.
