const API='https://newtworld-ms3-coop-5p.pluckypeach517.chatgpt.site';
let token='',connection='',active=false,timer=null,member=null;
export const DUPLICATE_MESSAGE='이미 다른 브라우저에서 이 회원으로 접속 중입니다. 기존 브라우저에서 게임사이트를 종료한 뒤 다시 입장해주세요. 비정상 종료 시에는 최대 90초 후 다시 시도할 수 있습니다.';
export const siteHeaders=()=>token?{'X-NW-Site-Session':token,'X-NW-Site-Connection':connection}:{};
export function blockSite(message){active=false;clearInterval(timer);for(const d of document.querySelectorAll('dialog[open]'))d.close();document.getElementById('channelView').hidden=true;document.getElementById('roomView').hidden=true;document.getElementById('status').textContent=message;document.body.classList.remove('in-game','expanded-view');window.dispatchEvent(new Event('nw-site-blocked'));}
async function send(action,extra={}){const r=await fetch(API+'/api/site-session',{method:'POST',headers:{'content-type':'application/json',...siteHeaders()},body:JSON.stringify({action,...extra}),signal:AbortSignal.timeout(15000)});const d=await r.json();if(!r.ok)throw Error(d.error);return d;}
async function renew(){if(!active)return;try{await send('renew');}catch(e){if(['SITE_SESSION_EXPIRED','SITE_SESSION_REQUIRED','MEMBER_ALREADY_ONLINE'].includes(e.message))blockSite('접속이 종료되었습니다. 기존 접속 상태를 확인하고 새로고침해주세요.');}}
export async function claimSiteSession(credentials){member=credentials;token=sessionStorage.getItem('nwCoopSiteSession')||crypto.randomUUID();sessionStorage.setItem('nwCoopSiteSession',token);connection=crypto.randomUUID();await send('claim',{member});active=true;timer=setInterval(renew,20000);}
window.addEventListener('pagehide',()=>{if(!active)return;active=false;clearInterval(timer);fetch(API+'/api/site-session',{method:'POST',headers:{'content-type':'application/json',...siteHeaders()},body:JSON.stringify({action:'release'}),keepalive:true}).catch(()=>{});});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)renew();});
