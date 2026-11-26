// Both legacy and current game bundles read the same music catalogue.
export function isPondGame() {
  return Boolean(globalThis.document?.getElementById('pondCanvas'));
}
export function visibleMusicTracks(tracks, pond = isPondGame()) {
  if (pond) return tracks;
  return tracks.filter(track => !['newtworld-pond-waiting-20261115','newtworld-pond-game-20261115'].includes(track.id)
    && !['신비로운 생존연못','연못의 긴박한 생존 추격전'].includes((track.name || '').normalize('NFC').replace(/\.(mp3|m4a|wav|ogg)$/i,'').replace(/\s*\(\d+\)$/,'').trim()));
}
export function musicSettingsKey() { return isPondGame() ? 'pond-config' : 'config'; }
