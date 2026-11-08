import {assertPspSupport,validateArcadeCharge} from './contract.mjs';
const root=document.querySelector('#cabinet');
const launch=root.dataset.launch;
const start=document.querySelector('#start'),status=document.querySelector('#status'),screen=document.querySelector('#screen'),full=document.querySelector('#fullscreen');
const dataPath='/arcade-runtime/mslug6/ejs/';
let state='initial',blobURL,expired=false;
async function api(action){
 const response=await fetch('/psp6/api/'+launch+'/'+action,{method:'POST',cache:'no-store',signal:AbortSignal.timeout(35000)});
 const value=await response.json();
 if(!response.ok)throw Error(value.error||'서버 응답을 확인할 수 없습니다.');
 return value;
}
async function loadISO(){
 const manifest=await api('package');
 if(manifest.game!=='mslug6'||manifest.price!==500)throw Error('게임 패키지를 확인할 수 없습니다.');
 const raw=Uint8Array.from(atob(manifest.key.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
 const parts=[];let bytes=0;
 for(const chunk of manifest.chunks){
  const response=await fetch(chunk.path,{signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error('게임 파일 다운로드 실패');
  const data=new Uint8Array(await response.arrayBuffer());
  if(data.length!==chunk.bytes)throw Error('게임 파일 길이가 올바르지 않습니다.');
  const compressed=await crypto.subtle.decrypt({name:'AES-GCM',iv:data.subarray(0,12)},key,data.subarray(12));
  const part=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).blob();
  if(part.size!==chunk.size)throw Error('게임 파일 손상');
  parts.push(part);bytes+=part.size;
  status.textContent='메탈슬러그 6 다운로드 · '+Math.round(bytes/manifest.size*100)+'%';
 }
 if(bytes!==manifest.size)throw Error('게임 데이터가 불완전합니다.');
 return URL.createObjectURL(new Blob(parts,{type:'application/octet-stream'}));
}
let startupTimer;
function fail(error){
 clearTimeout(startupTimer);state='error';start.disabled=true;
 status.textContent='게임 준비 실패 · '+error.message+' · 뉴트젬 차감 없음';
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitForPicture(){
 // A core-start event alone can precede a black screen or a failed PSP boot.
 const probe=document.createElement('canvas');probe.width=80;probe.height=45;
 const ctx=probe.getContext('2d',{willReadFrequently:true});
 for(let i=0;i<180&&state==='loading';i++){
  await new Promise(requestAnimationFrame);
  const canvas=window.EJS_emulator?.canvas;
  if(canvas?.width&&canvas.height){
   ctx.drawImage(canvas,0,0,80,45);
   const pixels=ctx.getImageData(0,0,80,45).data;
   let light=0,dark=0;
   for(let n=0;n<pixels.length;n+=4){const sum=pixels[n]+pixels[n+1]+pixels[n+2];if(sum>160)light++;if(sum<80)dark++;}
   if(light>30&&dark>30)return;
  }
  await wait(200);
 }
 throw Error('PSP 게임 화면이 나타나지 않았습니다.');
}
async function boot(){
 state='loading';start.disabled=true;
 try{
  blobURL=await loadISO();
  status.textContent='PSP 실행 중…';
  Object.assign(window,{EJS_player:'#game',EJS_core:'psp',EJS_threads:true,EJS_gameUrl:blobURL,EJS_gameName:'Metal Slug 6.iso',EJS_pathtodata:dataPath,EJS_startOnLoaded:true,EJS_disableAutoLang:false,EJS_language:'en-US',
   EJS_onGameStart:async()=>{
    try{
     await waitForPicture();
     if(state!=='loading')return;
     clearTimeout(startupTimer);EJS_emulator.pause();state='ready';screen.classList.add('picture');
     start.textContent='게임 시작 · 500 뉴트젬';start.disabled=false;
     status.textContent='게임 화면 준비 완료 · 시작을 누르면 500뉴트젬이 차감됩니다.';
    }catch(e){if(state==='loading')fail(e);}
   },
   EJS_onExit:()=>{if(state==='loading')fail(Error('PSP 실행이 종료되었습니다.'));}
  });
  startupTimer=setTimeout(()=>{if(state==='loading')fail(Error('PSP 시작 시간을 초과했습니다.'));},120000);
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
 state='playing';clearInterval(heartbeat);screen.inert=false;start.hidden=true;full.hidden=false;
 EJS_emulator.play();EJS_emulator.canvas?.focus();
 status.textContent='이동 WASD / 방향키 · 사격 J · 선택·점프 K · 수류탄 U · 시작 Enter';
}
start.onclick=()=>{if(state==='initial')return boot();if(state==='retry'||(state==='ready'&&confirm('뉴트젬 500 차감됩니다. 진행하시겠습니까?')))return charge();};
full.onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else screen.requestFullscreen();};
document.querySelector('#exit').onclick=()=>{
 if(state==='charging')return;
 if(state==='playing'&&!confirm('게임을 종료할까요? 재입장 시 500뉴트젬이 차감됩니다.'))return;
 window.close();location.replace('/psp6/');
};
const keymap={KeyW:4,ArrowUp:4,KeyS:5,ArrowDown:5,KeyA:6,ArrowLeft:6,KeyD:7,ArrowRight:7,KeyJ:1,KeyK:0,KeyU:8,Enter:3};
const down=new Map();
function key(e,pressed){
 if(state!=='playing'){if(!['Tab','Escape','Enter','Space'].includes(e.code)||e.target.tagName!=='BUTTON')e.stopImmediatePropagation();return;}
 if(!(e.code in keymap))return;
 e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
 if(pressed)down.set(e.code,keymap[e.code]);else down.delete(e.code);
 EJS_emulator.gameManager.simulateInput(0,keymap[e.code],[...down.values()].includes(keymap[e.code])?1:0);
}
window.addEventListener('keydown',e=>key(e,true),true);window.addEventListener('keyup',e=>key(e,false),true);
window.addEventListener('blur',()=>{for(const id of down.values())window.EJS_emulator?.gameManager?.simulateInput(0,id,0);down.clear();});
const heartbeat=setInterval(()=>{if(!expired&&state!=='playing')api('renew').catch(e=>{if(/EXPIRED|REQUIRED/.test(e.message)){expired=true;start.disabled=true;status.textContent='회원 인증이 만료되었습니다. 대기실에서 다시 입장해 주세요.';}});},35000);
window.addEventListener('pagehide',()=>{clearInterval(heartbeat);if(blobURL)URL.revokeObjectURL(blobURL);});
try{
 assertPspSupport(window);
 if(!document.createElement('canvas').getContext('webgl2')||!window.DecompressionStream)throw Error('WebGL2와 gzip 압축 해제를 지원하는 PC 브라우저가 필요합니다.');
 start.textContent='게임 준비';start.disabled=false;status.textContent='PSP판 · 1인 · 게임 준비 중에는 뉴트젬이 차감되지 않습니다.';
}catch(e){fail(e);}
