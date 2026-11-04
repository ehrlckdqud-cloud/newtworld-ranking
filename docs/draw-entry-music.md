# Survival pinball and pond entry music

The picker and marble game's visible title now read 생존핀볼. Internal game IDs,
prices and stored settings keys remain unchanged.

MusicUI previously loaded its library but never enabled the waiting player on
entry. Both games now call startEntryMusic after loading the saved library and
try audible playback immediately. This does not replace the playlist or volume.
NotAllowedError arms a first-pointer/key retry; other playback failures do not.
Manual music toggling clears that retry, and clicking the music button is excluded
from the generic pointer handler so it does not toggle twice. Browser autoplay
rules still require an initial gesture in some environments.

Validation: tests/draw-entry-music.cjs tests both games with autoplay allowed and
with the first play deliberately rejected with NotAllowedError. It checks actual
playback progress, gesture recovery and that manual off survives later clicks.
