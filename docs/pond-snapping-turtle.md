# Survival Pond: 늑대거북

Source: user-supplied `Snapping_turtle_attack_animation_48bb8940.mp4`.
SHA-256: `9c4aa56781abf6e9c47b2fd4d99ac2809c3fd193b14120b620a84668800bb6cc`.
1280×720, 24 fps, 7.916667 seconds, with attack audio.

- 960×540, 120 frames, WebP quality 90 with alpha; 15 atlas pages (4×2).
- Blue-dominance key with soft alpha and edge despill; largest connected component
  removes detached background remnants while retaining the dark underside.
- Atlas: 4,144,612 bytes. Poster and 192 kbps MP3 are separate assets.
- Source audio is normalized to the existing 5-second clip timeline using atempo,
  so the existing phase-dependent playback rate stays synchronized with the clip.
- Clip contact phase .66 (frame 79, immediately before jaw closure); mouth anchor
  [.872, .448]. Existing attackPull brings eliminated players to this mouth at
  game phase .72, including mirrored attacks. Existing elimination rules remain.
- Adds snappingturtle to the uniform random attack pool: 10 attacks total.
- The game's displayed name is 늑대거북. Price, winners and other attacks unchanged.

Reproduce with ffmpeg, Pillow, numpy and scipy, using an empty frame directory:

```sh
mkdir -p /tmp/turtle-frames
ffmpeg -i "$SOURCE_VIDEO" -vf 'fps=15.1578947368,scale=960:540:flags=lanczos' -frames:v 120 /tmp/turtle-frames/%03d.png
python tools/pack-pond-turtle.py /tmp/turtle-frames /tmp/snapping-turtle-v1.bin
ffmpeg -i "$SOURCE_VIDEO" -vn -af 'atrim=duration=7.916667,asetpts=PTS-STARTPTS,atempo=1.5833334,apad' -t 5 -codec:a libmp3lame -b:a 192k /tmp/snapping-turtle-v1.mp3
```

The packer also emits the poster and manifest. Byte ranges are embedded in the
active pond bundle. `pond.html` bumps the module URL to invalidate old caches.

Validation: production engine tests cover all 10 selections and completed games;
`tests/pond-snapping-turtle.cjs` checks all 120 frames, transparent background,
absence of blue spill in opaque pixels, the six-page cache bound, other-attack
switching, audio duration, the displayed name, random selection and mirrored
mouth anchors. A rendered screenshot verifies the shrinking player at the mouth
on the actual pond background. Membership is mocked; no real gem charge occurs.

## Mouth matte correction (v2)

The source itself contains blue pixels inside the open jaws. v2 protects short
vertical gaps between the upper and lower jaw near the snout, fills that cavity
with opaque shaded mouth colors, and leaves the outside blue screen transparent.
The v2 atlas is 4,140,536 bytes. Frame 79 at (830,242) changed from alpha 0 to 255;
the browser regression checks this point as well as all frames and background.
Audio, contact phase and suction anchor are unchanged.

## Mouth cutout correction (v3)

The user clarified that the blue gap between the jaws should be transparent;
only original lips, jaw and tongue tissue must remain opaque. v3 removes the
synthetic dark cavity fill from v2. A local warm-color tissue mask preserves
source-colored lip/tongue pixels even when fine edges separate from the main
body mask. No new mouth colors are painted. The browser regression checks that
frame 79's blue gap is transparent while four tongue/jaw samples remain opaque.
