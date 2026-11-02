const manifestURL = new URL('./game-defaults/manifest.json', import.meta.url);

function openDatabase(spec) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(spec.name, spec.version);
    request.onupgradeneeded = () => {
      for (const store of spec.stores) {
        if (!request.result.objectStoreNames.contains(store.name)) {
          request.result.createObjectStore(store.name, store.keyPath === null ? undefined : {keyPath: store.keyPath});
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(Error('다른 게임 탭을 닫고 다시 시도해주세요.'));
  });
}

// A single transaction checks every store again before writing. Existing personal
// settings, including an intentionally empty playlist, are never overwritten.
function ifEmpty(db, spec, rows) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(spec.stores.map(s => s.name), rows ? 'readwrite' : 'readonly');
    let pending = spec.stores.length, empty = true;
    for (const store of spec.stores) {
      const request = tx.objectStore(store.name).count();
      request.onsuccess = () => {
        empty = empty && request.result === 0;
        if (--pending === 0 && empty && rows) {
          for (let i = 0; i < spec.stores.length; i++) {
            const target = tx.objectStore(spec.stores[i].name);
            rows[i].forEach((value, j) => {
              if (target.keyPath === null) target.put(value, spec.stores[i].keys[j]);
              else target.put(value);
            });
          }
        }
      };
    }
    tx.oncomplete = () => resolve(empty);
    tx.onabort = tx.onerror = () => reject(tx.error || Error('공통 설정을 저장하지 못했어요.'));
  });
}

async function restore(value) {
  if (value?.__type === 'Asset') {
    const response = await fetch(new URL(value.path, manifestURL));
    if (!response.ok) throw Error('공통 이미지를 불러오지 못했어요.');
    const bytes = await response.arrayBuffer();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
    if (bytes.byteLength !== value.bytes || hash !== value.sha256) throw Error('공통 이미지 검증에 실패했어요.');
    return new Blob([bytes], {type: value.mime});
  }
  if (Array.isArray(value)) return Promise.all(value.map(restore));
  if (value && typeof value === 'object') {
    return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await restore(item)])));
  }
  return value;
}

export async function installGameDefaults({musicAndVisuals = true} = {}) {
  const response = await fetch(manifestURL);
  if (!response.ok) throw Error('공통 게임 설정을 불러오지 못했어요.');
  const manifest = await response.json();
  if (manifest.format !== 'newtworld-game-defaults' || manifest.version !== 1) throw Error('공통 설정 형식을 확인해주세요.');
  if (musicAndVisuals) for (const spec of manifest.databases) {
    const db = await openDatabase(spec);
    try {
      if (!await ifEmpty(db, spec)) continue;
      const rows = await Promise.all(spec.stores.map(store => Promise.all(store.values.map(value => {
        // Stream only selected songs; don't download 90 MB before showing a game.
        if (store.name === 'tracks' && value.blob?.__type === 'Asset') {
          const {blob, ...track} = value;
          return {...track, url: new URL(blob.path, manifestURL).href};
        }
        return restore(value);
      }))));
      await ifEmpty(db, spec, rows);
    } finally { db.close(); }
  }
  const preference = 'nw-space-music-v52';
  if (localStorage.getItem(preference) === null && manifest.preferences[preference]) {
    localStorage.setItem(preference, manifest.preferences[preference]);
  }
}
