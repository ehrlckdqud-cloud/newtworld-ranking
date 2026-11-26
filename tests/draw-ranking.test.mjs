import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { scoreDrawRound, startDrawRound } from '../draw/draw-ranking.mjs';
import { readDrawLeaderboard, recordDrawRound } from '../server/draw-ranking-store.mjs';

const schema = readFileSync(new URL('../server/draw-ranking.sql', import.meta.url), 'utf8');
const first = '2026-11-26T12:00:00.000Z';
const second = '2026-11-27T12:00:00.000Z';
const singles = Array.from({ length: 11 }, (_, i) => [i]);
function roster(selected = []) {
  return singles.map(([id]) => ({ id, name: selected.includes(id) ? '셀리' : '주자' + id }));
}
function openDatabase(path) {
  const sqlite = new DatabaseSync(path);
  sqlite.exec(schema);
  return {
    close: () => sqlite.close(),
    prepare: sql => ({
      bind: (...args) => ({
        first: async () => sqlite.prepare(sql).get(...args),
        all: async () => ({ results: sqlite.prepare(sql).all(...args) })
      })
    })
  };
}

test('eleven positions pay 10 to 0 and a triple tie occupies places 1 through 3', () => {
  const round = startDrawRound('pond', true, roster());
  const { standings } = scoreDrawRound(round, [[2, 0, 1], ...singles.slice(3)]);
  assert.deepEqual(standings.map(x => x.rank), [1,1,1,4,5,6,7,8,9,10,11]);
  assert.deepEqual(standings.map(x => x.points), [9,9,9,7,6,5,4,3,2,1,0]);
  assert.equal(standings.reduce((sum, x) => sum + x.points, 0), 55);
  assert.deepEqual(scoreDrawRound(round, [singles.flat()]).standings.map(x => x.points), Array(11).fill(5));
});

test('scores are not rounded before averaging, nickname matching follows the existing draw rules', () => {
  const round = startDrawRound('space', true, [
    {id:1,name:' CY '}, {id:2,name:'cy'}, {id:3,name:'A'}, {id:4,name:'B'}
  ]);
  const { scores } = scoreDrawRound(round, [[1],[2],[3],[4]]);
  assert.equal(scores[0].entries, 2);
  assert.equal(scores[0].points, 25/3);
  const solo = startDrawRound('pinball', true, [{id:1,name:'A'}]);
  assert.equal(scoreDrawRound(solo, [[1]]).scores[0].points, 10);
});

test('persistent round means accumulate once, even after a restart or an out-of-order retry', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'draw-ranking-'));
  const path = join(dir, 'rounds.sqlite');
  let db = openDatabase(path);
  t.after(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });
  const a = startDrawRound('pet-race', true, roster([0,4,8]));
  const b = startDrawRound('pet-race', true, roster([3]));
  await recordDrawRound(db, b, singles, second);
  await recordDrawRound(db, a, singles, first);
  db.close();
  db = openDatabase(path);
  const retry = await recordDrawRound(db, JSON.parse(JSON.stringify(a)), singles, second);
  assert.equal(retry.finishedAt, first);
  const board = await readDrawLeaderboard(db, 'pet-race');
  const member = board.find(x => x.nickname === '셀리');
  assert.deepEqual([member.rounds,member.entries,member.points,member.lastPlayedAt], [2,4,13,second]);
  assert.equal(board.find(x => x.nickname === '주자10').points, 0);
  assert.deepEqual(await readDrawLeaderboard(db, 'wild-run-91'), []);
  await assert.rejects(recordDrawRound(db, a, [...singles].reverse(), first), /다른 결과/);
  assert.deepEqual(await readDrawLeaderboard(db, 'pet-race'), board);
});

test('unranked results still score and never access the database; incomplete rounds leave no record', async t => {
  const db = openDatabase(':memory:');
  t.after(db.close);
  for (const game of ['pinball','pond','space','wild-run-91','pet-race']) {
    const trial = startDrawRound(game, false, roster());
    const result = await recordDrawRound(null, trial, singles, first);
    assert.equal(result.recorded, false);
    assert.equal(result.standings.length, 11);
    const official = startDrawRound(game, true, roster());
    for (const invalid of [singles.slice(1), [...singles,[0]], [[99],...singles], [[]]]) {
      await assert.rejects(recordDrawRound(db, official, invalid, first));
    }
    assert.deepEqual(await readDrawLeaderboard(db, game), []);
  }
  assert.throws(() => startDrawRound('pond', true, [{id:1,name:'A'},{id:'1',name:'B'}]));
});

test('identical tied results from separate connections share one ID and one leaderboard row per nickname', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'draw-ranking-'));
  const path = join(dir, 'rounds.sqlite');
  const db = openDatabase(path), other = openDatabase(path);
  t.after(() => { db.close(); other.close(); rmSync(dir, { recursive: true, force: true }); });
  const round = startDrawRound('pond', true, roster());
  const tail = singles.slice(3);
  await Promise.all([
    recordDrawRound(db, round, [[0,1,2], ...tail], first),
    recordDrawRound(other, round, [[2,0,1], ...tail], first)
  ]);
  const board = await readDrawLeaderboard(other, 'pond');
  assert.equal(board.length, 11);
  assert.deepEqual(board.slice(0,4).map(x => [x.rank,x.rounds,x.points]), [[1,1,9],[1,1,9],[1,1,9],[4,1,7]]);
});

test('both race games keep independent totals, retrying an interrupted write preserves all entries', async t => {
  const db = openDatabase(':memory:');
  t.after(db.close);
  const pets = startDrawRound('pet-race', true, roster([0]));
  const wild = startDrawRound('wild-run-91', true, roster([10]));
  await recordDrawRound(db, pets, singles, first);
  const failed = { prepare() { throw new Error('unavailable'); } };
  await assert.rejects(recordDrawRound(failed, wild, singles, first), /unavailable/);
  await recordDrawRound(db, wild, singles, first);
  for (const [game, points] of [['pet-race',10],['wild-run-91',0]]) {
    const board = await readDrawLeaderboard(db, game);
    const member = board.find(x => x.nickname === '셀리');
    assert.deepEqual([member.rounds,member.entries,member.points], [1,1,points]);
  }
});
