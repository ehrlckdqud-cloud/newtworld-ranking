import {scale2x} from '../scale2x.mjs';
const parentOrigin='https://ehrlckdqud-cloud.github.io',scope='nw-puyopuyo2';
const send=(type,extra={})=>parent.postMessage({scope,type,...extra},parentOrigin);
const canvas=document.querySelector('#canvas');
let quality=false,overlay,scaled,originalPut;
function setQuality(enabled){
 if(enabled===quality)return;
 quality=enabled;
 const ctx=canvas.getContext('2d');
 if(!enabled){
  ctx.putImageData=originalPut;overlay.remove();overlay=null;scaled=null;return;
 }
 overlay=document.createElement('canvas');
 overlay.style.cssText='grid-area:1/1;pointer-events:none;z-index:1';
 canvas.style.gridArea='1/1';canvas.after(overlay);
 const output=overlay.getContext('2d');originalPut=ctx.putImageData;
 function draw(frame){
  const w=frame.width,h=frame.height;
  if(!scaled||scaled.width!==2*w||scaled.height!==2*h){
   overlay.width=w*2;overlay.height=h*2;scaled=output.createImageData(w*2,h*2);
  }
  scale2x(new Uint32Array(frame.data.buffer,frame.data.byteOffset,w*h),new Uint32Array(scaled.data.buffer),w,h);
  output.putImageData(scaled,0,0);
 }
 draw(ctx.getImageData(0,0,canvas.width,canvas.height));
 ctx.putImageData=function(frame,...args){originalPut.call(ctx,frame,...args);draw(frame);};
}
let initiated=false,ready=false,playing=false,visibleWindow=false,synth;
function resumeSound(){
 if(synth?.actx.state==='suspended')synth.actx.resume().catch(()=>{});
}
window.addEventListener('pointerdown',resumeSound);
window.addEventListener('keydown',event=>{
 if(playing)resumeSound();
 if(event.key==='Escape'&&playing)send('escape');
},true);
async function boot(app){
 const midiReady=import('./sample-midi.js').then(module=>module.prepareMidi());
 const [midi,parts]=await Promise.all([midiReady,Promise.all(['system-00','system-01','system-02'].map(async name=>{
  const response=await fetch('./'+name);if(!response.ok)throw Error('Windows 구동 파일을 불러오지 못했습니다.');
  return new Uint8Array(await response.arrayBuffer());
 }))]);
 synth=midi;
 const root=new Uint8Array(parts.reduce((n,part)=>n+part.length,0));let offset=0;
 for(const part of parts){root.set(part,offset);offset+=part.length;}
 const dir='/home/username/.wine/drive_c/ddraw';
 window.Module={canvas,gamePcm:createPuyoPcmDevice(synth.actx),locateFile:(name,prefix)=>prefix+name+'?v=5',sharedGameAudioContext:synth.actx,arguments:['-root','/root','-zip','boxedwine.zip','-mount','app.zip',dir,'-w',dir,'-cacheReads','-vsync','0','-env','WINEDLLOVERRIDES=ddraw=n,b','-resolution','640x480','/bin/wine','PUYO2W95.EXE'],
  onMidi:bytes=>{if(playing&&bytes.length>=2&&bytes.length<=3)synth.send(bytes);},
  preRun:[()=>{FS.mkdirTree('/root'+dir);FS.writeFile('/root'+dir+'/ddraw.ini','[ddraw]\nrenderer=gdi\nmaxfps=60\nmaxgameticks=0\nvsync=false\nmaintas=true\n');FS.writeFile('/boxedwine.zip',root,{canOwn:true});FS.writeFile('/app.zip',new Uint8Array(app),{canOwn:true});}],
  print:line=>{if(String(line).includes('Showing Window'))visibleWindow=true;},printErr:console.warn,
  onAbort:()=>send('error',{message:'뿌요뿌요 2 원작을 실행하지 못했습니다.'})};
 const script=document.createElement('script');script.src='./boxedwine.js?v=5';script.onerror=()=>send('error',{message:'Windows 구동기를 불러오지 못했습니다.'});document.head.append(script);
 const sample=document.createElement('canvas');sample.width=32;sample.height=24;
 const ctx=sample.getContext('2d',{willReadFrequently:true});
 function inspect(){
  if(visibleWindow&&canvas.width&&canvas.height){
   ctx.drawImage(canvas,0,0,32,24);
   const pixels=ctx.getImageData(0,0,32,24).data;
   let colorful=0;for(let i=0;i<pixels.length;i+=4){if(Math.max(pixels[i],pixels[i+1],pixels[i+2])-Math.min(pixels[i],pixels[i+1],pixels[i+2])>25)colorful++;}
   if(colorful>=8){Module.pauseMainLoop();ready=true;send('ready');return;}
  }
  requestAnimationFrame(inspect);
 }
 requestAnimationFrame(inspect);
}
window.addEventListener('message',event=>{
 if(event.source!==parent||event.origin!==parentOrigin||event.data?.scope!==scope)return;
 const {type,bytes}=event.data;
 if(type==='load'&&!initiated&&bytes instanceof ArrayBuffer){initiated=true;boot(bytes).catch(e=>send('error',{message:e.message}));}
 if(!ready)return;
 if(type==='quality')setQuality(event.data.enabled===true);
 if(type==='focus'&&playing)canvas.focus();
 if(type==='play'&&!playing){
  playing=true;canvas.focus();Module.resumeMainLoop();
  // The upstream single-thread loop yields after each presentation or guest sleep.
  // Schedule CPU slices independently of the display refresh.
  _emscripten_set_main_loop_timing(2,0);
  resumeSound();
 }
 if(type==='pause'&&playing){
  playing=false;Module.pauseMainLoop();
  synth.actx.suspend().catch(()=>{});
 }
});
send('listening');
