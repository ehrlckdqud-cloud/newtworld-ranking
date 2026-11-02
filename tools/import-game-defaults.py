"""Extract a NWGameDefaultsExport JSON into deduplicated public media + manifest.

Usage: python3 tools/import-game-defaults.py /path/to/export.json
No credentials or member data should be included in this export format.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('export', type=Path)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'assets/game-defaults')
    args = parser.parse_args()
    data = json.loads(args.export.read_text())
    if data.get('format') != 'newtworld-game-defaults' or data.get('version') != 1:
        raise ValueError('Unsupported export format')
    allowed = {'nw-draw-music-v1', 'nw-draw-visuals-v1', 'nw-draw-stickers-v1'}
    if {db['name'] for db in data['databases']} != allowed:
        raise ValueError('Unexpected databases')
    output = args.output
    (output / 'media').mkdir(parents=True, exist_ok=True)

    def extract(value):
        if isinstance(value, dict):
            if value.get('__type') == 'Blob':
                raw = base64.b64decode(value['base64'], validate=True)
                digest = hashlib.sha256(raw).hexdigest()
                extension = {'audio/mpeg': 'mp3', 'image/jpeg': 'jpg', 'image/png': 'png'}[value['mime']]
                relative = f'media/{digest}.{extension}'
                (output / relative).write_bytes(raw)
                return {'__type': 'Asset', 'mime': value['mime'], 'path': relative, 'bytes': len(raw), 'sha256': digest}
            return {key: extract(item) for key, item in value.items()}
        if isinstance(value, list):
            return [extract(item) for item in value]
        return value

    manifest = extract(data)
    manifest['release'] = 'member-games-1'
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print('Wrote public assets and manifest to', output)


if __name__ == '__main__':
    main()
