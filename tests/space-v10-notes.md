# Space Escape v10

Implements the twelve follow-up corrections:

1. Intro audio is re-rendered from the caption controller's original `0x1135` command, through the original M68000 FIFO, M1 program and YM2610. Its native sample sequence contains one START key-on. Individual audio events cannot restart after their source ends. Recording gain is respected when priming and playing announcements.
2. Large rocks traverse slowly; collision separation displaces explorers along the rock's velocity and lets their offset recover afterward.
3. Both side missile ports emit H bullets. Muzzle offsets use the same radius and bank angle as the rendered ship.
4. Flight music begins fading at first-boss destruction/fusion. Final-boss collapse fades the fixed boss music out.
5. Living enemies travel across and fully beyond camera edges instead of being clamped. Health remains authoritative. Escorts also leave naturally without reflected edge positions.
6. Fusion uses the full camera-aware mothership transform, retaining native falling/fusion frames. Verified at 55% zoom.
7. Survivors keep their explorer hull and travel into the actual open hatch. The hatch lip occludes the hull; no circle replacement or shrinking tween.
8. UFO child actor `0x1010b0` from source record `0x415c2c` supplies the original vertical beam frames/palette, replacing the old rotated launch-glow approximation.
9. Actual swept H contacts play original impact stream `0x37befc`, palette `0x202`, linked by initializer `0xb1fda` and impact callback `0xb2460`.
10. Explorer hits render the native impact and a brief orange hull palette overlay.
11. First-boss hatch waves repeat the native launch section more frequently, with denser bursts through the open exit. Final-boss electric safety windows remain intact.
12. An original Earth/cloud background follows the supplied horizon reference and fades into space during ascent. The asset was generated with the built-in image tool; no text or watermark from the reference is used.

Validation: `space-score.cjs`, `space-mission.cjs`, `space-v10.cjs`, `space-combat-rules.cjs`, `space-live-combat.cjs`, and `space-escape-integration.cjs`. Full battles cover five roster sizes and three durations. Browser QA covers Earth departure, native vertical laser, fusion at 55% zoom, and hull-preserving docking. Research and QA authorization fixtures are not part of the public runtime.
