let active;

export function hideGamePreview() {
  if (!active) return;
  active.events.abort();
  active.image.remove();
  active = null;
}

function showGamePreview(card, game, name) {
  if (active?.card === card) return;
  hideGamePreview();
  const image = new Image();
  const events = new AbortController();
  active = {card, image, events};
  image.className = 'arcade-game-preview';
  image.alt = name + ' 게임 화면';
  image.hidden = true;

  function position() {
    if (!image.naturalWidth) return;
    const rect = card.getBoundingClientRect();
    const gap = 8;
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    if (rect.bottom <= 0 || rect.top >= height) return hideGamePreview();
    const above = rect.top - gap * 2;
    const below = height - rect.bottom - gap * 2;
    const useAbove = above >= 100 || above >= below;
    image.style.maxHeight = Math.max(1, Math.min(300, useAbove ? above : below)) + 'px';
    image.hidden = false;
    const left = rect.left + (rect.width - image.offsetWidth) / 2;
    image.style.left = Math.max(gap, Math.min(left, width - gap - image.offsetWidth)) + 'px';
    image.style.top = (useAbove ? rect.top - gap - image.offsetHeight : rect.bottom + gap) + 'px';
  }

  const options = {signal: events.signal};
  image.addEventListener('load', position, options);
  image.addEventListener('error', hideGamePreview, options);
  window.addEventListener('resize', position, options);
  window.addEventListener('scroll', position, {...options, capture: true});
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') hideGamePreview();
  }, options);
  document.body.append(image);
  image.src = new URL('./previews/' + game + '.webp', import.meta.url).href;
}

export function attachGamePreview(card, game, name) {
  card.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'touch') showGamePreview(card, game, name);
  });
  card.addEventListener('pointerleave', () => {
    if (active?.card === card) hideGamePreview();
  });
  card.addEventListener('focus', () => {
    if (card.matches(':focus-visible')) showGamePreview(card, game, name);
  });
  card.addEventListener('blur', () => {
    if (active?.card === card) hideGamePreview();
  });
}
