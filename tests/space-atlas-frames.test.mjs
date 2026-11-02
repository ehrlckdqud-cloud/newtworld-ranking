import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareAtlasFrames} from '../draw/space-atlas-frames.js';

test('large atlas is decoded once; cropped frames survive releasing the source', async () => {
  const original = globalThis.createImageBitmap;
  const image = {}, calls = [], atlas = {closed:false,close(){this.closed=true;}};
  globalThis.createImageBitmap = async (source, ...rect) => {
    calls.push({source,rect});
    if (source === image) return atlas;
    assert.equal(source, atlas);
    assert.equal(atlas.closed, false);
    return {rect,closed:false,close(){this.closed=true;}};
  };
  try {
    const rects = Array.from({length:10}, (_, i) => [i * 4,0,4,4]);
    const frames = await prepareAtlasFrames(image, rects);
    assert.equal(calls.filter(c => c.source === image).length,1);
    assert.deepEqual(frames.map(f => f.rect),rects);
    assert.ok(frames.every(f => !f.closed));
    assert.equal(atlas.closed,true);
  } finally { globalThis.createImageBitmap = original; }
});

test('failed crop releases intermediate bitmaps and retains image fallback', async () => {
  const original = globalThis.createImageBitmap;
  const closed = [], image = {}, atlas = {close(){closed.push('atlas');}};
  let crops = 0;
  globalThis.createImageBitmap = async source => {
    if (source === image) return atlas;
    if (crops++) throw Error('decode failed');
    return {close(){closed.push('frame');}};
  };
  try {
    assert.equal(await prepareAtlasFrames(image, [[0,0,4,4],[4,0,4,4]]), null);
    assert.deepEqual(closed,['frame','atlas']);
  } finally { globalThis.createImageBitmap = original; }
});
