import {initRankings} from './rankings.mjs?v=60';
import {claimSiteSession,blockSite,DUPLICATE_MESSAGE} from './site-session.mjs?v=60';
import {requestTestAccess} from './test-access.mjs?v=60';
import {lobbyAudio} from './lobby-audio.mjs?v=51';
import {initLobby} from './lobby.mjs?v=60';
const mobile=/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
if(mobile){document.getElementById('appShell').hidden=true;document.getElementById('pcOnly').hidden=false;}
const form=document.getElementById('joinForm');
for(const element of form.elements)element.disabled=true;
const token=localStorage.getItem('nwProfileToken'),device=localStorage.getItem('nwProfileDevice');
const status=document.getElementById('status');
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
 if(!response?.ok||!response.auth||!response.profile?.nickname)throw Error('auth');
 document.getElementById('name').value=response.profile.nickname;
 document.getElementById('memberName').textContent=response.profile.nickname;
 await claimSiteSession({token,device});
 status.textContent='운영진 테스트 비밀번호를 입력해주세요.';
 await requestTestAccess({token,device});
 document.getElementById('channelView').hidden=false;
 await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://newtworld-ms3-coop-5p.pluckypeach517.chatgpt.site/core.js?v=60';script.onload=resolve;script.onerror=()=>reject(Error('CORE_LOAD'));document.head.append(script);});
 if(typeof window.createMS3!=='function')throw Error('CORE_LOAD');
 await import('./play.mjs?v=60');initLobby(response.profile.nickname);initRankings();lobbyAudio.arm();
 for(const element of form.elements)element.disabled=false;
 status.textContent='회원 확인 완료 · 방을 만들거나 초대 코드로 입장하세요.';
}catch(error){if(error.message==='MEMBER_ALREADY_ONLINE'){blockSite(DUPLICATE_MESSAGE);}else{status.textContent='회원 확인을 완료하지 못했습니다. 뉴트월드 회원식별 상태를 확인하고 새로고침해주세요.';document.getElementById('memberHelp').hidden=false;}}
