// The Korean Windows executable has separate virtual-key tables for each mode
// and player. Edit only the table that contains the F/H/B movement bindings.
export async function applyPuyoDuelKeys(bytes) {
  const archive = await globalThis.JSZip.loadAsync(bytes);
  const name = 'PUYO2W95.EXE';
  const executable = await archive.file(name).async('uint8array');
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', executable));
  const hash = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
  if (hash !== 'ef535b838bed7f4cd57ed58c8ac01b08e14e5785d2c716406582269ce5fc7b7a') {
    throw Error('뿌요뿌요 2 조작 설정과 게임 버전이 일치하지 않습니다.');
  }

  const table = new DataView(executable.buffer, executable.byteOffset + 0x33d90, 320 * 4);
  const keyOffset = key => key.charCodeAt(0) * 4;
  for (const [source, target] of [['F', 'A'], ['B', 'S'], ['H', 'D'], ['G', 'J']]) {
    table.setUint32(keyOffset(target), table.getUint32(keyOffset(source), true), true);
    if (source !== 'G') table.setUint32(keyOffset(source), 0, true);
  }
  archive.file(name, executable, {date: archive.file(name).date, createFolders: false});
  return archive.generateAsync({type: 'arraybuffer', compression: 'DEFLATE'});
}
