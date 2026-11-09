import {applyPictureMode} from '../mslug6/dot-filter.mjs?v=allquality';
const parentOrigin='https://ehrlckdqud-cloud.github.io';
const emit=(type,data={})=>parent.postMessage({scope:'nw-gunbird2',type,...data},parentOrigin);
const buttons=[[1,4],[2,5],[4,6],[8,7],[16,0],[32,8],[64,1],[128,2],[256,3]];
let manager=null,started=false,prepared=false,playing=false,previous=[0,0],timer=0;
function inputs(packed){
 for(let port=0;port<2;port++){
  const value=(packed>>>(port*9))&511;
  for(const [mask,button] of buttons)if((value^previous[port])&mask)manager.simulateInput(port,button,Number(Boolean(value&mask)));
  previous[port]=value;
 }
}
function failure(message){clearInterval(timer);playing=false;emit('error',{message});}
function load(bytes){
 started=true;
 window.EJS_player='#game';window.EJS_core='fbneo';window.EJS_pathtodata='./data/';
 window.EJS_gameUrl=new File([bytes],'gunbird2.zip');window.EJS_gameName='gunbird2';
 window.EJS_threads=false;window.EJS_language='en-US';window.EJS_startOnLoaded=true;window.EJS_noAutoFocus=true;
 window.EJS_disableLocalStorage=true;window.EJS_defaultOptions={webgl2Enabled:'enabled'};
 window.EJS_onGameStart=()=>{
  manager=window.EJS_emulator.gameManager;
  const heap=window.EJS_emulator.Module.HEAPU8;
  const signature=[240,203,2,0,207,208,14,64,18,32,29,209,29,209,206,208];
  let at=heap.indexOf(signature[0]);
  while(at>=0&&!signature.every((b,i)=>heap[at+i]===b))at=heap.indexOf(signature[0],at+1);
  if(at<0){failure('건버드 2 드라이버가 원본 ROM을 열지 못했습니다.');return;}
  const workRam=at-1024+0x200000+0x3820000+0x400000+0x100+0x30200;
  const initial=manager.getFrameNum();
  // Warm up the unmodified cabinet, before admitting or billing the player.
  timer=setInterval(()=>{
   if(manager.getFrameNum()-initial<1320)return;
   clearInterval(timer);manager.toggleMainLoop(0);
   // The original SH2 selection routine checks this maintenance setting.
   // Mode 2 is the Aine-enabled value from the verified cabinet configuration.
   const memory=new DataView(window.EJS_emulator.Module.HEAPU8.buffer);
   if(memory.getUint16(workRam+(0x1d6cc^2),true)!==0x8802){
    failure('건버드 2 캐릭터 선택 설정을 확인하지 못했습니다.');return;
   }
   memory.setUint16(workRam+(0x5ca54^2),2,true);
   prepared=true;emit('ready');
  },60);
 };
 const script=document.createElement('script');script.src='./data/loader.js';script.onerror=()=>failure('건버드 2 구동기를 불러오지 못했습니다.');document.head.append(script);
 const watch=setInterval(()=>{
  const emulator=window.EJS_emulator;
  if(prepared)clearInterval(watch);
  else if(emulator?.failedToStart){clearInterval(watch);failure('건버드 2 원본을 실행할 수 없습니다.');}
 },200);
}
window.addEventListener('message',e=>{
 if(e.origin!==parentOrigin||e.source!==parent||e.data?.scope!=='nw-gunbird2')return;
 const {type,bytes,mask}=e.data;
 if(type==='load'&&!started&&bytes instanceof ArrayBuffer)load(bytes);
 if(!prepared)return;
 if(type==='quality'){
  applyPictureMode(window.EJS_emulator,e.data.mode??(e.data.enabled?'on':'off'),window.EJS_emulator.config.shaders??={});
 }
 if(type==='play'){playing=true;manager.toggleMainLoop(1);window.EJS_emulator.Module.AL?.currentCtx?.audioCtx?.resume()?.catch(()=>{});}
 if(type==='input'&&playing&&Number.isInteger(mask))inputs(mask);
 if(type==='pause'){inputs(0);manager.toggleMainLoop(0);playing=false;}
});
emit('listening');
