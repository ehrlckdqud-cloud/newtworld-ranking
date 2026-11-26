import { startDrawRound, scoreDrawRound } from './draw-ranking.mjs';

function rankingEnabled(game) {
  let ranked = true;
  try {
    ranked = globalThis.localStorage?.getItem('nw-draw-ranked:' + game) !== 'off';
  } catch { /* The game can still run without browser preferences. */ }
  return ranked;
}

export function beginGameRound(game, entrants) {
  return startDrawRound(game, rankingEnabled(game), entrants);
}

// Every group contains entry IDs, including copies with the same nickname.
function publish(round, groups, winners, extra = {}) {
  const result = {
    round, groups, finishedAt: new Date().toISOString(),
    winnerIds: winners.map(String), ...extra, ...scoreDrawRound(round, groups)
  };
  globalThis.dispatchEvent(new CustomEvent('nw-draw-result', { detail: result }));
  return result;
}

export function beginPinball(entrants, mode) {
  const round = beginGameRound('pinball', entrants);
  const removed = new Set();
  const exits = [];
  const knocks = [];
  const timeline = [];
  function capture(ids, bucket) {
    const group = ids.filter(id => !removed.has(id));
    if (!group.length) return;
    for (const id of group) removed.add(id);
    bucket.push(group);
    timeline.push(group);
  }
  return {
    arrive(id) { capture([id], exits); },
    knockOut(ids) { capture([...ids], knocks); },
    finish(winningMarbles) {
      const winnerIds = winningMarbles.map(marble => marble.id);
      const winners = new Set(winnerIds);
      const outstanding = entrants.filter(marble => !removed.has(marble.id)).map(marble => marble.id);
      const order = mode === 'last'
        ? [outstanding, ...timeline.slice().reverse()]
        : [...exits, outstanding, ...knocks.slice().reverse()];
      // A factory course can award an unfinished marble when the prize count
      // is already decided. Honour the engine's choice before unplaced marbles.
      const placed = order.map(group => group.filter(id => winners.has(id)));
      const rest = order.map(group => group.filter(id => !winners.has(id)));
      return publish(round, [...placed, ...rest].filter(group => group.length), winnerIds, { mode });
    }
  };
}

export function finishPond(round, leaves) {
  const winners = leaves.filter(leaf => leaf.alive);
  const losses = new Map();
  for (const leaf of leaves) {
    if (leaf.alive) continue;
    if (!losses.has(leaf.outAt)) losses.set(leaf.outAt, []);
    losses.get(leaf.outAt).push(leaf.id);
  }
  const winnerIds = winners.map(leaf => leaf.id);
  const groups = [...losses.keys()].sort((a, b) => b - a).map(time => losses.get(time));
  if (winnerIds.length) groups.unshift(winnerIds);
  return publish(round, groups, winnerIds, {
    revivedWinnerIds: winners.filter(leaf => leaf.revived).map(leaf => String(leaf.id))
  });
}

export function finishSpace(round, ships) {
  const winnerIds = ships.filter(ship => !ship.dead).map(ship => ship.id);
  const groups = winnerIds.length ? [winnerIds] : [];
  const losses = ships.filter(ship => ship.dead).sort((a, b) => b.deathOrder - a.deathOrder);
  let time;
  const attacks = new Map();
  for (const ship of losses) {
    if (ship.death !== time) {
      attacks.clear();
      time = ship.death;
    }
    const attack = ship.drawAttack ?? ship;
    if (!attacks.has(attack)) {
      const group = [];
      attacks.set(attack, group);
      groups.push(group);
    }
    attacks.get(attack).push(ship.id);
  }
  return publish(round, groups, winnerIds);
}

// The race engine keeps the same runner objects in both runners and order.
// Capture identity at launch, before finish sorting or duplicate nicknames.
export function beginRace(game, runners, ranked = rankingEnabled(game)) {
  if (game !== 'pet-race' && game !== 'wild-run-91') throw new Error('달리기 대회 정보가 필요합니다.');
  const ids = new Map(runners.map((runner, index) => [runner, index]));
  const entrants = runners.map((runner, id) => ({ id, name: runner.name }));
  const round = startDrawRound(game, ranked, entrants);
  let result;
  return function finishRace(order, target) {
    if (result) return result;
    if (!Number.isInteger(target) || target < 1 || target > entrants.length) {
      throw new Error('당첨 인원을 확인해주세요.');
    }
    const crossingOrder = order.map(runner => ids.get(runner));
    result = publish(round, crossingOrder.map(id => [id]), crossingOrder.slice(0, target));
    return result;
  };
}
