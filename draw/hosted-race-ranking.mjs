import { mountDrawRanking } from './draw-ranking-ui.mjs?v=hosted-race-254';
import { startDrawRound, scoreDrawRound } from './draw-ranking.mjs';

// The hosted race engine retains the object returned by NWDrawRanks.mount.
// Replace that object's public callbacks so the engine keeps its finish timing.
export function connectHostedRace(shortName) {
  const game = {wild:'wild-run-91',pets:'pet-race'}[shortName];
  if (!game || !document.querySelector('#dlg #db') || !document.querySelector('#winners')) return false;
  const legacyBoard = document.querySelector('dialog.ndr-ranking[data-ndr="'+shortName+'"]');
  const oldButton = document.querySelector('button.ndr-opener');
  const oldField = document.querySelector('label.ndr-setting:not([data-layout])');
  if (!legacyBoard || !oldButton || !oldField || !window.NWDrawRanks) return false;
  const previous = window.NWDrawRanks.mount(shortName,{});
  const selectBefore = oldField.querySelector('select');
  if (!selectBefore || !previous) return false;
  try {
    const key = 'nw-draw-ranked:'+game;
    if (localStorage.getItem(key) === null) localStorage.setItem(key,selectBefore.value);
  } catch {}
  const ui = mountDrawRanking(game);
  if (!ui) return false;
  let active = previous.active, ranked = selectBefore.value !== 'off';
  ui.select.disabled = active;
  function reset() {
    active = false;
    ui.select.disabled = false;
    ui.resetRace();
  }
  function begin() {
    reset();
    active = true;
    ranked = ui.select.value === 'on';
    ui.select.disabled = true;
  }
  function finish(entries,{show=true}={}) {
    if (!active || !entries.length) return;
    const rows = [...entries].sort((a,b)=>a.order-b.order);
    const round = startDrawRound(game,ranked,rows.map(({name},id)=>({name,id})));
    const groups = [], winnerIds = [];
    rows.forEach((entry,i)=>{
      if (!i || entry.order !== rows[i-1].order) groups.push([]);
      const id = round.roster[i].id;
      groups[groups.length-1].push(id);
      if (entry.won) winnerIds.push(id);
    });
    const detail = { round,groups,winnerIds,finishedAt:new Date().toISOString(),...scoreDrawRound(round,groups) };
    active = false;
    ui.select.disabled = false;
    window.dispatchEvent(new CustomEvent('nw-draw-result',{detail}));
    if (show) ui.showRaceResult();
  }
  Object.assign(previous,{begin,finish,reset,showResult:ui.showRaceResult,
    styleNative:dialog=>dialog?.open && ui.showRaceResult()});
  Object.defineProperty(previous,'active',{configurable:true,get:()=>active});
  oldButton.remove();
  oldField.remove();
  if (legacyBoard.open) {legacyBoard.close();document.querySelector('[data-ndr-trigger]').click();}
  return true;
}
