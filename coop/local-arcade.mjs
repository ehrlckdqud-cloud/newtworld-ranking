import {downloadGame} from './download-game.mjs?v=puyo1';
import {prepareCabinet} from './gunbird2-runtime.mjs?v=3';
import {readSavedROM,saveROM} from './rom-cache.mjs';
import {testHeaders} from './test-access.mjs?v=98';
import {lobbyAudio} from './lobby-audio.mjs?v=98';
import {localArcadeCore,inputMask,controls} from './arcade-input.mjs?v=2';

const api='https://newtworld-ms3-coop-5p.ehrlckdqud.chatgpt.site';
const games=new Map([['mslug3',{title:'메탈슬러그 3',ports:2}],['gunbird2',{title:'건버드 2',ports:2}],['puyopuyo2',{title:'뿌요뿌요 2',ports:2}]]);
export function arcadePrice(){
 const price=document.createElement('span'),icon=document.createElement('img');
 price.className='arcade-gem-price';icon.src='../assets/newt-gem.svg';icon.alt='뉴트젬';
 price.append(icon,'500');return price;
}
let active=false;
export async function openLocalArcade(game='mslug3'){
 if(active)return;
 const spec=games.get(game);
 if(!spec)throw Error('등록되지 않은 게임입니다.');
 active=true;
 const launch=crypto.randomUUID(),keys=new Set(),dialog=document.createElement('dialog');
 dialog.className='arcade-local';
 dialog.innerHTML='<h2></h2><p data-status role="status"></p><p data-aine hidden></p><div class="arcade-screen" hidden><div class="arcade-boot" role="status"><img src="../assets/branding/newtworld-top-logo.png" alt="뉴트월드"><span>Loading...</span></div><canvas width="304" height="224" tabindex="0"></canvas></div><p data-help hidden></p><div data-coins hidden><label>추가할 크레딧 <input type="number" min="1" max="99" value="1"></label> <button type="button" data-add>코인 넣기</button></div><div class="dialog-actions"><button type="button" data-fullscreen hidden>전체화면</button><button type="button" data-close>취소</button><button type="button" class="primary" data-start disabled aria-label="500뉴트젬으로 게임 시작"></button></div>';
 const find=selector=>dialog.querySelector(selector),canvas=find('canvas'),status=find('[data-status]'),start=find('[data-start]'),close=find('[data-close]');
 start.append(arcadePrice());
 if(game==='gunbird2'){
  const hint=find('[data-aine]');hint.hidden=false;
  hint.textContent="캐릭터 선택의 ? 에서 방향키를 뒤로 누르면 히든 캐릭 '아인'을 선택할 수 있습니다.";
 }
 find('h2').textContent=spec.title+' · 혼자하기';
 find('[data-help]').textContent='1P 시작 1 · 이동 WASD · 공격 J/K/U'+(spec.ports===2?' ｜ 2P 시작 상단 2 · 이동 방향키 · 숫자패드 1 공격 / 2 점프 / 4 폭탄 (I/O/P도 가능)':'')+' ｜ 코인 추가 5';
 if(game==='gunbird2')find('[data-help]').textContent='1P 시작 상단 1 · 이동 WASD · J 사격 / K 폭탄 / U 보조 ｜ 2P 시작 상단 2 · 방향키 · 숫자패드 1/2/4 또는 I/O/P ｜ 코인 추가 5';
 if(game==='puyopuyo2')find('[data-help]').textContent='1인 · 방향키 이동, Z/X 회전 ｜ 2인 1P · F/H 좌우, B 내리기, Z/X 또는 G 회전 ｜ 2인 2P · 방향키 이동, 마침표(.)와 슬래시(/) 또는 숫자패드 5/0 회전';
 document.body.append(dialog);dialog.showModal();
 const screen=find('.arcade-screen'),fullscreen=find('[data-fullscreen]');
 screen.tabIndex=-1;
 const focusGame=()=>{if(game==='puyopuyo2'&&cabinet)cabinet.focus();else (cabinet?screen:canvas).focus();};
 function screenMode(on){
  dialog.classList.toggle('screen-only',on);
  if(running)focusGame();
 }
 function fullscreenChanged(){screenMode(document.fullscreenElement===screen);}
 function leaveScreen(){
  if(document.fullscreenElement===screen)document.exitFullscreen().catch(()=>{});
  screenMode(false);
 }
 function escape(e){
  if(e.key==='Escape'&&dialog.classList.contains('screen-only')){
   e.preventDefault();e.stopImmediatePropagation();leaveScreen();
  }
 }
 fullscreen.onclick=async()=>{
  if(!running)return;
  screenMode(true);
  if(document.fullscreenEnabled&&screen.requestFullscreen){
   try{await screen.requestFullscreen();}catch{/* Keep the game-only viewport. */}
  }
 };
 document.addEventListener('fullscreenchange',fullscreenChanged);
 window.addEventListener('keydown',escape,true);
 const preparation=new AbortController();let cabinet=null;
 let core=null,audio=null,running=false,disposed=false,charging=false,raf=0,frame=0,owed=0,pulse=0,nextAudio=0,image=null,last=0,clock=0;
 const member={token:localStorage.getItem('nwProfileToken'),device:localStorage.getItem('nwProfileDevice')};
 const ctx=canvas.getContext('2d'),boot=find('.arcade-boot');
 function video(ptr,w,h,pitch,format){
  if(!ptr||format!==1)return;
  if(!boot.hidden){
   // Neo Geo may run its green BIOS self-test twice before the title appears.
   const heap=core.HEAPU8,mode=heap[core._nw_ram()+(0xfdaf^1)];
   if(mode!==1&&mode!==2)return;
   let lit=0;
   for(let y=4;y<h;y+=8)for(let x=4;x<w;x+=8){
    const a=ptr+y*pitch+x*4;
    if(heap[a]+heap[a+1]+heap[a+2]>40)lit++;
   }
   if(lit<10)return;
   boot.hidden=true;
  }
  if(!image||canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;image=ctx.createImageData(w,h);}
  const heap=core.HEAPU8;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const a=ptr+y*pitch+x*4,i=(y*w+x)*4;
   image.data[i]=heap[a+2];image.data[i+1]=heap[a+1];image.data[i+2]=heap[a];image.data[i+3]=255;
  }
  ctx.putImageData(image,0,0);
 }
 function sound(ptr,n){
  if(!audio||audio.state!=='running'||!n||document.hidden)return;
  const b=audio.createBuffer(2,n,core._nw_rate()),src=core.HEAP16.subarray(ptr/2,ptr/2+n*2);
  for(let c=0;c<2;c++){const dst=b.getChannelData(c);for(let i=0;i<n;i++)dst[i]=src[i*2+c]/32768;}
  const source=audio.createBufferSource();source.buffer=b;source.connect(audio.destination);
  nextAudio=Math.max(audio.currentTime,nextAudio);source.start(nextAudio);nextAudio+=b.duration;
 }
 function tick(t){
  if(!running||disposed)return;
  if(!document.hidden){
   clock+=last?Math.min(t-last,80):0;
   const dt=1000/(cabinet?60:core._nw_fps());
   while(clock>=dt){
    if(!pulse&&owed){owed--;pulse=18;}
    const mask=inputMask(keys,spec.ports,pulse>12);if(pulse)pulse--;
    if(cabinet)cabinet.input(mask);else{core._nw_input(mask);core._nw_run(++frame);}clock-=dt;
   }
  }
  last=t;raf=requestAnimationFrame(tick);
 }
 const used=new Set([...Object.keys(controls[0]),...(spec.ports===2?Object.keys(controls[1]):[]),'Digit5']);
 function input(e){
  if(!running||!used.has(e.code)||e.target.tagName==='INPUT')return;
  e.preventDefault();e.stopImmediatePropagation();
  if(e.code==='Digit5'){if(game!=='puyopuyo2'&&e.type==='keydown'&&!e.repeat)owed=Math.min(owed+1,99);return;}
  if(e.type==='keydown')keys.add(e.code);else keys.delete(e.code);
 }
 function reset(){keys.clear();last=clock=nextAudio=0;if(game!=='puyopuyo2')cabinet?.input(0);}
 function visibility(){reset();if(cabinet&&running){if(document.hidden)cabinet.pause();else cabinet.play();}}
 function finish(external=false){
  if(disposed||(!external&&charging))return;
  if(!external&&running&&!confirm('게임을 종료할까요? 다시 실행하면 입장료가 다시 차감됩니다.'))return;
  disposed=true;running=false;cancelAnimationFrame(raf);reset();
  window.removeEventListener('keydown',input,true);window.removeEventListener('keyup',input,true);window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',visibility);
  cabinet?.close();preparation.abort();if(core){core._nw_close();core=null;}audio?.close().catch(()=>{});
  document.removeEventListener('fullscreenchange',fullscreenChanged);window.removeEventListener('keydown',escape,true);leaveScreen();dialog.close();dialog.remove();active=false;lobbyAudio.setWaiting(true);
 }
 close.onclick=()=>finish();dialog.addEventListener('close',()=>finish(true));dialog.oncancel=e=>{e.preventDefault();if(dialog.classList.contains('screen-only'))leaveScreen();else if(!running)finish();};
 find('[data-add]').onclick=()=>{const n=Number(find('input').value);if(Number.isInteger(n)&&n>=1&&n<=99)owed=Math.min(99,owed+n);focusGame();};
 start.onclick=async()=>{
  if((!core&&!cabinet)||charging||running)return;
  start.disabled=close.disabled=charging=true;status.textContent='입장 확인 중…';
  try{
   if(!cabinet){audio??=new AudioContext();await audio.resume();}
   const response=await fetch(api+'/api/arcade-entry',{method:'POST',headers:{'content-type':'application/json',...testHeaders()},body:JSON.stringify({member,game,launch})});
   const result=await response.json();
   if(!response.ok||!result.ok||result.launch!==launch||result.game!==game||result.cost!==500)throw Error(result.error||'입장 결과를 확인하지 못했습니다.');
   if(disposed)return;
   running=true;start.hidden=true;fullscreen.hidden=false;close.textContent='게임 종료';status.textContent='입장 완료';
   dialog.classList.add('playing');find('.arcade-screen').hidden=find('[data-help]').hidden=false;
   find('[data-coins]').hidden=game==='puyopuyo2';
   lobbyAudio.setWaiting(false);if(cabinet){cabinet.play();boot.hidden=true;}else{core.onVideo=video;core.onAudio=sound;}
   if(game!=='puyopuyo2'){window.addEventListener('keydown',input,true);window.addEventListener('keyup',input,true);}window.addEventListener('blur',reset);document.addEventListener('visibilitychange',visibility);
   focusGame();if(game!=='puyopuyo2')raf=requestAnimationFrame(tick);
  }catch(e){status.textContent=e.message+' · 같은 화면에서 다시 시도할 수 있습니다.';start.disabled=false;}
  finally{charging=close.disabled=false;}
 };
 try{
  status.textContent='원작 게임을 준비하는 중…';
  if(game==='gunbird2'||game==='puyopuyo2'){
   canvas.hidden=true;screen.hidden=false;
   screen.classList.add('gunbird-preparing');
   const bytes=await downloadGame({game,member,headers:testHeaders(),onProgress:p=>{status.textContent=spec.title+' 준비 중 '+Math.round(p*100)+'%';}});
   if(disposed)return;
   cabinet=await prepareCabinet(game,screen,bytes,{signal:preparation.signal,onEscape:()=>{if(dialog.classList.contains('screen-only'))leaveScreen();},onFailure:message=>{status.textContent=message;}});
   screen.classList.remove('gunbird-preparing');screen.hidden=true;
  }else{
  let source=await readSavedROM();
  if(!source){source=await downloadGame({member,headers:testHeaders(),onProgress:p=>{status.textContent='게임 준비 중 '+Math.round(p*100)+'%';}});if(!disposed)try{await saveROM(source);}catch{}}
  if(disposed)return;
  let portsReady=false;
  const loaded=await window.createMS3({localArcadeCore(bytes){const adapted=localArcadeCore(bytes);portsReady=true;return adapted;},print:()=>{},printErr:()=>{}});
  if(!portsReady)throw Error('실행 코어가 갱신되었습니다. 새로고침해주세요.');
  await window.prepareROM(loaded,source,{});
  // The supplied decrypted set needs FBNeo's alternate-ROM directory for CRC
  // compatibility. Copy exactly the same unmodified ROM bytes to that path.
  loaded.FS.writeFile('/system/fbneo/patched/mslug3fd.zip',loaded.FS.readFile('/roms/mslug3fd.zip'));
  if(!loaded._nw_load()||!loaded._nw_ram()){loaded._nw_close();throw Error('원본 게임 파일을 불러오지 못했습니다.');}
  if(disposed){loaded._nw_close();return;}
  core=loaded;
  }
  status.replaceChildren('이번 실행의 입장료는 ',arcadePrice(),'입니다. 게임을 종료한 뒤 다시 실행하면 새 입장료가 적용됩니다.');start.disabled=false;
 }catch(e){if(!disposed){screen.hidden=true;status.textContent=e.message;}}
}
