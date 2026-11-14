import {installSpaceGuide} from './space-guide.js?v=62.8';
import {initSpaceLayout} from './space-layout.js?v=62.0';
import {SpaceMission} from './space-mission.js?v=member-games-1';
import {memberAccess} from './space-access.js';
import {NativeMedia,SpaceAudio} from './space-media.js?v=mobile-flight-1';
const gate=document.getElementById('memberGate'),root=document.getElementById('nwspace'),status=document.getElementById('gateStatus'),retry=document.getElementById('gateRetry');
initSpaceLayout();
let game,checking=false,authorized=false,epoch=0,mediaJob,missionJob;
function deny(message){document.getElementById('spGuideDialog')?.close();epoch++;authorized=false;game?.pause();root.hidden=true;root.inert=true;document.body.classList.remove('space-authorized');gate.hidden=false;status.textContent=message||'회원식별이 필요해요.';}
async function permission(){if(authorized)return true;const member=await memberAccess.check(true);if(!member.ok){status.textContent=member.error;return false;}return true;}
async function enter(){if(checking)return;checking=true;retry.disabled=true;const attempt=epoch;try{if(!await permission()){deny(status.textContent);return;}status.textContent='원본 우주대탈출과 복원 자산을 준비하고 있어요…';const [media,mission]=await Promise.all([mediaJob??=new NativeMedia().load(),missionJob??=new SpaceMission().load()]);const {startOriginalSpace}=await import('./space-original.js?v=mobile-flight-1');if(attempt!==epoch)return;if(!game)game=startOriginalSpace({media,mission,nativeAudio:new SpaceAudio(media),access:permission,startAccess:()=>window.NWContent?.start('space'),onDenied:()=>deny(status.textContent)});installSpaceGuide(media);authorized=true;gate.hidden=true;root.hidden=false;root.inert=false;document.body.classList.add('space-authorized');window.dispatchEvent(new Event('resize'));}catch(e){mediaJob=null;missionJob=null;deny(e.message||'게임을 불러오지 못했어요.');}finally{checking=false;retry.disabled=false;}}
retry.onclick=enter;
window.addEventListener('storage',event=>{if(event.key===null||['nwProfileToken','nwProfileDevice'].includes(event.key)){deny('회원 인증이 변경됐어요. 다시 인증해주세요.');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)game?.pause();else if(authorized){game?.resumeWaiting();window.dispatchEvent(new Event('resize'));}});
window.addEventListener('pageshow',event=>{if(event.persisted&&authorized){game?.resumeWaiting();window.dispatchEvent(new Event('resize'));}});
// Once entry has been verified, retain permission for this page session.
// Explicit member credential changes still invalidate the session above.
enter();
