import { nicknameKey } from './space-selection.js';

let database;
function openDatabase() {
  if (!database) {
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open('nw-draw-rankings', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('players', { keyPath: ['game', 'key'] });
        request.result.createObjectStore('rounds', { keyPath: ['game', 'id'] });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); database = undefined; };
        resolve(db);
      };
      request.onerror = () => reject(request.error);
    }).catch(error => { database = undefined; throw error; });
  }
  return database;
}

async function transact(stores, mode, work) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(tx.error || new Error('브라우저에 기록을 저장하지 못했습니다.'));
    work(tx, value => { result = value; });
  });
}

const gameRange = game => IDBKeyRange.bound([game], [game, []]);

export async function saveBrowserResult(result) {
  const { round, finishedAt, scores, standings } = result;
  if (!round.ranked) return;
  const winners = new Set(result.winnerIds.map(String));
  const revived = new Set((result.revivedWinnerIds || []).map(String));
  const stats = new Map();
  for (const entry of standings) {
    const key = nicknameKey(entry.name);
    const id = String(entry.id);
    const counter = stats.get(key) || { win: false, first: false, revived: false };
    counter.win ||= winners.has(id);
    counter.first ||= entry.rank === 1;
    counter.revived ||= revived.has(id);
    stats.set(key, counter);
  }
  return transact(['rounds', 'players'], 'readwrite', tx => {
    const rounds = tx.objectStore('rounds');
    const players = tx.objectStore('players');
    const seen = rounds.get([round.game, round.id]);
    seen.onsuccess = () => {
      if (seen.result) return;
      rounds.add({game: round.game, id: round.id});
      for (const score of scores) {
        const { win, first, revived: wonAfterRevival } = stats.get(score.key);
        const read = players.get([round.game, score.key]);
        read.onsuccess = () => {
          const row = read.result || { game: round.game, key: score.key, rounds: 0, entries: 0, points: 0, statA: 0, statB: 0 };
          if (!row.lastPlayedAt || row.lastPlayedAt <= finishedAt) {
            row.lastPlayedAt = finishedAt;
            row.nickname = score.name;
          }
          row.rounds++;
          row.entries += score.entries;
          row.points += score.points;
          if (round.game === 'pinball') {
            row.statA += Number(win && result.mode === 'first');
            row.statB += Number(win && result.mode === 'last');
          } else if (round.game === 'pond') {
            row.statA += Number(win);
            row.statB += Number(wonAfterRevival);
          } else if (round.game === 'space') {
            row.statA += Number(win);
            row.statB++;
          } else {
            row.statA += Number(first);
            row.statB += Number(win);
          }
          players.put(row);
        };
      }
    };
  });
}

export async function readBrowserBoard(game) {
  const rows = await transact(['players'], 'readonly', (tx, done) => {
    const request = tx.objectStore('players').getAll(gameRange(game));
    request.onsuccess = () => done(request.result);
  });
  const orderPoints = row => Math.round(row.points * 1e10);
  rows.sort((a,b) => orderPoints(b) - orderPoints(a) || a.key.localeCompare(b.key, 'ko'));
  for (let i=0; i<rows.length; i++) {
    rows[i].rank = i && orderPoints(rows[i]) === orderPoints(rows[i-1]) ? rows[i-1].rank : i+1;
  }
  return rows;
}

// Keep round receipts so retrying an already saved round cannot restore deleted scores.
export function deleteBrowserRows(game, keys) {
  return transact(['players'], 'readwrite', tx => {
    const players = tx.objectStore('players');
    if (keys === null) players.delete(gameRange(game));
    else for (const key of keys) players.delete([game, key]);
  });
}
