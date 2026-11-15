#!/usr/bin/env python3
"""Pixel-level regression tests on the actual generated sprite pages, not code strings."""
import hashlib
import io
import json
import sys
import unittest
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from pond_eye_matte import enclosed_sclera_guard
DRAW = ROOT / 'draw'
CHECKS = ROOT / 'checks'
BX, BY, BW, BH = [round(v * .75) for v in (58, 195, 998, 430)]
TX, TY = (960 - BW) // 2, (540 - BH) // 2


def decode_tiles(path, metadata):
    blob = path.read_bytes()
    result = []
    for offset, size in metadata['ranges']:
        page = Image.open(io.BytesIO(blob[offset:offset + size])).convert('RGBA')
        for i in range(8):
            x, y = (i % 4) * 960, (i // 4) * 540
            result.append(np.array(page.crop((x, y, x + 960, y + 540))))
    return result[:metadata['frames']]


def base_alpha(area):
    hi = area.max(2).astype(np.int16)
    lo = area.min(2).astype(np.int16)
    _, labels = cv2.connectedComponents(((lo > 205) & (hi - lo < 36)).astype(np.uint8), connectivity=4)
    border = np.unique(np.concatenate((labels[0], labels[-1], labels[:, 0], labels[:, -1])))
    mask = np.where(np.isin(labels, border), 0, 255).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(((lo > 177) & (hi - lo < 47)).astype(np.uint8), connectivity=4)
    rim = np.unique(np.concatenate((labels[0], labels[-1], labels[:, 0], labels[:, -1])))
    unwanted = np.isin(np.arange(count), rim) | (stats[:, cv2.CC_STAT_AREA] >= 80)
    unwanted[0] = False
    lower = np.arange(BH)[:, None] >= int(BH * .54)
    mask[unwanted[labels] & lower] = 0
    return cv2.GaussianBlur(cv2.medianBlur(mask, 3), (3, 3), .65)


def composite(tile):
    alpha = tile[:, :, 3:4].astype(np.float32) / 255
    return np.uint8(tile[:, :, :3] * alpha + np.array([18, 71, 63]) * (1 - alpha))


class ScleraSafety(unittest.TestCase):
    def test_blank_exterior_can_never_become_an_opaque_circle(self):
        area = np.full((100, 150, 3), 245, dtype=np.uint8)
        guard = enclosed_sclera_guard(area, (75, 50), (26, 22))
        self.assertEqual(int(guard.max()), 0)

    def test_genuine_enclosed_grey_and_white_sclera_are_preserved(self):
        area = np.full((100, 150, 3), 245, dtype=np.uint8)
        cv2.rectangle(area, (10, 10), (65, 85), (100, 60, 25), -1)
        cv2.ellipse(area, (38, 40), (9, 14), 0, 0, 360, (190, 190, 190), -1)
        guard = enclosed_sclera_guard(area, (38, 40), (20, 22))
        self.assertGreaterEqual(int(guard[40, 38]), 250)
        self.assertEqual(int(guard[50, 110]), 0)
        # Even a deliberately wrong match in the mouth/background cannot draw it.
        wrong = enclosed_sclera_guard(area, (110, 50), (26, 22))
        self.assertEqual(int(wrong.max()), 0)


class PublishedSprites(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        CHECKS.mkdir(exist_ok=True)
        cls.meta = json.loads((DRAW / 'pond-full-meta.json').read_text())['platypus']
        cls.tiles = decode_tiles(DRAW / 'platypus-strike.bin', cls.meta)
        cls.source = []
        cap = cv2.VideoCapture(str(DRAW / 'source-videos/platypus.mp4'))
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            cls.source.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        cap.release()
        cls.metrics = {'frames': len(cls.tiles), 'version': cls.meta['matteVersion']}
        # Contact sheets cover EVERY generated frame, not only the impact preview.
        views = []
        for index, tile in enumerate(cls.tiles):
            im = Image.fromarray(composite(tile)).crop((TX + 380, TY, TX + BW, TY + 270))
            ImageDraw.Draw(im).text((6, 6), f'source {index + 21} / clip {index / 24:.3f}s', fill='yellow')
            views.append(im)
        for batch in range(10):
            sheet = Image.new('RGB', ((BW - 380) * 4, 270 * 3))
            for j, im in enumerate(views[batch * 12:(batch + 1) * 12]):
                sheet.paste(im, ((j % 4) * (BW - 380), (j // 4) * 270))
            sheet.save(CHECKS / f'platypus-all-{batch:02}.jpg', quality=92)
        old_meta = json.loads((CHECKS / 'before-meta.json').read_text())['platypus']
        cls.old = decode_tiles(CHECKS / 'before-platypus.bin', old_meta)
        index = 107 - 21
        original = Image.fromarray(cls.source[107][BY:BY + BH, BX:BX + BW]).crop((380, 0, BW, 270))
        before = Image.fromarray(composite(cls.old[index])).crop((TX + 380, TY, TX + BW, TY + 270))
        after = views[index]
        comparison = Image.new('RGB', ((BW - 380) * 3, 294))
        for j, (label, im) in enumerate(zip(('Original source', 'Before repair', 'After repair'), (original, before, after))):
            comparison.paste(im, (j * (BW - 380), 24))
            ImageDraw.Draw(comparison).text((j * (BW - 380) + 5, 5), label, fill='white')
        comparison.save(CHECKS / 'platypus-circle-before-after.png')

    @classmethod
    def tearDownClass(cls):
        (CHECKS / 'pixel-report.json').write_text(json.dumps(cls.metrics, indent=2))

    def test_all_120_frames_have_no_new_detached_opaque_background(self):
        self.assertEqual(len(self.tiles), 120)
        counts = []
        for i, tile in enumerate(self.tiles):
            area = self.source[i + 21][BY:BY + BH, BX:BX + BW]
            base = base_alpha(area)
            distance = cv2.distanceTransform((base == 0).astype(np.uint8), cv2.DIST_L2, 5)
            alpha = tile[TY:TY + BH, TX:TX + BW, 3]
            count = int(np.count_nonzero((alpha > 220) & (distance > 12)))
            counts.append(count)
            self.assertEqual(count, 0, f'new detached white foreground in source frame {i + 21}')
        self.metrics['detachedOpaquePixelsPerFrame'] = counts

    def test_regression_source_frame_107_has_transparent_mouth_gap(self):
        index = 107 - 21
        region = np.s_[TY + 104:TY + 120, TX + 620:TX + 636, 3]
        old_count = int(np.count_nonzero(self.old[index][region] > 200))
        new_count = int(np.count_nonzero(self.tiles[index][region] > 20))
        self.metrics['knownMouthGapBeforeOpaquePixels'] = old_count
        self.metrics['knownMouthGapAfterOpaquePixels'] = new_count
        self.assertEqual(new_count, 0, 'the visible white circle must not return')

    def test_early_and_attack_eye_whites_remain_opaque(self):
        # Original-source white sclera interiors manually checked at these frames.
        points = {21: (531, 145), 39: (544, 193), 80: (551, 95), 107: (542, 76), 140: (550, 91)}
        values = {}
        for source_index, (x, y) in points.items():
            alpha = int(self.tiles[source_index - 21][TY + y, TX + x, 3])
            values[str(source_index)] = alpha
            self.assertGreaterEqual(alpha, 235, f'eye white erased at source frame {source_index}')
        self.metrics['originalScleraAlpha'] = values

    def test_other_creatures_and_all_audio_are_byte_identical(self):
        protected = json.loads((CHECKS / 'protected-assets.json').read_text())
        for rel, expected in protected.items():
            actual = hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()
            self.assertEqual(actual, expected, f'unrelated file changed: {rel}')
        self.metrics['unchangedAssets'] = len(protected)


if __name__ == '__main__':
    unittest.main(verbosity=2)
