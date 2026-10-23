# Space Escape v24

Fix the fuel pickup audio extraction: the original 68000 sound queue at 0x15238/0x1523a passes both command bytes through 0x150f4 unchanged. v23 incorrectly incremented the low byte and rendered 0x1125, despite labeling it 0x1124. The new WAV is regenerated with FIFO bytes 0x11, 0x24, uses a new URL to avoid stale audio caches, and records its actual command and SHA-256. The same direct-byte extraction was checked against the existing H voice as an additional protocol control (normalized waveform correlation 0.652). This is source/waveform verification, not a claimed listening test. Fuel pickup gain is now 2, like the H/C acquisition voices.

Fuel kill drops become eligible after duration/3: 30, 40, or 60 simulation seconds for the 90/120/180-second options. Earlier kills never turn into delayed drops. The 3% per-kill chance, 20-drop cap, damaged-ship pursuit and full repair remain.

The elimination panel now sorts by descending death ordinal, retains each original ordinal label, and scrolls its own list to the top on updates. The newest elimination appears immediately above older ones without scrolling the game page.

Validation: v24 tests cover timing boundaries, pickup gain, corrected sound bytes/hash, immediate list reordering and scroll reset. v23 regressions and the 15-round full integration suite pass. No new browser playthrough was performed.
