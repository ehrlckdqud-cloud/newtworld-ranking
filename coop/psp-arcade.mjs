// Metal Slug 6 uses the PSP/PPSSPP runtime, not the FBNeo Metal Slug 1–5 core.
// This module intentionally stays separate from local-arcade.mjs.
// The corresponding server route must support the 'mslug6' game id before activation.
import {testHeaders} from './test-access.mjs?v=98';
import {lobbyAudio} from './lobby-audio.mjs?v=98';

const API='https://newtworld-ms3-coop-5p.ehrlckdqud.chatgpt.site';
const DATA='https://cdn.emulatorjs.org/4.2.3/data/';
let active=false;

function memberCredentials(){
  return {token:localStorage.getItem('nwProfileToken'),device:localStorage.getItem('nwProfileDevice')};
}
async function loadEmulatorJS(){
  if(window.EJS_emulator) return;
  if(document.querySelector('script[data-nw-psp]')) throw Error('PSP 실행 엔진을 이미 불러오는 중입니다.');
  await new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=DATA+'loader.js';script.dataset.nwPsp='1';
    script.onload=resolve;script.onerror=()=>reject(Error('PSP 실행 엔진 다운로드 실패'));
    document.head.append(script);
  });
}
export async function openPspArcade(game='mslug6'){
  if(active) return;
  if(game!=='mslug6') throw Error('지원되지 않는 PSP 게임입니다.');
  active=true;
  const member=memberCredentials();
  const launch=crypto.randomUUID();
  const dialog=document.createElement('dialog');
  dialog.className='arcade-local arcade-psp';
  const heading=document.createElement('h2');heading.textContent='메탈슬러그 6 · 혼자하기';
  const status=document.createElement('p');status.setAttribute('role','status');
  const gameRoot=document.createElement('div');gameRoot.className='arcade-screen';gameRoot.hidden=true;
  gameRoot.style.cssText='width:min(100%,960px);height:min(65vh,640px);position:relative;';
  const slot=document.createElement('div');slot.id='nw-mslug6-'+launch.replace(/-/g,'');slot.style.cssText='width:100%;height:100%';
  gameRoot.append(slot);
  const actions=document.createElement('div');actions.className='dialog-actions';
  const fullscreen=document.createElement('button');fullscreen.type='button';fullscreen.textContent='전체화면';fullscreen.hidden=true;
  const close=document.createElement('button');close.type='button';close.textContent='취소';
  const start=document.createElement('button');start.type='button';start.className='primary';start.textContent='💎 500 · 게임 시작';start.disabled=true;
  actions.append(fullscreen,close,start);dialog.append(heading,status,gameRoot,actions);document.body.append(dialog);dialog.showModal();
  let disposed=false,charging=false,charged=false,blobUrl=null;
  const cleanup=()=>{
    if(disposed||charging)return;
    if(charged&&!confirm('게임을 종료할까요? 다시 실행하면 입장료가 새로 차감됩니다.'))return;
    disposed=true;
    if(document.fullscreenElement===gameRoot)document.exitFullscreen().catch(()=>{});
    // Server-provided URL is managed by the server; no browser blob to revoke.
    // PSP iframe/loader resources are removed with the dialog. Avoid reusing EJS singletons.
    dialog.close();dialog.remove();active=false;lobbyAudio.setWaiting(true);
    location.reload(); // EmulatorJS is a single-instance global; reset cleanly before another game.
  };
  close.onclick=cleanup;dialog.oncancel=e=>{e.preventDefault();cleanup();};
  fullscreen.onclick=()=>gameRoot.requestFullscreen?.().catch(()=>{});
  try{
    if(!member.token||!member.device)throw Error('뉴트월드 회원식별 후 이용해주세요.');
    status.textContent='PSP 게임 파일 준비 중…';
    // Existing /api/game-package accepts at most 80 MiB and cannot hold the PSP ISO.
    // The server must issue an authenticated, time-limited URL to a streamable ISO.
    const response=await fetch(API+'/api/psp-package',{method:'POST',headers:{'content-type':'application/json',...testHeaders()},body:JSON.stringify({member,game})});
    if(!response.ok)throw Error('PSP 게임 파일 서버가 아직 준비되지 않았습니다.');
    const manifest=await response.json();
    if(manifest.game!==game||typeof manifest.url!=='string'||!manifest.url.startsWith('https://'))throw Error('PSP 게임 다운로드 정보가 올바르지 않습니다.');
    blobUrl=manifest.url;
    status.textContent='준비 완료 · 게임 시작 시 500뉴트젬 차감';start.disabled=false;
    start.onclick=async()=>{
      if(charging||charged||disposed)return;
      charging=true;start.disabled=close.disabled=true;status.textContent='회원 및 뉴트젬 확인 중…';
      try{
        const response=await fetch(API+'/api/arcade-entry',{method:'POST',headers:{'content-type':'application/json',...testHeaders()},body:JSON.stringify({member,game,launch})});
        const result=await response.json();
        if(!response.ok||!result.ok||result.launch!==launch||result.game!==game||result.cost!==500)throw Error(result.error||'입장료 확인 실패');
        charged=true;
        // EmulatorJS embeds the PPSSPP runtime in the same on-page game slot.
        window.EJS_player='#'+slot.id;
        window.EJS_core='psp';
        window.EJS_gameUrl=blobUrl;
        window.EJS_pathtodata=DATA;
        window.EJS_startOnLoaded=true;
        gameRoot.hidden=false;
        await loadEmulatorJS();
        fullscreen.hidden=false;start.hidden=true;close.textContent='게임 종료';
        status.textContent='메탈슬러그 6 실행 중 · 500뉴트젬 차감 완료';
        lobbyAudio.setWaiting(false);
      }catch(error){
        status.textContent=charged?'입장료는 차감되었지만 PSP 실행에 실패했습니다: '+error.message:'게임을 시작하지 못했습니다: '+error.message;
        if(!charged)start.disabled=false;
      }finally{charging=false;close.disabled=false;}
    };
  }catch(error){status.textContent=error.message;start.disabled=true;}
}
