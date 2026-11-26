import { nicknameKey } from '../draw/space-selection.js';

function gameRecords(game, standings) {
  const totals = new Map();
  for (const entry of standings) {
    const key = nicknameKey(entry.name);
    const previous = totals.get(key) ?? [0, 0];
    const won = typeof entry.winner === 'boolean' ? Number(entry.winner) : null;
    let values;
    if (game === 'pinball') {
      values = entry.mode ? [entry.mode === 'first' ? won : 0, entry.mode === 'last' ? won : 0] : [null,null];
    } else if (game === 'pond') {
      values = [won, typeof entry.revivedWinner === 'boolean' ? Number(entry.revivedWinner) : null];
    } else if (game === 'space') {
      values = [won,1];
    } else {
      values = [Number(entry.rank === 1),won];
    }
    totals.set(key,values.map((value,i)=>value === null || previous[i] === null ? null : Math.max(value,previous[i])));
  }
  return totals;
}
import { checkDrawGame, scoreDrawRound } from '../draw/draw-ranking.mjs';

// Call from the game server after it has authorized a completed round.
// The caller keeps finishedAt with the result so an offline retry retains its date.
export async function recordDrawRound(db, round, groups, finishedAt, outcome) {
  checkDrawGame(round.game);
  if (!round.id || typeof round.ranked !== 'boolean') throw new Error('경기 정보가 필요합니다.');
  const result = scoreDrawRound(round, groups);
  if (outcome) {
    const winners = new Set(outcome.winnerIds.map(String));
    const revived = new Set((outcome.revivedWinnerIds ?? []).map(String));
    const ids = new Set(result.standings.map(entry => entry.id));
    if ([...winners].some(id => !ids.has(id)) || [...revived].some(id => !winners.has(id))) {
      throw new Error('당첨 명단이 경기 결과와 일치하지 않습니다.');
    }
    if (round.game === 'pinball' && !['first', 'last'].includes(outcome.mode)) {
      throw new Error('핀볼 당첨 모드가 필요합니다.');
    }
    for (const entry of result.standings) {
      entry.winner = winners.has(entry.id);
      if (round.game === 'pond') entry.revivedWinner = revived.has(entry.id);
      if (round.game === 'pinball') entry.mode = outcome.mode;
    }
  }
  const records = gameRecords(round.game,result.standings);
  for (const row of result.scores) [row.statA,row.statB]=records.get(row.key);
  if (!round.ranked) return { ...result, recorded: false };
  const end = new Date(finishedAt);
  if (typeof finishedAt !== 'string' || !Number.isFinite(end.getTime())) {
    throw new Error('경기 종료 시각이 필요합니다.');
  }
  // One immutable result for all entrants. An identical retry returns the first
  // timestamp; a different result with this ID returns no row.
  const saved = await db.prepare(`
    INSERT INTO draw_ranking_rounds (game, round_id, finished_at, standings, scores)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (game, round_id) DO UPDATE SET round_id = excluded.round_id
    WHERE draw_ranking_rounds.standings = excluded.standings
    RETURNING finished_at
  `).bind(round.game, round.id, end.toISOString(), JSON.stringify(result.standings),
    JSON.stringify(result.scores)).first();
  if (!saved) throw new Error('같은 경기 ID에 다른 결과가 이미 저장되어 있습니다.');
  return { ...result, recorded: true, finishedAt: saved.finished_at };
}

export async function readDrawLeaderboard(db, game) {
  checkDrawGame(game);
  const { results } = await db.prepare(`
    WITH entries AS (
      SELECT r.round_id, r.finished_at,
             json_extract(s.value, '$.key') AS member,
             json_extract(s.value, '$.name') AS nickname,
             json_extract(s.value, '$.entries') AS entrants,
             json_extract(s.value, '$.points') AS points,
             json_extract(s.value, '$.statA') AS statA, json_extract(s.value, '$.statB') AS statB,
             json_type(s.value, '$.statA') IS NULL AS legacy,
             json_type(s.value, '$.statA') = 'null' AS unknownA, json_type(s.value, '$.statB') = 'null' AS unknownB
      FROM draw_ranking_rounds AS r, json_each(r.scores) AS s
      WHERE r.game = ?
    ), totals AS (
      SELECT member, nickname, finished_at, ROW_NUMBER() OVER (
               PARTITION BY member ORDER BY finished_at DESC, round_id DESC
             ) AS latest,
             COUNT(*) OVER by_member AS rounds,
             SUM(entrants) OVER by_member AS entries,
             SUM(points) OVER by_member AS points,
             SUM(statA) OVER by_member AS countA, SUM(statB) OVER by_member AS countB,
             MAX(legacy) OVER by_member AS legacy, MAX(unknownA) OVER by_member AS unknownA,
             MAX(unknownB) OVER by_member AS unknownB
      FROM entries
      WINDOW by_member AS (PARTITION BY member)
    )
    SELECT RANK() OVER (ORDER BY round(points, 10) DESC) AS rank, nickname,
           finished_at AS lastPlayedAt, rounds, entries, points, legacy,
           CASE WHEN unknownA THEN NULL ELSE coalesce(countA,0) END AS statA,
           CASE WHEN unknownB THEN NULL ELSE coalesce(countB,0) END AS statB
    FROM totals WHERE latest = 1
    ORDER BY rank, member
  `).bind(game).all();
  if (results.some(row=>row.legacy)) {
    const byKey=new Map(results.map(row=>[nicknameKey(row.nickname),row]));
    // Earlier rounds kept all placements before per-round counters were added.
    let cursor = '';
    for (;;) {
      const page = await db.prepare(`
        SELECT round_id, standings FROM draw_ranking_rounds WHERE game=? AND round_id>?
        AND json_type(scores,'$[0].statA') IS NULL ORDER BY round_id LIMIT 25
      `).bind(game,cursor).all();
      for (const saved of page.results) {
        for (const [key,counts] of gameRecords(game,JSON.parse(saved.standings))) {
          const row=byKey.get(key);
          if (!row) continue;
          for (const [i,field] of ['statA','statB'].entries()) {
            row[field]=row[field]===null || counts[i]===null ? null : row[field]+counts[i];
          }
        }
        cursor=saved.round_id;
      }
      if (page.results.length<25) break;
    }
  }
  return results.map(({legacy,...row})=>row);
}
