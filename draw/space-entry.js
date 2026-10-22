import {SpaceMission} from './space-mission.js?v=12.0';
import {memberAccess,spaceAdmin} from './space-access.js';
import {NativeMedia,SpaceAudio} from './space-media.js?v=12.0';
const gate=document.getElementById('memberGate'),root=document.getElementById('nwspace'),status=document.getElementById('gateStatus'),retry=document.getElementById('gateRetry'),submit=document.getElementById('adminSubmit');
let game,checking=false,authorized=false,epoch=0,mediaJob,missionJob;
function deny(message){epoch++;authorized=false;game?.pause();root.hidden=true;root.inert=true;document.body.classList.remove('space-authorized');gate.hidden=false;status.textContent=message||'관리자 인증이 필요해요.';}
async function permission(){if(authorized)return true;const member=await memberAccess.check(true);if(!member.ok){status.textContent=member.error;return false;}if(!await spaceAdmin.check()){status.textContent=spaceAdmin.error;return false;}return true;}
async function enter(){if(checking)return;checking=true;retry.disabled=true;const attempt=epoch;try{if(!await permission()){deny(status.textContent);return;}status.textContent='원본 우주탈출과 복원 자산을 준비하고 있어요…';const [media,mission]=await Promise.all([mediaJob??=new NativeMedia().load(),missionJob??=new SpaceMission().load()]);const {startOriginalSpace}=await import('./space-original.js?v=12.0');if(attempt!==epoch)return;if(!game)game=startOriginalSpace({media,mission,nativeAudio:new SpaceAudio(media),access:permission,onDenied:()=>deny(status.textContent)});authorized=true;gate.hidden=true;root.hidden=false;root.inert=false;document.body.classList.add('space-authorized');window.dispatchEvent(new Event('resize'));}catch(e){mediaJob=null;missionJob=null;deny(e.message||'게임을 불러오지 못했어요.');}finally{checking=false;retry.disabled=false;}}
document.getElementById('adminLogin').onsubmit=async event=>{event.preventDefault();if(checking)return;submit.disabled=true;let password=document.getElementById('adminPassword').value;document.getElementById('adminPassword').value='';try{if(await spaceAdmin.login(password))await enter();else deny(spaceAdmin.error);}finally{password='';submit.disabled=false;}};
retry.onclick=enter;
window.addEventListener('storage',event=>{if(event.key===null||['nwProfileToken','nwProfileDevice'].includes(event.key)){spaceAdmin.clear();deny('회원 인증이 변경됐어요. 다시 인증해주세요.');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)game?.pause();else if(authorized)window.dispatchEvent(new Event('resize'));});
window.addEventListener('pageshow',event=>{if(event.persisted&&authorized)window.dispatchEvent(new Event('resize'));});
// Once entry has been verified, retain permission for this page session.
// Explicit member credential changes still invalidate the session above.
enter();
