import {assertPspSupport,validateArcadeCharge} from './contract.mjs';
import {attachAudioStream} from './audio-stream.mjs';
import {restoreTitle,insertCredit} from './game.mjs?v=3';
import {buildDisc,loadCheckpoint} from './package.mjs?v=3';
import {createKeyboard} from './keyboard.mjs';
const root=document.querySelector('#cabinet');
const launch=root.dataset.launch;
const start=document.querySelector('#start'),status=document.querySelector('#status'),screen=document.querySelector('#screen'),full=document.querySelector('#fullscreen');
const lobbyURL='https://ehrlckdqud-cloud.github.io/newtworld-ranking/coop/#solo';
const dataPath='/arcade-runtime/mslug6/ejs-v3/';
let state='initial',blobURL,expired=false,restarting=false;
const bootController=new AbortController();
const endpoint=action=>'/psp6/api/'+launch+'/'+action;
async function api(action){
 const response=await fetch('/psp6/api/'+launch+'/'+action,{method:'POST',cache:'no-store',signal:AbortSignal.timeout(35000)});
 const value=await response.json();
 if(!response.ok)throw Error(value.error||'서버 응답을 확인할 수 없습니다.');
 return value;
}
let startupTimer;
function fail(error){
 if(state==='error')return;
 clearTimeout(startupTimer);bootController.abort();state='error';
 if(window.EJS_emulator?.started)EJS_emulator.pause();
 start.textContent='다시 준비';start.disabled=false;
 status.textContent='게임 준비 실패 · '+error.message+' · 뉴트젬 차감 없음';
}
async function boot(){
 state='loading';start.disabled=true;
 try{
  status.textContent='회원 확인 및 게임 파일 준비 중…';
  const manifest=await api('package');
  let checkpoint;
  [blobURL,checkpoint]=await Promise.all([
   buildDisc(manifest,p=>{status.textContent='게임 파일 준비 · '+p+'%';},bootController.signal),
   loadCheckpoint(endpoint('title'),manifest.bootState,bootController.signal)
  ]);
  status.textContent='게임 엔진을 시작하고 있습니다…';
  const engineStart=performance.now();
  const engineProgress=setInterval(()=>{
   if(state!=='loading'||!checkpoint){clearInterval(engineProgress);return;}
   status.textContent='게임 엔진 시작 중 · '+Math.floor((performance.now()-engineStart)/1000)+'초';
  },1000);
  Object.assign(window,{nwPspAudible:()=>state==='playing',nwPspAudioStream:attachAudioStream,EJS_player:'#game',EJS_core:'psp',EJS_threads:true,EJS_gameUrl:blobURL,EJS_gameID:'nw-ms6-psp-v2',EJS_gameName:'Metal Slug 6.iso',EJS_pathtodata:dataPath,EJS_startOnLoaded:true,EJS_disableAutoLang:false,EJS_language:'en-US',
   EJS_defaultOptions:{ppsspp_cpu_core:'IR JIT',ppsspp_internal_resolution:'480x272',ppsspp_auto_frameskip:'enabled',ppsspp_frameskip:'1',ppsspp_texture_anisotropic_filtering:'disabled',ppsspp_texture_filtering:'Nearest'},
   EJS_retroarchOpts:{audio_sync:true,audio_rate_control:true,video_smooth:false},
   EJS_onGameStart:async()=>{
    try{
     clearInterval(engineProgress);
     status.textContent='타이틀 화면을 복원하고 있습니다…';
     await restoreTitle(EJS_emulator,checkpoint,bootController.signal);
     checkpoint=null;
     if(state!=='loading')return;
     clearTimeout(startupTimer);EJS_emulator.pause();state='ready';screen.classList.add('picture');
     start.textContent='게임 시작 · 500 뉴트젬';start.disabled=false;
     status.textContent='게임 화면 준비 완료 · 시작을 누르면 500뉴트젬이 차감됩니다.';
    }catch(e){if(state==='loading')fail(e);}
   },
   EJS_onExit:()=>{if(state==='loading')fail(Error('PSP 실행이 종료되었습니다.'));}
  });
  startupTimer=setTimeout(()=>{if(state==='loading')fail(Error('PSP 시작 시간을 초과했습니다.'));},45000);
  const script=document.createElement('script');script.src=dataPath+'loader.js';script.onerror=()=>fail(Error('실행 엔진 다운로드 실패'));document.head.append(script);
 }catch(e){fail(e);}
}
async function charge(){
 if(expired){status.textContent='회원 세션이 만료되었습니다. 대기실에서 다시 입장해 주세요.';return;}
 state='charging';start.disabled=true;status.textContent='입장료 확인 중…';
 try{
  validateArcadeCharge(await api('charge'),launch);
 }catch(e){
  state='retry';start.disabled=false;start.textContent='같은 입장 요청 확인';status.textContent=e.message+' · 이 창에서 다시 확인해 주세요.';return;
 }
 state='playing';screen.inert=false;start.hidden=true;full.hidden=false;
 EJS_emulator.play();document.querySelector('#game canvas')?.focus();
 status.textContent='이동 WASD / 방향키 · 사격 J · 선택·점프 K · 수류탄 U · 무기 교체 I · 크레딧 5 · 시작 Enter';
}
start.onclick=()=>{if(state==='error'){restarting=true;location.replace(endpoint('player'));return;}if(state==='initial')return boot();if(state==='retry'||(state==='ready'&&confirm('뉴트젬 500 차감됩니다. 진행하시겠습니까?')))return charge();};
full.onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else screen.requestFullscreen();};
document.querySelector('#exit').onclick=()=>{
 if(state==='charging')return;
 if(state==='playing'&&!confirm('게임을 종료할까요? 재입장 시 500뉴트젬이 차감됩니다.'))return;
 location.replace(lobbyURL);
};
const keymap={KeyW:4,ArrowUp:4,KeyS:5,ArrowDown:5,KeyA:6,ArrowLeft:6,KeyD:7,ArrowRight:7,KeyJ:1,KeyK:0,KeyU:8,KeyI:11,Enter:3};
const keyboard=createKeyboard({
 frame:()=>EJS_emulator.Module._get_current_frame_count(),
 send:(id,value)=>EJS_emulator.gameManager.simulateInput(0,id,value),
 schedule:fn=>requestAnimationFrame(fn),cancel:id=>cancelAnimationFrame(id)
});
function key(e,pressed){
 if(state!=='playing'){if(!['Tab','Escape','Enter','Space'].includes(e.code)||e.target.tagName!=='BUTTON')e.stopImmediatePropagation();return;}
 if(e.code==='Digit5'||e.code==='Numpad5'){
  e.preventDefault();e.stopImmediatePropagation();
  if(pressed&&!e.repeat&&!insertCredit(EJS_emulator.Module.HEAPU8))status.textContent='현재 화면에서 게임 크레딧을 추가할 수 없습니다.';
  return;
 }
 if(!(e.code in keymap))return;
 e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
 keyboard.change(e.code,keymap[e.code],pressed);
}
window.addEventListener('keydown',e=>key(e,true),true);window.addEventListener('keyup',e=>key(e,false),true);
window.addEventListener('blur',keyboard.reset);
document.addEventListener('visibilitychange',()=>{if(document.hidden)keyboard.reset();});
const heartbeat=setInterval(()=>{if(!expired)api('renew').catch(e=>{if(/EXPIRED|REQUIRED/.test(e.message)){expired=true;start.disabled=true;status.textContent='회원 인증이 만료되었습니다. 대기실에서 다시 입장해 주세요.';}});},35000);
window.addEventListener('pageshow',event=>{if(event.persisted)location.replace(lobbyURL);});
window.addEventListener('pagehide',()=>{clearInterval(heartbeat);bootController.abort();if(!restarting)fetch('/psp6/api/'+launch+'/leave',{method:'POST',keepalive:true}).catch(()=>{});if(blobURL)URL.revokeObjectURL(blobURL);});
try{
 assertPspSupport(window);
 if(!document.createElement('canvas').getContext('webgl2')||!window.DecompressionStream)throw Error('WebGL2와 gzip 압축 해제를 지원하는 PC 브라우저가 필요합니다.');
 start.textContent='게임 준비';start.disabled=false;status.textContent='PSP판 · 1인 · 게임 준비 중에는 뉴트젬이 차감되지 않습니다.';
}catch(e){fail(e);}
