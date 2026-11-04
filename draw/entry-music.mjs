// Try audible music on entry; browser autoplay restrictions require a gesture.
export function startEntryMusic(music, target = document) {
  const retry = event => {
    if (event.target?.closest?.('#musicPower')) return;
    if (music.autoplayPending && music.config.enabled && music.phase === 'waiting') music.enable();
  };
  target.addEventListener('pointerdown', retry, {passive:true});
  target.addEventListener('keydown', retry);
  window.addEventListener('pagehide', () => {
    target.removeEventListener('pointerdown', retry);
    target.removeEventListener('keydown', retry);
  }, {once:true});
  music.enable();
}
