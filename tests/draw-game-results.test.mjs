import { addRaceRanking } from '../server/race-ranking-html.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { beginGameRound, beginPinball, beginRace, finishPond, finishSpace } from '../draw/draw-game-results.mjs';
import { recordDrawRound } from '../server/draw-ranking-store.mjs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const pin = source('draw/gameApp.2560b8fa.js');
const pond = source('draw/pondApp.e4104cc4.js');
const space = source('draw/space-original.js');
function between(text, first, next) {
  const start = text.indexOf(first), end = text.indexOf(next, start + first.length);
  assert.ok(start >= 0 && end > start, first);
  return text.slice(start, end);
}
const entrants = ['셀리', 'B', '셀리', 'D', 'E'].map((name, id) => ({ name, id }));
const observed = [];
globalThis.dispatchEvent = event => {
  assert.equal(event.type, 'nw-draw-result');
  observed.push(event.detail);
  return true;
};

test('ordinary pinball goal selects arrival order and ties marbles still in play', () => {
  const ranking = beginPinball(entrants, 'first');
  ranking.arrive(1);
  ranking.arrive(2);
  const check = between(pin, '_checkFinish(){', '_calcTimeScale(){');
  const Engine = Function('window', 'return class {' + check + '}')({ setTimeout() {} });
  const engine = Object.assign(new Engine(), {
    _isRunning: true, _winnerRange: { start: 0, end: 1 }, _stage: {},
    _winners: [entrants[1], entrants[2]], _marbles: [entrants[0], entrants[3], entrants[4]],
    drawRanking: ranking, _pendingRemovals: [], dispatchEvent(event) {
      assert.deepEqual(event.detail.winners, ['B', '셀리']);
    }
  });
  engine._checkFinish();
  assert.deepEqual(observed.at(-1).groups, [[1],[2],[0,3,4]]);
});

test('both factory modes preserve actual prize IDs and terminal elimination groups', () => {
  const play = mode => {
    const rank = beginPinball(entrants, mode);
    rank.knockOut(new Set([2, 4]));
    rank.arrive(3);
    return rank.finish(mode === 'first' ? [entrants[3],entrants[0]] : [entrants[0],entrants[1]]);
  };
  assert.deepEqual(play('first').groups, [[3],[0],[1],[2,4]]);
  assert.deepEqual(play('last').groups, [[0,1],[3],[2,4]]);
  assert.match(pin, /td\.start\(M\.value\)/);
  assert.match(pin, /this\.drawRanking\.knockOut\(a\)/);
  assert.match(pin, /this\.drawRanking\.arrive\(e\.id\)/);
});

test('pond start and finish handle instant all-survive, revival and final loss only', () => {
  const start = between(pond, 'start(){!this.adminCheck()', 'layout(e=!1)');
  const finish = between(pond, 'finish(){if("finished"!==this.state)', '}}),i("c9l5F"');
  const Engine = Function('beginGameRound','finishPond','return class {' + start + finish + '}')(beginGameRound,finishPond);
  const create = keep => Object.assign(new Engine(), {
    keep, initial: 5, leaves: entrants.map(e => ({ ...e, alive: true, outAt: -1 })),
    state: 'ready', animationTime: 0, next() {}, adminCheck: () => true, onFinish() {}
  });
  Object.defineProperty(Engine.prototype, 'alive', { get() { return this.leaves.filter(x => x.alive); } });
  create(5).start();
  assert.deepEqual(observed.at(-1).groups, [[0,1,2,3,4]]);
  const engine = create(2);
  engine.start();
  Object.assign(engine.leaves[0], { revived: true });
  Object.assign(engine.leaves[1], { alive: false, outAt: 15, revived: true });
  for (const id of [2,3]) Object.assign(engine.leaves[id], { alive: false, outAt: 10 });
  engine.finish();
  const event = observed.at(-1);
  assert.deepEqual(event.groups, [[0,4],[1],[2,3]]);
  assert.deepEqual(event.revivedWinnerIds, ['0']);
  engine.finish();
  assert.equal(observed.at(-1), event);
});

test('space boss completion shares a place only for a simultaneous loss to the same attack', () => {
  const ships = entrants.map(e => ({ ...e }));
  for (const [deathOrder,id,drawAttack] of [[1,3,'beam'],[2,0,'beam'],[3,1,'wall'],[4,2,'beam']]) {
    Object.assign(ships[id], { dead: true, death: id === 3 ? 8 : 10, deathOrder, drawAttack });
  }
  const round = beginGameRound('space', ships);
  const terminal = between(space, 'const alive=ships.filter(s=>!s.dead);if(!announced', 'if(boss?.finished&&announced)');
  const call = Function('ships','drawRound','finishSpace','boss','mission','nativeAudio','q',
    'let announced=false, battle, target=1;' + terminal);
  const n = observed.length;
  call(ships,round,finishSpace,{finished:true},{finished:false},{reset(){}},()=>({}));
  assert.equal(observed.length,n);
  call(ships,round,finishSpace,{finished:true},{finished:true},{reset(){}},()=>({}));
  assert.deepEqual(observed.at(-1).groups, [[4],[2,0],[1],[3]]);
});

test('race awards first through last even with duplicate names and a multi-prize draw', () => {
  for (const game of ['wild-run-91','pet-race']) {
    const finish = beginRace(game, entrants);
    const order = [entrants[2],entrants[0],entrants[4],entrants[3],entrants[1]];
    assert.throws(() => finish(order.slice(0,4),3));
    const result = finish(order,3);
    assert.equal(finish(order,3),result);
    assert.equal(result.round.game,game);
    assert.deepEqual(result.winnerIds,['2','0','4']);
    assert.deepEqual(result.standings.map(x=>x.points),[10,7.5,5,2.5,0]);
    assert.equal(result.scores.find(x=>x.name==='셀리').points,8.75);
  }
});

test('storage accepts the emitted result and retains the exact prize and revival flags on retry', async t => {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  sqlite.exec(source('server/draw-ranking.sql'));
  const db = { prepare: sql => ({bind: (...args) => ({first: async () => sqlite.prepare(sql).get(...args)})}) };
  const result = finishPond(beginGameRound('pond',entrants),
    entrants.map(e => ({ ...e, alive: e.id < 2, revived: e.id === 1, outAt: e.id })));
  for (let i=0;i<2;i++) await recordDrawRound(db,result.round,result.groups,result.finishedAt,result);
  const stored = sqlite.prepare('SELECT standings FROM draw_ranking_rounds').all();
  assert.equal(stored.length,1);
  assert.deepEqual(JSON.parse(stored[0].standings).filter(x=>x.winner).map(x=>[x.id,x.revivedWinner]),[['0',false],['1',true]]);
});

test('race HTML hook snapshots the published finish order once across delayed loading, repeated refresh and restart', async () => {
  const original = `
    let state='ready',runners=[],order=[],target=3;
    function refresh(){}
    function update(arrivals){
      order=arrivals.concat(runners.filter(r=>r.p<1).sort((a,b)=>b.d-a.d));
      if(arrivals.length===runners.length){state='done';refresh()}
    }
    return { ready(list){ runners=list;state='ready';refresh(); },
      start(){state='count';refresh()}, update, refresh };
  `;
  for (const game of ['wild-run-91','pet-race']) {
    const url = new URL('../draw/draw-game-results.mjs', import.meta.url).href;
    const html = addRaceRanking(original,game,url);
    assert.equal(addRaceRanking(html,game,url),html);
    const prefs = new Map([['nw-draw-ranked:'+game,'off']]);
    const engine = Function('localStorage',html)({getItem:key=>prefs.get(key)});
    const runners = entrants.map(e=>({...e,p:1}));
    engine.ready(runners);
    engine.start();
    prefs.clear();
    const before = observed.length;
    const finish = [runners[4],runners[0],runners[2],runners[1],runners[3]];
    const completed = Promise.withResolvers();
    const dispatch = globalThis.dispatchEvent;
    globalThis.dispatchEvent = event => { const applied=dispatch(event); completed.resolve(); return applied; };
    try {
      engine.update(finish);
      engine.refresh();
      await completed.promise;
      assert.equal(observed.length,before+1);
      assert.equal(observed.at(-1).round.ranked,false);
      assert.deepEqual(observed.at(-1).winnerIds,['4','0','2']);
      engine.ready(runners);
      engine.start();
      engine.update(finish);
      await new Promise(resolve=>setImmediate(resolve));
      assert.equal(observed.length,before+2);
      assert.equal(observed.at(-1).round.ranked,true);
    } finally { globalThis.dispatchEvent=dispatch; }
  }
  assert.throws(()=>addRaceRanking('unrelated page','pet-race','/app.mjs'),/template/);
});
