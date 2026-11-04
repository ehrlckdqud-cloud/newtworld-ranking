// Delegate to each game's existing pause button so music/timers pause together.
export function installPauseShortcut(button, doc = document) {
  if (!button) return;
  const label = () => {
    const text = button.textContent.replace(/\s*\(Space\)\s*$/, '').trim().replace('계속 비행', '계속하기');
    if (text === '일시정지' || text === '계속하기') {
      const next = `${text} (Space)`;
      if (button.textContent !== next) button.textContent = next;
    }
  };
  label();
  button.setAttribute('aria-keyshortcuts', 'Space');
  const observer = new MutationObserver(label);
  observer.observe(button, {childList:true, characterData:true, subtree:true});
  let held = false;
  const down = event => {
    if (event.code !== 'Space' && event.key !== ' ') return;
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (target?.isContentEditable || target?.closest?.('input,textarea,select,[role="textbox"]')) return;
    if (target !== button && target?.closest?.('button,a,[role="button"]')) return;
    if (doc.querySelector('dialog[open],[aria-modal="true"]')) return;
    if (button.disabled || button.closest('[hidden],[inert]') || !button.getClientRects().length) return;
    event.preventDefault();
    if (event.repeat || held) return;
    held = true;
    button.click();
  };
  const up = event => {
    if ((event.code === 'Space' || event.key === ' ') && held) {
      event.preventDefault(); // Avoid a second native click on a focused pause button.
      held = false;
    }
  };
  const blur = () => { held = false; };
  doc.addEventListener('keydown', down);
  doc.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  return () => {observer.disconnect();doc.removeEventListener('keydown',down);doc.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};
}
installPauseShortcut(document.querySelector('#pause,#pondPause,#sppause'));
