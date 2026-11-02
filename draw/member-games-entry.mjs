import {installGameDefaults} from '../assets/game-defaults.mjs?v=member-games-1';

const pond = location.pathname.endsWith('/pond.html');
const space = location.pathname.endsWith('/space.html');
const status = document.getElementById(pond ? 'pondGateStatus' : space ? 'gateStatus' : 'memberGateStatus');
const retry = document.getElementById(pond ? 'pondGateRetry' : space ? 'gateRetry' : 'memberGateRetry');
async function start() {
  retry.disabled = true;
  status.textContent = '공통 게임 설정을 준비하고 있어요…';
  try {
    await installGameDefaults({musicAndVisuals: !space});
    retry.onclick = null;
    if (pond) await import('./pond.952deb0f.js?v=member-games-1');
    else if (space) await import('./space-entry.js?v=member-games-1');
    else await import('./newtworld-v326-source.1f601452.js?v=member-games-1');
  } catch (error) {
    status.textContent = error.message || '게임 설정을 준비하지 못했어요. 다시 시도해주세요.';
    retry.disabled = false;
    retry.onclick = start;
  }
}
start();
