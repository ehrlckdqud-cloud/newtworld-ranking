const originalPath = new TextEncoder().encode('/roms/mslug3fd.zip\0');
const gamePath = '/roms/x/mslug2.zip';

// The shared host opens a fixed-length path. Select the original game's driver
// without modifying either game's ROM or the shared WebAssembly asset.
export function selectMetalSlug2(core) {
  const offset = core.findIndex((byte, i) => byte === originalPath[0] &&
    originalPath.every((value, j) => core[i + j] === value));
  if (offset < 0) throw Error('메탈슬러그 2 구동기 버전을 확인해주세요.');
  core.set(new TextEncoder().encode(gamePath), offset);
  return core;
}

export async function mountMetalSlug2(core, bytes) {
  const archive = await window.JSZip.loadAsync(bytes);
  const [game, bios] = await Promise.all(['mslug2.zip', 'neogeo.zip'].map(name =>
    archive.file(name).async('uint8array')));
  core.FS.mkdirTree('/roms/x');
  core.FS.mkdirTree('/system/fbneo/patched');
  core.FS.writeFile(gamePath, game);
  core.FS.writeFile('/roms/x/neogeo.zip', bios);
  core.FS.writeFile('/system/fbneo/patched/neogeo.zip', bios);
}
