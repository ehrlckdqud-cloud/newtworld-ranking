function attachBadgeOrbit(banner){
 const canvas=document.createElement('canvas');canvas.className='nw-badge-orbit';canvas.setAttribute('aria-hidden','true');banner.prepend(canvas);
 const removers=[];function on(target,event,fn){target.addEventListener(event,fn);removers.push(()=>target.removeEventListener(event,fn));}
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const pad=18,count=128,forced=canvas.hasAttribute('data-preview');
 let w=0,h=0,r=0,length=0,ratio=1,frame=0,epoch=0,lastPaint=-Infinity,hovered=banner.matches(':hover'),focused=banner.matches(':focus-visible');
 function point(distance){
  let d=((distance%length)+length)%length;
  const x=w-2*r,y=h-2*r,a=Math.PI*r/2;
  if(d<=x)return{x:r+d,y:0};d-=x;
  if(d<=a){const t=-Math.PI/2+d/r;return{x:w-r+r*Math.cos(t),y:r+r*Math.sin(t)};}d-=a;
  if(d<=y)return{x:w,y:r+d};d-=y;
  if(d<=a){const t=d/r;return{x:w-r+r*Math.cos(t),y:h-r+r*Math.sin(t)};}d-=a;
  if(d<=x)return{x:w-r-d,y:h};d-=x;
  if(d<=a){const t=Math.PI/2+d/r;return{x:r+r*Math.cos(t),y:h-r+r*Math.sin(t)};}d-=a;
  if(d<=y)return{x:0,y:h-r-d};d-=y;
  const t=Math.PI+d/r;return{x:r+r*Math.cos(t),y:r+r*Math.sin(t)};
 }
 function outline(){
  ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(w-r,0);ctx.arc(w-r,r,r,-Math.PI/2,0);
  ctx.lineTo(w,h-r);ctx.arc(w-r,h-r,r,0,Math.PI/2);ctx.lineTo(r,h);
  ctx.arc(r,h-r,r,Math.PI/2,Math.PI);ctx.lineTo(0,r);ctx.arc(r,r,r,Math.PI,Math.PI*1.5);ctx.closePath();
 }
 function paint(now){
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w+2*pad,h+2*pad);ctx.save();ctx.translate(pad,pad);
  ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#edc36b';ctx.lineWidth=1.25;ctx.globalAlpha=.64;ctx.shadowColor='#edc36b';ctx.shadowBlur=4;outline();ctx.stroke();
  const duration=5000/1.5,front=(((now-epoch)%duration+duration)%duration)/duration*length,tail=length*.30;
  // Both ribbons use this ONE front value. The second is always exactly L/2 ahead.
  for(let ribbon=0;ribbon<2;ribbon++){
   const head=front+ribbon*length/2;
   const samples=Array.from({length:count+1},(_,i)=>{
    const t=i/count,d=head-tail+tail*t,p=point(d),before=point(d-.05),after=point(d+.05),dx=after.x-before.x,dy=after.y-before.y,norm=Math.hypot(dx,dy)||1;
    return{x:p.x,y:p.y,nx:-dy/norm,ny:dx/norm,width:3.8*Math.pow(t,1.8)};
   });
   // One continuous filled shape per layer avoids dots from overlapping stroke caps.
   for(const layer of ['halo','line','core']){
    const factor=layer==='halo'?1.5:layer==='line'?1:.32;
    ctx.globalAlpha=layer==='halo'?.32:layer==='line'?.96:.90;
    ctx.fillStyle=layer==='halo'?'#ffb72e':layer==='line'?'#ffd66d':'#fff5d2';
    ctx.shadowBlur=layer==='halo'?7:0;ctx.shadowColor='#ffbc35';
    ctx.beginPath();
    samples.forEach((p,i)=>{const half=p.width*factor/2;ctx[i?'lineTo':'moveTo'](p.x+p.nx*half,p.y+p.ny*half);});
    const tip=samples[count],angle=Math.atan2(tip.ny,tip.nx);
    ctx.arc(tip.x,tip.y,tip.width*factor/2,angle,angle-Math.PI,true);
    for(let i=count;i>=0;i--){const p=samples[i],half=p.width*factor/2;ctx.lineTo(p.x-p.nx*half,p.y-p.ny*half);}
    ctx.closePath();ctx.fill();
   }
  }
  ctx.restore();
 }
 function measure(){
  const style=getComputedStyle(banner),left=parseFloat(style.borderLeftWidth)||0,right=parseFloat(style.borderRightWidth)||0,
        top=parseFloat(style.borderTopWidth)||0,bottom=parseFloat(style.borderBottomWidth)||0;
  const width=parseFloat(style.width),height=parseFloat(style.height),borderBox=style.boxSizing==='border-box';
  const outerW=borderBox&&Number.isFinite(width)?width:banner.clientWidth+left+right,
        outerH=borderBox&&Number.isFinite(height)?height:banner.clientHeight+top+bottom;
  w=Math.max(8,outerW-(left+right)/2);h=Math.max(8,outerH-(top+bottom)/2);
  r=Math.max(.5,Math.min((parseFloat(style.borderTopLeftRadius)||22)-(left+top)/4,w/2,h/2));
  length=2*(w+h-4*r)+2*Math.PI*r;ratio=Math.min(3,window.devicePixelRatio||1);
  canvas.style.left=(-left/2-pad)+'px';canvas.style.top=(-top/2-pad)+'px';canvas.style.right='auto';canvas.style.bottom='auto';
  canvas.style.width=(w+2*pad)+'px';canvas.style.height=(h+2*pad)+'px';canvas.width=Math.ceil((w+2*pad)*ratio);canvas.height=Math.ceil((h+2*pad)*ratio);
  paint(performance.now());
 }
 function active(){return !document.hidden&&(forced||(window.innerWidth>=721&&window.matchMedia('(any-hover:hover)').matches&&(hovered||focused)));}
 function tick(now){frame=0;if(!active())return;if(now-lastPaint>=30){paint(now);lastPaint=now;}frame=requestAnimationFrame(tick);}
 function sync(){if(active()){if(!frame){epoch=performance.now();lastPaint=-Infinity;paint(epoch);frame=requestAnimationFrame(tick);}}else if(frame){cancelAnimationFrame(frame);frame=0;}}
 on(banner,'pointerenter',()=>{hovered=true;sync();});on(banner,'pointerleave',()=>{hovered=false;sync();});
 on(banner,'focus',()=>{focused=true;sync();});on(banner,'blur',()=>{focused=false;sync();});
 on(document,'visibilitychange',sync);on(window,'pageshow',sync);
 on(window,'resize',()=>{measure();sync();});
 const resize=typeof ResizeObserver==='function'?new ResizeObserver(measure):null;resize?.observe(banner);
 measure();sync();
 return()=>{if(frame)cancelAnimationFrame(frame);resize?.disconnect();removers.forEach(remove=>remove());canvas.remove();};
}
(function(){
 'use strict';
 let disposers=[];
 window.NWInitBadgeHover=function(){
  disposers.forEach(dispose=>dispose());disposers=[];
  document.querySelectorAll('.badge-card.unlocked').forEach(card=>{
   try{const dispose=attachBadgeOrbit(card);if(dispose)disposers.push(dispose);}catch(_){}
  });
 };
 window.NWInitBadgeHover();
})();

// Game picker artwork and shared close-button alignment.
import('./space-picker-v9.js?v=11.0').catch(error=>console.error('Game picker enhancement failed',error));
