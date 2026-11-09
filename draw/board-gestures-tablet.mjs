// Camera-only gestures. The physics clock and HUD hit testing stay independent.
export function installBoardGestures(canvas,camera,worldScale){
 const points=new Map();
 let dragging=false,blockClick=false,origin;
 canvas.style.touchAction='none';
 const arena=canvas.closest('#arena')||canvas;
 arena.style.touchAction='none';
 const hasTouchEvents='ontouchstart' in window;
 const position=e=>({x:e.clientX,y:e.clientY});
 function geometry(){
  const [a,b]=points.values();
  return b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)}:{...a,distance:0};
 }
 function down(e){
  if((hasTouchEvents&&e.pointerType==='touch')||e.button!==0||points.size>=2)return;
  if(!points.size){origin=position(e);dragging=false;blockClick=false;}
  points.set(e.pointerId,position(e));
  canvas.setPointerCapture(e.pointerId);
  if(points.size===2){dragging=true;blockClick=true;camera.manualUntil=Infinity;}
 }
 function move(e){
  if(!points.has(e.pointerId))return;
  const last=geometry();
  points.set(e.pointerId,position(e));
  const next=geometry();
  if(!dragging&&Math.hypot(next.x-origin.x,next.y-origin.y)<4)return;
  const prev=dragging?last:origin;
  dragging=true;blockClick=true;camera.lock(false);camera.manualUntil=Infinity;
  const size=worldScale(),oldZoom=camera.zoom;
  if(!(size>0&&oldZoom>0))return;
  if(last.distance>1&&next.distance>1)camera.zoomFromGesture(oldZoom*next.distance/last.distance);
  const rect=canvas.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  const target={x:camera.x+(prev.x-cx)/size-(next.x-cx)*oldZoom/(size*camera.zoom),
                y:camera.y+(prev.y-cy)/size-(next.y-cy)*oldZoom/(size*camera.zoom)};
  camera.setPosition(target,true);camera.setPosition(target);
  e.preventDefault();
 }
 function end(e){
  if(!points.delete(e.pointerId))return;
  if(!points.size&&dragging){camera.manualUntil=performance.now()+1200;dragging=false;}
 }
 // Sample the full touch list at once. Android browsers can combine the two
 // finger movements into one touchmove or cancel their individual pointers.
 let touchBase=null;
 function contacts(e){
  return Array.from(e.touches).filter(t=>arena.contains(t.target)).slice(0,2);
 }
 function touchSample(list){
  const [a,b]=list;
  return b?{x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2,d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}:{x:a.clientX,y:a.clientY,d:0};
 }
 function rebase(e){
  const list=contacts(e);
  if(!list.length){
   if(touchBase&&dragging)camera.manualUntil=performance.now()+1200;
   touchBase=null;dragging=false;return;
  }
  if(!touchBase)blockClick=false;
  touchBase={...touchSample(list),count:list.length,zoom:camera.zoom};
  if(list.length===2){dragging=true;blockClick=true;camera.manualUntil=Infinity;}
 }
 function touchMove(e){
  if(!touchBase)return;
  const list=contacts(e);
  if(list.length!==touchBase.count){rebase(e);return;}
  const now=touchSample(list),prev=touchBase.last||touchBase;
  if(!dragging&&Math.hypot(now.x-prev.x,now.y-prev.y)<4)return;
  e.preventDefault();dragging=true;blockClick=true;camera.lock(false);camera.manualUntil=Infinity;
  const size=worldScale(),oldZoom=camera.zoom;
  if(!(size>0&&oldZoom>0))return;
  if(touchBase.d>1&&now.d>1)camera.zoomFromGesture(touchBase.zoom*now.d/touchBase.d);
  const rect=canvas.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  const target={x:camera.x+(prev.x-cx)/size-(now.x-cx)*oldZoom/(size*camera.zoom),
                y:camera.y+(prev.y-cy)/size-(now.y-cy)*oldZoom/(size*camera.zoom)};
  camera.setPosition(target,true);camera.setPosition(target);touchBase.last=now;
  if(touchBase.count===2){
   const hint=document.getElementById('gameHint');
   if(hint)hint.textContent='화면 배율 '+camera.zoom.toFixed(2)+'× · 벌리면 확대 / 모으면 축소';
  }
 }
 if(hasTouchEvents){
  arena.addEventListener('touchstart',rebase,{passive:true,capture:true});
  arena.addEventListener('touchmove',touchMove,{passive:false,capture:true});
  arena.addEventListener('touchend',rebase,{passive:true,capture:true});
  arena.addEventListener('touchcancel',rebase,{passive:true,capture:true});
 }
 canvas.addEventListener('pointerdown',down);
 canvas.addEventListener('pointermove',move);
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,end);
 canvas.addEventListener('click',e=>{
  if(blockClick){blockClick=false;e.preventDefault();e.stopImmediatePropagation();}
 },true);
 return ()=>points.size>0||touchBase!==null;
}
