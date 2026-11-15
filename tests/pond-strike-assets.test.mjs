import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';

const source = readFileSync(new URL('../draw/pondApp.e4104cc4.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../draw/pond.html', import.meta.url), 'utf8');
const start = source.indexOf('const pondStrikes = ');
const end = source.indexOf('\nfunction strikePoint(', start);
assert.ok(start >= 0 && end > start, 'new strike configuration must exist');
const strikes = JSON.parse(source.slice(start + 'const pondStrikes = '.length, end).trim().replace(/;$/, ''));

const species = {
  tomatofrog: '양서류',
  snappingturtle2: '파충류',
  otter: '포유류',
  platypus: '포유류',
};

test('new strike species categories and legacy snapping turtle stay separate', () => {
  assert.deepEqual(Object.keys(strikes).sort(), Object.keys(species).sort());
  for (const [key, category] of Object.entries(species)) {
    assert.equal(strikes[key].category, category, key);
    assert.ok(strikes[key].mouth.every(v => v >= 0 && v <= 1), key);
  }
  assert.match(source, /snappingturtle:new URL\("\.\/snapping-turtle-v3\.webp"/);
  assert.match(source, /"snappingturtle","tomatofrog","snappingturtle2","otter","platypus"/);
  assert.match(source, /key==="snappingturtle"\?"파충류":"양서류"/);
  assert.match(html, /동물 12종/);
  assert.match(html, /12종 동물 영상/);
});

test('all four sprite-page bundles, preview images and original audio files are consistent', () => {
  for (const key of Object.keys(species)) {
    const clip = strikes[key];
    const data = readFileSync(new URL(`../draw/${key}-strike.bin`, import.meta.url));
    const preview = readFileSync(new URL(`../draw/${key}-strike.webp`, import.meta.url));
    const audio = readFileSync(new URL(`../draw/${key}-strike.wav`, import.meta.url));
    assert.ok(clip.frames > 0 && clip.contact >= 0 && clip.contact < clip.frames, key);
    assert.equal(clip.ranges.length, Math.ceil(clip.frames / 8), key);
    let pos = 0;
    for (const [offset, length] of clip.ranges) {
      assert.equal(offset, pos, `${key} page offsets must be contiguous`);
      assert.ok(length >= 12, key);
      assert.equal(data.toString('ascii', offset, offset + 4), 'RIFF', key);
      assert.equal(data.toString('ascii', offset + 8, offset + 12), 'WEBP', key);
      pos += length;
    }
    assert.equal(pos, data.length, `${key} page sizes must match actual binary`);
    assert.ok(preview.length > 12, key);
    assert.equal(preview.toString('ascii', 0, 4), 'RIFF', key);
    assert.equal(preview.toString('ascii', 8, 12), 'WEBP', key);
    assert.ok(audio.length > 44, key);
    assert.equal(audio.toString('ascii', 0, 4), 'RIFF', key);
    assert.equal(audio.toString('ascii', 8, 12), 'WAVE', key);
  }
});

test('otter supports separate mouth and paw contacts and an unbiased two-choice roll', () => {
  assert.ok(strikes.otter.paw.every(v => v >= 0 && v <= 1));
  assert.ok(strikes.otter.pawContact >= 0 && strikes.otter.pawContact < strikes.otter.frames);
  assert.match(source, /this\.attackIndex\(2\)===0\?"mouth":"paw"/);
  assert.match(source, /route==="paw"\?strike\.pawContact:strike\.contact/);
});
