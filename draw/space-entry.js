import {memberAccess,spaceAdmin} from './space-access.js';
import {NativeMedia,SpaceAudio} from './space-media.js';
const gate=document.getElementById('memberGate'),root=document.getElementById('nwspace'),status=document.getElementById('gateStatus'),retry=document.getElementById('gateRetry'),submit=document.getElementById('adminSubmit');
let game,checking=false,authorized=false,epoch=0,mediaJob;
function deny(message){epoch++;authorized=false;game?.pause();root.hidden=true;root.inert=true;document.body.classList.remove('space-authorized');gate.hidden=false;status.textContent=message||'관리자 인증이 필요해요.';}
async function permission(){const member=await memberAccess.check(true);if(!member.ok){status.textContent=member.error;return false;}if(!await spaceAdmin.check()){status.textContent=spaceAdmin.error;return false;}return true;}
async function enter(){if(checking)return;checking=true;retry.disabled=true;const attempt=epoch;try{if(!await permission()){deny(status.textContent);return;}status.textContent='원본 우주탈출과 복원 자산을 준비하고 있어요…';const media=await(mediaJob??=new NativeMedia().load());const {startOriginalSpace}=await import('./space-original.js?v=3.0');if(attempt!==epoch)return;if(!game)game=startOriginalSpace({media,nativeAudio:new SpaceAudio(media),access:permission,onDenied:()=>deny(status.textContent)});authorized=true;gate.hidden=true;root.hidden=false;root.inert=false;document.body.classList.add('space-authorized');window.dispatchEvent(new Event('resize'));}catch(e){mediaJob=null;deny(e.message||'게임을 불러오지 못했어요.');}finally{checking=false;retry.disabled=false;}}
document.getElementById('adminLogin').onsubmit=async event=>{event.preventDefault();if(checking)return;submit.disabled=true;let password=document.getElementById('adminPassword').value;document.getElementById('adminPassword').value='';try{if(await spaceAdmin.login(password))await enter();else deny(spaceAdmin.error);}finally{password='';submit.disabled=false;}};
retry.onclick=enter;
window.addEventListener('storage',event=>{if(event.key===null||['nwProfileToken','nwProfileDevice'].includes(event.key)){spaceAdmin.clear();deny('회원 인증이 변경됐어요. 다시 인증해주세요.');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)game?.pause();else if(authorized)enter();});
window.addEventListener('pageshow',event=>{if(event.persisted){spaceAdmin.clear();deny('관리자 인증을 다시 확인해주세요.');}});
setInterval(async()=>{if(!authorized||checking)return;if(!await permission())deny(status.textContent);},30000);
enter();
