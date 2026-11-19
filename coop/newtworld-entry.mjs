import {claimGameTab} from './tab-owner.mjs?v=member2';
import {initRankings} from './rankings.mjs?v=rankdetail1';
import {claimSiteSession,blockSite} from './site-session.mjs?v=98';
import {lobbyAudio} from './lobby-audio.mjs?v=98';
import {initLobby} from './lobby.mjs?v=cabinetclear3';
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
 status.textContent='회원 확인 중…';
 const nickname=await claimGameTab({token,device},claimSiteSession,status);
 document.getElementById('name').value=nickname;
 document.getElementById('memberName').textContent=nickname;
 stage='채널 준비';
 status.textContent='회원 확인 완료 · 채널을 여는 중…';
 await import('./play.mjs?v=lobby-entry2');document.getElementById('channelView').hidden=false;initLobby(nickname);import('./social.mjs?v=98').then(m=>m.initSocial()).catch(()=>{});initRankings();lobbyAudio.arm();
 for(const element of form.elements)element.disabled=false;
 status.textContent='회원 확인 완료 · 방을 만들거나 초대 코드로 입장하세요.';
 }catch(error){
 const code=error.message;
 if(code==='MEMBER_ALREADY_ONLINE'||code==='LOCAL_GAME_TAB_OPEN'){
  blockSite(code==='LOCAL_GAME_TAB_OPEN'?'이 브라우저의 다른 탭에서 게임이 열려 있습니다.':'서버에 사용 중인 게임 접속이 있습니다. 이전 접속이 끝난 뒤 다시 입장해주세요.');
  const retry=document.createElement('button');retry.type='button';retry.textContent='다시 입장';retry.onclick=()=>location.reload();status.append(' ',retry);
 }
 else if(code==='auth'||code==='NEWTWORLD_LOGIN_REQUIRED'){
  status.textContent='뉴트월드 로그인 화면으로 이동하고 있어요.';
  const login=new URL('../login.html',location.href);
  login.searchParams.set('returnTo','coop/index.html?release=99');
  const help=document.getElementById('memberHelp');help.hidden=false;
  const link=help.querySelector('a');if(link){link.href=login.href;link.textContent='로그인하고 다시 입장하기 →';}
  location.replace(login.href);
 }else if(code!=='PC_ONLY'){
  status.textContent=stage+' 단계에서 연결하지 못했습니다. 잠시 후 다시 시도해주세요. ';
  const retry=document.createElement('button');retry.type='button';retry.textContent='다시 연결';retry.onclick=()=>location.reload();status.append(retry);
 }
}

