# Survival game pause shortcut

All three entry documents load pause-shortcut.mjs. Space delegates to the existing
pause button, preserving each engine's timer, music and audio pause behavior.
Labels follow engine changes: 일시정지 (Space) / 계속하기 (Space); 우주대탈출's
existing 계속 비행 state is presented as 계속하기 (Space). aria-keyshortcuts is set.

Ignore composing/modifier keys, editable fields, other focused buttons/links,
open dialogs, hidden/inert gates and disabled pause controls. Held/repeat keydown
and native keyup activation cannot double-toggle. Blur resets the held-key latch.

Browser test: tests/pause-shortcut.cjs verifies all three button identities and
entry-document imports, toggle/labels, holding Space, focused pause button,
input spaces, other controls, dialogs and disabled state. The implementation
calls existing game handlers; it does not introduce a second pause state.

## Existing pond rounds (unchanged)

PondEngine has 12 rounds. Each lasts duration/12: 45 seconds -> 3.75 seconds,
60 seconds -> 5 seconds. Round r's target surviving count is
K + ceil((N-K)*(1-r/12)^2), where N is initial participants and K is winners.
Elimination candidates are randomly selected; concurrent attacks divide the
same target list rather than adding eliminations. Attack type selection is now
random and independent of round index. The round count is not the attack count.
For N=100,K=1: round 1 ->85, round 6 ->26, round 11 ->2, round 12 ->1.
All-win cases finish immediately. Pinball uses course physics and finishing;
space uses its time/HP/event sequence, not this pond 12-round schedule.
