const originalPath = new TextEncoder().encode('/roms/mslug3fd.zip\0');
const paths = {mslug: '/roms/xx/mslug.zip', mslug2: '/roms/x/mslug2.zip'};

// The shared host opens a fixed-length path. Select the original game's driver
// without modifying either game's ROM or the shared WebAssembly asset.
export function selectMetalSlug(core, game = 'mslug2') {
  const offset = core.findIndex((byte, i) => byte === originalPath[0] &&
    originalPath.every((value, j) => core[i + j] === value));
  if (offset < 0) throw Error('메탈슬러그 구동기 버전을 확인해주세요.');
  core.set(new TextEncoder().encode(paths[game]), offset);
  return core;
}

export async function mountMetalSlug(core, bytes, game = 'mslug2') {
  const archive = await window.JSZip.loadAsync(bytes);
  const [rom, bios] = await Promise.all([game + '.zip', 'neogeo.zip'].map(name =>
    archive.file(name).async('uint8array')));
  const gamePath = paths[game];
  const romDirectory = gamePath.slice(0, gamePath.lastIndexOf('/'));
  core.FS.mkdirTree(romDirectory);
  core.FS.mkdirTree('/system/fbneo/patched');
  core.FS.writeFile(gamePath, rom);
  core.FS.writeFile(romDirectory + '/neogeo.zip', bios);
  core.FS.writeFile('/system/fbneo/patched/neogeo.zip', bios);
}

// Earlier lobby versions still import these names.
export {selectMetalSlug as selectMetalSlug2, mountMetalSlug as mountMetalSlug2};
