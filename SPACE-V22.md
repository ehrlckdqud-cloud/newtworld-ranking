# Space Escape v22

Double both mothership health pools while retaining participant-count scaling: first mothership base HP 4,200 → 8,400, final mothership 2,400 → 4,800 (50 entrants). Both the initial HP and phase-transition reset use the new values.

The selected 90/120/180 seconds remain encounter-timing references, not a forced deadline. Battles continue until projectile damage defeats the final mothership and the existing finale completes. Actual battle duration need not double because targeting, missiles and surviving firepower vary.

Validation: the existing 15-round integration suite (2/20/50/100/300 entrants × 90/120/180 seconds), including direct HP assertions for both phases, actual-contact eliminations, correct finalist counts, docking and final enemy explosions.
