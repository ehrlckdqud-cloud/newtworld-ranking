import assert from 'node:assert/strict';
import test from 'node:test';
import {ensureEngine} from '../coop/metal-slug-engine.mjs';

test('a cold launch waits for the factory, retries a missing export and reuses a ready engine', async t => {
  const scripts = [];
  globalThis.window = {};
  globalThis.document = {
    createElement: () => ({remove() { this.removed = true; }}),
    head: {append: script => scripts.push(script)}
  };
  t.after(() => { delete globalThis.window; delete globalThis.document; });

  const first = ensureEngine();
  assert.equal(ensureEngine(), first);
  assert.equal(scripts.length, 1);
  scripts[0].onload();
  await assert.rejects(first, /게임 엔진/);
  assert.ok(scripts[0].removed);

  const retry = ensureEngine();
  assert.equal(scripts.length, 2);
  window.createMS3 = () => {};
  scripts[1].onload();
  assert.equal(await retry, window.createMS3);
  assert.equal(await ensureEngine(), window.createMS3);
  assert.equal(scripts.length, 2);
});
