#!/usr/bin/env python3
"""Targeted, idempotent rebuild: do not re-encode other creatures or replace audio."""
import hashlib
import importlib.util
import json
import shutil
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRAW = ROOT / 'draw'
CHECKS = ROOT / 'checks'
VERSION = 'pond15-platypus-no-circle'
HTML_VERSION = 'pond-strikes-15-platypus-no-circle'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    CHECKS.mkdir(exist_ok=True)
    protected = {}
    for path in DRAW.glob('*'):
        if path.is_file() and path.suffix in ('.bin', '.wav', '.webp', '.mp3'):
            if path.name not in ('platypus-strike.bin', 'platypus-strike.webp'):
                protected[str(path.relative_to(ROOT))] = digest(path)
    for rel in ('assets/content-access.js', 'draw/pond-revival.mjs'):
        protected[rel] = digest(ROOT / rel)
    (CHECKS / 'protected-assets.json').write_text(json.dumps(protected, indent=2))
    shutil.copyfile(DRAW / 'platypus-strike.bin', CHECKS / 'before-platypus.bin')
    shutil.copyfile(DRAW / 'pond-full-meta.json', CHECKS / 'before-meta.json')

    spec = importlib.util.spec_from_file_location('pond_builder', ROOT / 'tools/rebuild-pond-full-attacks.py')
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)
    with tempfile.TemporaryDirectory() as tmp:
        output = Path(tmp)
        entry = builder.convert(DRAW / 'source-videos/platypus.mp4', output, builder.SPECIES['platypus'])
        entry['matteVersion'] = VERSION
        # The temporary audio is deliberately NOT copied. Published 2x audio is untouched.
        for ext in ('bin', 'webp'):
            shutil.copyfile(output / f'platypus-strike.{ext}', DRAW / f'platypus-strike.{ext}')

    meta_path = DRAW / 'pond-full-meta.json'
    metadata = json.loads(meta_path.read_text())
    metadata['platypus'] = entry
    meta_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2))
    js_path = DRAW / 'pondApp.e4104cc4.js'
    source = js_path.read_text()
    begin = source.index('const pondStrikes = ') + len('const pondStrikes = ')
    end = source.index(';\nfunction strikePoint(', begin)
    strikes = json.loads(source[begin:end])
    strikes['platypus'].update(entry)
    source = source[:begin] + json.dumps(strikes, ensure_ascii=False, indent=2) + source[end:]
    for ext in ('bin', 'webp'):
        old = 'new URL("./"+key+"-strike.' + ext + '?v=pond14-detail-matte",import.meta.url)'
        new = 'new URL("./"+key+"-strike.' + ext + '?v="+(strike.matteVersion||"pond14-detail-matte"),import.meta.url)'
        if old in source:
            assert source.count(old) == 1
            source = source.replace(old, new)
        else:
            assert new in source, ('missing asset URL', ext)
    js_path.write_text(source)
    html = DRAW / 'pond.html'
    text = html.read_text()
    old_version = 'pond-strikes-14-eye-whisker-tomato'
    assert old_version in text or HTML_VERSION in text
    html.write_text(text.replace(old_version, HTML_VERSION))

    manifest = {
        'version': VERSION, 'frames': 120, 'fps': 24,
        'sourceStartFrame': 21, 'regressionSourceFrame': 107,
        'files': {f'platypus-strike.{ext}': digest(DRAW / f'platypus-strike.{ext}') for ext in ('bin', 'webp')},
        'unchangedAudioSha256': digest(DRAW / 'platypus-strike.wav'),
    }
    (DRAW / 'platypus-matte-check.json').write_text(json.dumps(manifest, indent=2) + '\n')
    for rel, expected in protected.items():
        assert digest(ROOT / rel) == expected, ('unrelated asset changed', rel)
    print('PASS protected assets unchanged:', len(protected))

    # Update the deployment check in the SAME tested commit as the new assets.
    smoke_path = ROOT / '.github/workflows/pond-live-smoke.yml'
    smoke = smoke_path.read_text()
    smoke = smoke.replace('pond-strikes-14-eye-whisker-tomato', HTML_VERSION)
    smoke = smoke.replace("const suffix='?stage14=2562e0c';", "const suffix='?stage15=platypus-no-circle';")
    smoke = smoke.replace("js.includes('v=pond14-detail-matte')", "js.includes('pond15-platypus-no-circle')")
    marker = "          console.log('PASS published corrected platypus eye, otter whiskers, tomato floor, unchanged 2x sound, and 12 attack assets');"
    replacement = """          const {createHash}=await import('node:crypto');
          const manifest=JSON.parse(decode(await read('platypus-matte-check.json')));
          assert.equal(manifest.version,'pond15-platypus-no-circle');
          assert.equal(strikes.platypus.matteVersion,manifest.version);
          for(const [path,expected] of Object.entries(manifest.files)){
            const bytes=await read(path);
            assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,path+' deployed exact tested asset');
          }
          assert.equal(createHash('sha256').update(await read('platypus-strike.wav')).digest('hex'),manifest.unchangedAudioSha256,'platypus 2x audio unchanged');
          console.log('PASS exact tested platypus no-circle assets, preserved eye and unchanged audio');"""
    if marker in smoke:
        smoke = smoke.replace(marker, replacement)
    else:
        assert 'exact tested platypus no-circle assets' in smoke
    smoke_path.write_text(smoke)


if __name__ == '__main__':
    main()
