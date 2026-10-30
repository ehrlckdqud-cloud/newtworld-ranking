// Actual v83 WASM/ROM HP measurements. No production gameplay changes.
// Requires the user's existing ROM bundle; it is never included in the report.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const core = process.env.MS3_CORE;
const rom = process.env.MS3_ROM_ZIP;
if (!core || !rom) throw Error('MS3_CORE and MS3_ROM_ZIP required');
function load(file) {
  const mod = new Module(file, module);
  mod.filename = file;
  mod.paths = module.paths;
  mod._compile(fs.readFileSync(file, 'utf8'), file);
  return mod.exports;
}
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
(async () => {
  global.JSZip = load(root + '/coop/jszip.js');
  load(root + '/coop/engine.js');
  const m = await load(core)({print: () => {}, printErr: () => {}});
  const profile = JSON.parse(fs.readFileSync(root + '/coop/native/profile.json'));
  await (await import(root + '/coop/native/prepare-coop.mjs')).prepareCoopROM(m, fs.readFileSync(rom), profile);
  const outer = await JSZip.loadAsync(fs.readFileSync(rom));
  const inner = await JSZip.loadAsync(await outer.file('ROMS/mslug3.zip').async('uint8array'));
  const originalP1 = await inner.file('256d-p1.rom').async('uint8array');
  const overlay = await JSZip.loadAsync(m.FS.readFile('/system/fbneo/patched/mslug3fd.zip'));
  const patchedP1 = await overlay.file('256-ph1.p1').async('uint8array');
  const nativeCode = bytes => Uint8Array.from(bytes, (_, i) => bytes[i ^ 1]);
  const originalCode = nativeCode(originalP1), actualCode = nativeCode(patchedP1);
  const unchangedRoutines = [[0x5804,0x5814], [0x77fc,0x781e], [0x781e,0x791a]].map(([start,end]) => {
    assert.deepEqual(actualCode.slice(start,end), originalCode.slice(start,end), 'original selector/table reader unchanged');
    return {start, endExclusive: end, sha256: crypto.createHash('sha256').update(actualCode.slice(start,end)).digest('hex')};
  });
  assert(m._nw_load());
  const {FiveSession} = await import(root + '/coop/native/five-session.mjs');
  const {captureState, restoreState} = await import(root + '/coop/lockstep-snapshot.mjs');
  const e = new FiveSession(m, profile, {characters: [0,0,0,0,0], playerCount: 5, sharedSelection: true, paid: true});
  const zero = [0,0,0,0,0];
  for (let f = 0; f < 1400; f++) e.step(zero);
  const boot = captureState(m, e, e.frame);
  const report = {
    schema: 1, version: 'v83',
    scope: 'Actual native actor HP reads, fixed boot state and difficulty. Boss scenes use explicit native stage entry; not full natural mission completion. No enemy HP or damage edits.',
    coreSha256: hash(core), profileSha256: hash(root + '/coop/native/profile.json'),
    sessionSha256: hash(root + '/coop/native/five-session.mjs'),
    unchangedRoutines, matrix: [], partyCases: [], checks: unchangedRoutines.length
  };
  function check(actual, expected, label) { assert.deepEqual(actual, expected, label); report.checks++; }
  function start(n) {
    restoreState(m, e, boot);
    e.playerCount = n;
    e.players.forEach((p, i) => {p.participating = i < n; p.state = i < n ? 'waiting' : 'spectator'; p.lives = i < n ? 3 : 0;});
    e.start();
    for (let f = 0; f < 900 && e.phase !== 'playing'; f++) e.step(Array.from({length: 5}, (_, i) => i < n && f % 20 === 1 ? 16 : 0));
    check(e.phase, 'playing', 'normal boot');
    for (let f = 0; f < 60; f++) e.step(zero);
    return captureState(m, e, e.frame);
  }
  function enter(mission, substage) {
    e.wb(0x10ed7a, mission); e.wb(0x10ed7b, substage); e.wl(0x10039c, 0xed0f6);
  }
  function find(routine, n, walk = false) {
    for (let f = 0; f < 800; f++) {
      e.step(walk ? Array.from({length: 5}, (_, i) => i < n ? 8 : 0) : zero);
      for (let a = 0x10044c; a < 0x104d2c; a += 0xb0) {
        if (e.long(a) === routine) return {actor: a, frame: f, hp: e.word(a + 0x4e), subtype: e.byte(a + 0x64), activeMask: e.byte(0x10ed86), difficultyByte: e.byte(0x10fd8b), gameMode: e.byte(0x10001a)};
      }
    }
    throw Error('Native actor not reached: ' + routine.toString(16));
  }
  // Test-only RAM trampoline: preserve SR and D0-D7/A0-A6, run unchanged
  // original 0x77FC selector, capture D7, restore registers, tail-call original
  // actor routine. Only unused +0x60..+0xA1 of reserved input object is used.
  // The full snapshot is restored before independent cases. No ROM patch.
  function probeMode(actor) {
    const target = e.x.inputBase + 0x60, out = e.x.inputBase + 0xa0;
    const original = e.long(actor), hex = n => n.toString(16).padStart(8, '0');
    const code = Buffer.from('40e748e7fffe4eb9000077fc33c7' + hex(out) + '4cdf7fff46df4ef9' + hex(original), 'hex');
    for (let i = 0; i < code.length; i++) e.wb(target + i, code[i]);
    e.ww(out, 65535); e.wl(actor, target);
    for (let f = 0; f < 4 && e.word(out) === 65535; f++) e.step(zero);
    if (e.long(actor) === target) e.wl(actor, original);
    const mode = e.word(out);
    assert(mode === 0 || mode === 1, 'native selector executed');
    return mode;
  }
  let five;
  for (let n = 1; n <= 5; n++) {
    const playing = start(n);
    if (n === 5) five = playing;
    const crab = find(0xa0694, n, true);
    check(crab.hp, n === 1 ? 30 : 50, 'M1 crab HP');
    restoreState(m, e, playing); enter(3, 16);
    const m4 = find(0x73a2c, n);
    check(m4.hp, n === 1 ? 5000 : 7000, 'M4 boss HP');
    restoreState(m, e, playing); enter(4, 14);
    const final = find(0x9f488, n);
    check(final.hp, n === 1 ? 8000 : 12000, 'M5 final-scene boss HP');
    report.matrix.push({players: n, slots: Array.from({length:n},(_,i)=>i+1), crab, mission4Boss: m4, finalSceneBoss: final});
    console.log('PASS HP matrix', n, crab.hp, m4.hp, final.hp);
  }
  for (const slots of [[1], [2], [1,2], [1,3], [3,4,5], [1,3,4,5], [1,2,3,4,5]]) {
    restoreState(m, e, five);
    for (let s = 1; s <= 5; s++) if (!slots.includes(s)) e.removePlayer(s);
    enter(3, 16);
    const boss = find(0x73a2c, 5);
    const expectedMode = Number(slots.includes(1) && slots.includes(2));
    check(boss.hp, expectedMode ? 7000 : 5000, 'seat-specific HP');
    const row = {slots, hp: boss.hp, mode: probeMode(boss.actor), activeMask: e.byte(0x10ed86), transitions: []};
    check(row.mode, expectedMode, 'native participant selector');
    const transitions = slots.length === 1 && slots[0] === 1 ? [2,3,4,5] : slots.length === 5 ? [-5,-2,-1] : [];
    for (const change of transitions) {
      if (change > 0) {e.addSeat(change); e.quickContinue(change, 'hp-test-' + change, true);}
      else e.removePlayer(-change);
      for (let f = 0; f < 10; f++) e.step(zero);
      const mode = probeMode(boss.actor), hp = e.word(boss.actor + 0x4e);
      check(hp, boss.hp, 'existing boss HP unchanged by join/departure');
      check(mode, Number(e.long(e.x.actors[0]) !== 0x567a && e.long(e.x.actors[1]) !== 0x567a), 'mode follows original P1/P2 actor state');
      row.transitions.push({action: change > 0 ? 'join' : 'depart', slot: Math.abs(change), hp, mode, activeMask: e.byte(0x10ed86)});
    }
    report.partyCases.push(row);
    console.log('PASS seat/transition', slots.join(','), row.hp, row.mode);
  }
  report.passed = true;
  if (process.env.MS3_HP_REPORT) fs.writeFileSync(process.env.MS3_HP_REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log('PASS', report.checks, 'checks');
  m._nw_close();
})().catch(error => {console.error(error); process.exitCode = 1;});
