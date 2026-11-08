import {claimGameTab} from './tab-owner.mjs?v=1';
import {initRankings} from './rankings.mjs?v=98';
import {claimSiteSession,blockSite} from './site-session.mjs?v=98';
import {lobbyAudio} from './lobby-audio.mjs?v=98';
import {initLobby} from './lobby.mjs?v=dot2';
const mobile=/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
if(mobile){document.getElementById('appShell').hidden=true;document.getElementById('pcOnly').hidden=false;}
const form=document.getElementById('joinForm');
for(const element of form.elements)element.disabled=true;
const token=localStorage.getItem('nwProfileToken'),device=localStorage.getItem('nwProfileDevice');
const status=document.getElementById('status');
let stage='회원 확인';
try{
 if(mobile)throw Error('PC_ONLY');
 if(!token||!device)throw Error('auth');
 const response=await new Promise((resolve,reject)=>{
  const script=document.createElement('script'),callback='nwCoopMemberCheck';
  const cleanup=()=>{clearTimeout(timer);script.remove();delete window[callback];};
  const timer=setTimeout(()=>{cleanup();reject(Error('timeout'));},15000);
  window[callback]=data=>{cleanup();resolve(data);};script.onerror=()=>{cleanup();reject(Error('network'));};
  script.src='https://script.google.com/macros/s/AKfycbx3ksT0dBFpJELZPolxhi2GsrzHEMdkrd4xqerH33IdeImOPWsXV4BKDLAxEb2XliD-eg/exec?'+new URLSearchParams({action:'profileData',token,device,callback});document.head.append(script);
 });
 if(response?.auth===false)throw Error('auth');
 if(!response?.ok||response.auth!==true||!response.profile?.nickname)throw Error('PROFILE_UNAVAILABLE');
 document.getElementById('name').value=response.profile.nickname;
 document.getElementById('memberName').textContent=response.profile.nickname;
 stage='게임 서버 연결';
 await claimGameTab({token,device},claimSiteSession,status);
 stage='게임 파일 준비';
 lobbyAudio.arm(); // Start waiting music before downloading the game engine.
 await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://newtworld-ms3-coop-5p.ehrlckdqud.chatgpt.site/core.js?v=arcade100';script.onload=resolve;script.onerror=()=>reject(Error('CORE_LOAD'));document.head.append(script);});
 if(typeof window.createMS3!=='function')throw Error('CORE_LOAD');
 await import('./play.mjs?v=98');document.getElementById('channelView').hidden=false;initLobby(response.profile.nickname);import('./social.mjs?v=98').then(m=>m.initSocial()).catch(()=>{});initRankings();lobbyAudio.arm();
 for(const element of form.elements)element.disabled=false;
 status.textContent='회원 확인 완료 · 방을 만들거나 초대 코드로 입장하세요.';
 }catch(error){
 const code=error.message;
 if(code==='MEMBER_ALREADY_ONLINE'||code==='LOCAL_GAME_TAB_OPEN'){
  blockSite(code==='LOCAL_GAME_TAB_OPEN'?'이 브라우저의 다른 탭에서 게임이 열려 있습니다.':'서버에 사용 중인 게임 접속이 있습니다. 이전 접속이 끝난 뒤 다시 입장해주세요.');
  const retry=document.createElement('button');retry.type='button';retry.textContent='다시 입장';retry.onclick=()=>location.reload();status.append(' ',retry);
 }
 else if(code==='auth'||code==='NEWTWORLD_LOGIN_REQUIRED'){
  status.textContent='뉴트월드 회원식별이 필요합니다.';
  document.getElementById('memberHelp').hidden=false;
 }else if(code!=='PC_ONLY'){
  status.textContent=stage+' 단계에서 연결하지 못했습니다. 잠시 후 다시 시도해주세요. ';
  const retry=document.createElement('button');retry.type='button';retry.textContent='다시 연결';retry.onclick=()=>location.reload();status.append(retry);
 }
}
