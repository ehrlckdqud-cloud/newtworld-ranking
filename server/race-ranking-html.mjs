// Apply to the final authenticated game HTML after the pet/terrain edits.
// moduleUrl must resolve to the shared draw-game-results.mjs in that release.
export function addRaceRanking(html, game, moduleUrl) {
  if (!['wild-run-91', 'pet-race'].includes(game)) throw new Error('Unknown race');
  const anchor = 'function refresh(){';
  if (html.includes('/* nw-draw-race-ranking */')) return html;
  if (html.split(anchor).length !== 2 ||
      !/order\s*=\s*arrivals\.concat\(/.test(html) ||
      !/arrivals\.length\s*===\s*runners\.length/.test(html)) {
    throw new Error('Race finish template has changed');
  }
  const literal = value => JSON.stringify(value).replace(/</g, '\\u003c');
  const hook = `/* nw-draw-race-ranking */
    if (state === 'ready') refresh.drawRace = null;
    if ((state === 'count' || state === 'run') && !refresh.drawRace) {
      const roster = runners.slice();
      let ranked = true;
      try { ranked = localStorage.getItem('nw-draw-ranked:' + ${literal(game)}) !== 'off'; } catch {}
      const pending = import(${literal(moduleUrl)}).then(api => api.beginRace(${literal(game)}, roster, ranked));
      refresh.drawRace = { pending, done: false };
      pending.catch(error => window.dispatchEvent(new CustomEvent('nw-draw-ranking-error', { detail: String(error) })));
    }
    if (state === 'done' && refresh.drawRace && !refresh.drawRace.done) {
      refresh.drawRace.done = true;
      const finalOrder = order.slice(), places = target;
      refresh.drawRace.pending.then(finish => finish(finalOrder, places), () => {})
        .catch(error => window.dispatchEvent(new CustomEvent('nw-draw-ranking-error', { detail: String(error) })));
    }
  `;
  const result = html.replace(anchor, () => anchor + hook);
  // Source-only snippets are also used by the engine tests.
  if (!/<html[\s>]|<!doctype html/i.test(result)) return result;
  const ui = moduleUrl.replace(/[^/?#]+(?:[?#].*)?$/, 'draw-ranking-ui.mjs');
  const src = ui.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const script = '<script type="module" data-draw-ranking-game="' + game + '" src="' + src + '"></script>';
  return /<\/body>/i.test(result) ? result.replace(/<\/body>/i, () => script + '</body>') : result + script;
}
