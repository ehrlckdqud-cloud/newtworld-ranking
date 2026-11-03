# Survival Pond emperor attack quality

Based on production commit `894a09333cb09467d5f7069cfa392cf461705916`.
The v2 replacement used 32 frames at 512×288, compared with 120 frames at
768×432 for the other main creature attacks. Its matte also contained visible
rectangular edges. Re-extract the supplied original rather than upscale v2.

The v3 bundle contains 120 frames at 960×540, WebP quality 88 with full-quality
alpha, packed as 15 pages of 4×2 frames. Size: 2,668,882 bytes (v2: 297,304).
Only the emperor manifest and pond app cache version change. Mirrored direction,
normalized bite phase `.64`, mouth anchor `[.918,.50]`, attack duration, sound
behavior, billing and other attacks are preserved. Existing six-page decoded
cache eviction remains in use; the larger pages do use more decoded memory.

Source: user-supplied `Newt_executing_ground_lunge_attack_d3994590.mp4`,
1280×720, 24 fps, 7.916667 s.
SHA-256: `911471194b15453891a420cd8dc767f7d1e32e3b99e774450107409011765169`.

Reproduction (ffmpeg, Python with Pillow/numpy/scipy):

```sh
mkdir -p /tmp/emperor-frames
ffmpeg -i "$SOURCE_VIDEO" -vf 'fps=15.1578947368,hflip,scale=960:540:flags=lanczos' -frames:v 120 /tmp/emperor-frames/%03d.png
python tools/pack-pond-emperor.py /tmp/emperor-frames /tmp/emperor-lunge-hq-v3.bin
```

The packer removes neutral background connected to the image boundary, keeps
interior highlights, selects the main foreground component, and softens its
alpha edge. The JSON companion contains byte ranges for the runtime manifest.
Use an empty input directory. Original video is not included in the repository.

Validation: `tests/pond-emperor-quality.cjs` loads the real pond page with mocked
membership, decodes/draws all 120 frames, checks atlas dimensions and transparent
background, checks the six-page cache limit, then switches to the marbled attack.
No production gem purchase is made. Visual inspection compares extracted frames
on a pond-colored background. Local browser checks do not measure users' network
load time.
