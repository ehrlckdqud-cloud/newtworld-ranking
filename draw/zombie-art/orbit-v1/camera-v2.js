// A fixed-target perspective camera. Gameplay keeps its original floor coordinates.
const defenseCameraAssetRoot = new URL(".", document.currentScript.src);
window.createDefenseCamera = function createDefenseCamera(arena, room, redraw) {
  const assetRoot = defenseCameraAssetRoot;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const nearZoom = .72, farZoom = 3.5, defaultTilt = 32;
  const target = {tilt:defaultTilt, zoom:1, x:0, y:0};
  const state = {...target};
  const fingers = new Map();
  const output = document.getElementById('cameraState');
  const plus = document.getElementById('plus'), minus = document.getElementById('minus');
  let unit=1, width=1200, height=800, previous=0, resized=true;
  let sin=0, cos=1, focusHeight=70, focal=1260, screenX=0, screenY=0;
  let cinematic=null, vibration=null;
  const radius=1460;

  function homogeneous(x,h,z) {
    const dh=h-focusHeight, w=(radius-dh*sin-z*cos)/radius;
    return [(width/2+screenX)*w+focal*x/radius,
      (height/2+screenY)*w-focal*(dh*cos-z*sin)/radius,w];
  }
  function project(x,y,h=0) {
    const [a,b,w]=homogeneous((x-600)*1.32,h,(y-525)*1.92);
    return {x:a/w,y:b/w,scale:focal/(radius*w)};
  }
  // CSS projects each photograph as a plane with the same perspective divide as the actors.
  function plane(name, origin, right, bottom, texture) {
    const el=document.createElement('div');
    el.className='room-plane plane-'+name;
    if(texture)el.style.backgroundImage='url("'+new URL(texture,assetRoot).href+'")';
    room.append(el);
    return {el,origin,right,bottom};
  }
  const back=-650, front=1780, half=1010, wallHeight=540;
  const planes=[
    plane('floor',[-half,0,back],[half,0,back],[-half,0,front],'floor.webp'),
    plane('back',[-half,wallHeight,back],[half,wallHeight,back],[-half,0,back],'wall.webp'),
    plane('left',[-half,wallHeight,front],[-half,wallHeight,back],[-half,0,front],'side.webp'),
    plane('right',[half,wallHeight,back],[half,wallHeight,front],[half,0,back],'side.webp'),
    plane('ceiling',[-half,wallHeight,back],[half,wallHeight,back],[-half,wallHeight,front],null)
  ];
  function updatePlanes() {
    const rad=state.tilt*Math.PI/180;
    sin=Math.sin(rad); cos=Math.cos(rad);focusHeight=78*cos;focal=1260*state.zoom;
    screenX=state.x;screenY=state.y;
    if(cinematic){
      const {weight,x,y,bounds}=cinematic,at=project(x,y);
      const fit=Math.min(1,width*.78/((bounds.right-bounds.left)*at.scale),
        height*.70/((bounds.bottom-bounds.top)*at.scale));
      focal*=1+(fit-1)*weight;
      const foot=project(x,y);
      screenX+=weight*(width*.5-foot.x-(bounds.left+bounds.right)*.5*foot.scale);
      screenY+=weight*(height*.51-foot.y-(bounds.top+bounds.bottom)*.5*foot.scale);
    }
    if(vibration){
      screenX+=vibration.x/unit;screenY+=vibration.y/unit;
    }
    for(const {el,origin,right,bottom} of planes){
      const a=homogeneous(...origin),b=homogeneous(...right),c=homogeneous(...bottom);
      const dx=b.map((v,i)=>(v-a[i])/1000),dy=c.map((v,i)=>(v-a[i])/1000);
      el.style.transform='matrix3d('+[dx[0],dx[1],0,dx[2],dy[0],dy[1],0,dy[2],0,0,1,0,a[0],a[1],0,a[2]].join(',')+')';
    }
    planes[4].el.style.opacity=String(clamp((18-state.tilt)/7,0,1));
    const label=Math.round(state.tilt)+'° · '+state.zoom.toFixed(1)+'×';
    if(output.textContent!==label)output.textContent=label;
    minus.disabled=target.zoom<=nearZoom+.001;plus.disabled=target.zoom>=farZoom-.001;
  }
  function resize(w,h) {
    unit=Math.max(.01,Math.min(w/1200,h/800));
    width=w/unit;height=h/unit;
    room.style.transform='scale('+unit+')';
    resized=true;redraw();
  }
  function tick(now,framing=null,shake=null) {
    const effectsChanged=Boolean(cinematic || vibration || framing || shake);
    cinematic=framing;vibration=shake;
    const dt=previous?clamp((now-previous)/1000,1/240,.05):1/60;
    previous=now;
    const amount=1-Math.exp(-22*dt);
    let changed=resized || effectsChanged, moving=false;
    for(const k of ['tilt','zoom','x','y']){
      const delta=target[k]-state[k];
      if(!delta)continue;
      changed=true;
      if(Math.abs(delta)<(k==='zoom'?.0003:.025))state[k]=target[k];
      else {state[k]+=delta*amount;moving=true;}
    }
    if(changed)updatePlanes();
    resized=false;
    return moving;
  }
  function restrictPan() {
    target.x=clamp(target.x,-600*target.zoom,600*target.zoom);
    target.y=clamp(target.y,-400*target.zoom,400*target.zoom);
  }
  function localPoint(clientX,clientY){
    const rect=arena.getBoundingClientRect();
    return {x:(clientX-rect.left-rect.width/2)/unit,y:(clientY-rect.top-rect.height/2)/unit};
  }
  function magnify(zoom,from={x:0,y:0},to=from){
    const next=clamp(zoom,nearZoom,farZoom), ratio=next/target.zoom;
    target.x=to.x-(from.x-target.x)*ratio;
    target.y=to.y-(from.y-target.y)*ratio;
    target.zoom=next;restrictPan();redraw();
  }
  function reset(){
    Object.assign(target,{tilt:defaultTilt,zoom:1,x:0,y:0});redraw();
  }
  function pair(){
    const [a,b]=fingers.values();
    return {span:Math.max(2,Math.hypot(a.x-b.x,a.y-b.y)),middle:localPoint((a.x+b.x)/2,(a.y+b.y)/2)};
  }
  function interactive(e){return e.target.closest('button,input,select,textarea,dialog');}
  arena.addEventListener('pointerdown',e=>{
    if(e.button!==0 || interactive(e) || fingers.size>=2)return;
    fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    arena.setPointerCapture(e.pointerId);
  });
  arena.addEventListener('pointermove',e=>{
    const old=fingers.get(e.pointerId);if(!old)return;
    const before=fingers.size===2?pair():null;
    fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(before){
      const after=pair();magnify(target.zoom*after.span/before.span,before.middle,after.middle);
    }else{
      target.tilt=clamp(target.tilt+(old.y-e.clientY)*100/Math.min(610,Math.max(240,arena.clientHeight*.74)),0,90);
      target.x+=(e.clientX-old.x)/unit;
      restrictPan();redraw();
    }
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])
    arena.addEventListener(event,e=>fingers.delete(e.pointerId));
  window.addEventListener('blur',()=>fingers.clear());
  arena.addEventListener('wheel',e=>{
    if(interactive(e))return;
    e.preventDefault();
    const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?arena.clientHeight:1);
    magnify(target.zoom*Math.exp(-clamp(pixels,-240,240)*.0018),localPoint(e.clientX,e.clientY));
  },{passive:false});
  plus.onclick=()=>magnify(target.zoom*1.25);minus.onclick=()=>magnify(target.zoom/1.25);
  document.getElementById('cameraReset').onclick=reset;
  return {resize,tick,project,reset,get width(){return width;},get height(){return height;},get tilt(){return state.tilt;},get unit(){return unit;}};
};
