// Camera-only gestures. The physics clock and HUD hit testing stay independent.
export function installBoardGestures(canvas,camera,worldScale){
 const points=new Map();
 let dragging=false,blockClick=false,origin;
 canvas.style.touchAction='none';
 const position=e=>({x:e.clientX,y:e.clientY});
 function geometry(){
  const [a,b]=points.values();
  return b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)}:{...a,distance:0};
 }
 function down(e){
  if(e.button!==0||points.size>=2)return;
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
  if(last.distance>1&&next.distance>1)camera.zoomFromGesture(oldZoom*last.distance/next.distance);
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
 canvas.addEventListener('pointerdown',down);
 canvas.addEventListener('pointermove',move);
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,end);
 canvas.addEventListener('click',e=>{
  if(blockClick){blockClick=false;e.preventDefault();e.stopImmediatePropagation();}
 },true);
 return ()=>points.size>0;
}
