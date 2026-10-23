# Space Escape v32

Warning cue gain is now 0.5 relative to v31. The restored WAV, duration, master volume, mute and final explosion gain are unchanged.

The flare fields were incorrectly integrated as continuous velocity. Original actor update 0x5b7c6 calls 0x5530, which resolves coordinates without integrating those fields. Callback 0x5b7de passes their integer components to 0x2c3ae as the next child's position offset and subtracts four from the child's world-Y offset. Existing explosions therefore remain at their birth positions while the next generation appears farther out. Screen coordinates for generation g are x = g*dx, y = g*dy + 2*g*(g-1). Source clip timing, four initial offsets and chain counts remain unchanged.

Validated fixed positions across animation times, successive births in all four directions, warning-only half gain, full playback, v31 warning/layout regressions and v25 audio regressions. Native-sprite contact sheet at ticks 3/6/10/16/23 confirms connected trails. Reference video around 117–119 seconds was reviewed, but that segment includes enemy explosions and is not treated as proof of the Rocket Slug child scheduler. The original controller instructions establish the coordinate behavior. No claim of live browser audio/render verification.
