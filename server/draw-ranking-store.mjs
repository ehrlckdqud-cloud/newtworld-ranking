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
             json_extract(s.value, '$.points') AS points
      FROM draw_ranking_rounds AS r, json_each(r.scores) AS s
      WHERE r.game = ?
    ), totals AS (
      SELECT member, nickname, finished_at, ROW_NUMBER() OVER (
               PARTITION BY member ORDER BY finished_at DESC, round_id DESC
             ) AS latest,
             COUNT(*) OVER by_member AS rounds,
             SUM(entrants) OVER by_member AS entries,
             SUM(points) OVER by_member AS points
      FROM entries
      WINDOW by_member AS (PARTITION BY member)
    )
    SELECT RANK() OVER (ORDER BY round(points, 10) DESC) AS rank, nickname,
           finished_at AS lastPlayedAt, rounds, entries, points
    FROM totals WHERE latest = 1
    ORDER BY rank, member
  `).bind(game).all();
  return results;
}
