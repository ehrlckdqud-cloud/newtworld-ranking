#!/usr/bin/env python3
"""Publish precisely the two user-provided Survival Pond songs without touching old tracks."""
from pathlib import Path
import base64, hashlib, json

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / 'pond/music/staging'
MEDIA = ROOT / 'assets/game-defaults/media'
MANIFEST = ROOT / 'assets/game-defaults/manifest.json'

SONGS = (
    ('waiting', 'newtworld-pond-waiting-20261115', '신비로운 생존연못',
     '5d0a9d0323b5320de9271e290d85e2c179b25e32a01b207c0802d322963a3e9a', 3735319),
    ('game', 'newtworld-pond-game-20261115', '연못의 긴박한 생존 추격전',
     '0b24b969523efa29e369d6c428d037c3de47a6ad882ad6fa264a809eb86a6b2f', 3707654),
)

def publish():
    MEDIA.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    assert manifest['format'] == 'newtworld-game-defaults' and manifest['version'] == 1
    assert all(s['name'] != 'pondMusic' for db in manifest['databases'] for s in db['stores'])
    previous = manifest.get('pondMusic')
    if previous is not None:
        assert [e['id'] for e in previous] == [s[1] for s in SONGS], 'unexpected existing pond music records'
    additions = []
    for kind, uid, name, sha, expected_size in SONGS:
        parts = sorted((STAGE / kind).glob('*.b64'))
        if parts:
            assert len(parts) == 17, (kind, len(parts))
            encoded = b''.join(p.read_bytes() for p in parts)
            audio = base64.b64decode(encoded, validate=True)
        else:
            audio = (MEDIA / (sha + '.mp3')).read_bytes()
        assert audio[:3] == b'ID3', (kind, 'not an ID3 MP3')
        assert len(audio) == expected_size, (kind, len(audio), expected_size)
        assert hashlib.sha256(audio).hexdigest() == sha, (kind, 'source MP3 checksum mismatch')
        path = MEDIA / (sha + '.mp3')
        path.write_bytes(audio)
        additions.append({
            'id': uid, 'name': name, 'phase': kind,
            'blob': {
                '__type': 'Asset', 'mime': 'audio/mpeg',
                'path': 'media/' + sha + '.mp3',
                'bytes': expected_size, 'sha256': sha,
            }
        })
        print('PASS', kind, name, expected_size, sha)
    manifest['pondMusic'] = additions
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    # Stage was only needed to move byte-exact user attachments into GitHub.
    for kind, *_ in SONGS:
        for p in (STAGE / kind).glob('*.b64'):
            p.unlink()
        (STAGE / kind).rmdir()
    STAGE.rmdir()
    (ROOT / 'pond/music').rmdir()
    (ROOT / 'pond').rmdir()

if __name__ == '__main__':
    publish()
