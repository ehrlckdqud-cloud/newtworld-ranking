import { nicknameKey } from './space-selection.js';

const games = new Set(['pinball', 'pond', 'space', 'wild-run-91', 'pet-race']);

export function checkDrawGame(game) {
  if (!games.has(game)) throw new Error('알 수 없는 추첨 게임입니다.');
}

function entryId(value) {
  if (Number.isSafeInteger(value)) return String(value);
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('참가자 ID가 필요합니다.');
}

// Create once at the start. Retries must use the same round ID and roster.
export function startDrawRound(game, ranked, entrants) {
  checkDrawGame(game);
  if (typeof ranked !== 'boolean') throw new Error('순위 반영 설정이 필요합니다.');
  if (!Array.isArray(entrants) || !entrants.length) throw new Error('참가 명단이 비어 있습니다.');
  const ids = new Set();
  const roster = entrants.map(({ id, name }) => {
    id = entryId(id);
    if (ids.has(id)) throw new Error('중복된 참가자 ID입니다.');
    if (typeof name !== 'string' || !nicknameKey(name)) throw new Error('닉네임이 필요합니다.');
    ids.add(id);
    return Object.freeze({ id, name: name.trim().normalize('NFC') });
  });
  return Object.freeze({ id: crypto.randomUUID(), game, ranked, roster: Object.freeze(roster) });
}

// Groups are best first. Entrants in one group occupy consecutive tied places.
export function scoreDrawRound(round, groups) {
  const count = round.roster.length;
  const remaining = new Map(round.roster.map(entry => [entry.id, entry]));
  const standings = [];
  const members = new Map();
  if (!Array.isArray(groups)) throw new Error('경기 결과가 필요합니다.');
  for (const group of groups) {
    if (!Array.isArray(group) || !group.length) throw new Error('빈 순위 그룹입니다.');
    const rank = standings.length + 1;
    // All awards in a round have the same denominator. Sum numerators first.
    const units = count === 1 ? 10 : 5 * (2 * (count - rank) - group.length + 1);
    const denominator = Math.max(1, count - 1);
    for (const id of group.map(entryId).sort()) {
      const entry = remaining.get(id);
      if (!entry) throw new Error('명단에 없거나 이미 집계한 참가자입니다.');
      remaining.delete(id);
      standings.push({ ...entry, rank, points: units / denominator });
      const key = nicknameKey(entry.name);
      const member = members.get(key) ?? { key, name: entry.name, count: 0, units: 0 };
      member.count++;
      member.units += units;
      members.set(key, member);
    }
  }
  if (remaining.size || !standings.length) throw new Error('종료 결과에 누락된 참가자가 있습니다.');
  const scores = Array.from(members.values(), member => ({
    key: member.key, name: member.name, entries: member.count,
    points: member.units / (member.count * Math.max(1, count - 1))
  }));
  return { standings, scores };
}
