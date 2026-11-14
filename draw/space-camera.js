const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export class SpaceCamera{
 constructor(canvas,label,reset){Object.assign(this,{canvas,label,reset,zoom:1,panX:0,panY:0,targetZoom:1,targetPanX:0,targetPanY:0});this.pendingWheel=[];this.wheel=e=>{if(e.ctrlKey)return;e.preventDefault();this.pendingWheel.push({deltaY:e.deltaY,deltaMode:e.deltaMode,clientX:e.clientX,clientY:e.clientY});};canvas.addEventListener('wheel',this.wheel,{passive:false});reset.onclick=()=>{this.pendingWheel.length=0;this.targetZoom=1;this.targetPanX=this.targetPanY=0;};this.installTouch();this.renderLabel();}
 installTouch(){
  const canvas=this.canvas;canvas.style.touchAction='none';
  let previous=null;
  const sample=e=>{
   const [a,b]=Array.from(e.touches).filter(t=>t.target===canvas);
   if(!a||!b)return null;
   const r=canvas.getBoundingClientRect();
   return {x:(a.clientX+b.clientX)/2-r.left,y:(a.clientY+b.clientY)/2-r.top,d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),w:r.width,h:r.height};
  };
  const rebase=e=>{previous=sample(e)};
  const move=e=>{
   const now=sample(e),old=previous;previous=now;
   if(!now||!old||old.d<1||now.d<1)return;
   e.preventDefault();
   this.targetZoom=this.zoom;this.targetPanX=this.panX+now.x-old.x;this.targetPanY=this.panY+now.y-old.y;
   this.set(this.zoom*now.d/old.d,now.x,now.y,now.w,now.h);
   this.zoom=this.targetZoom;this.panX=this.targetPanX;this.panY=this.targetPanY;this.renderLabel();
  };
  for(const type of ['touchstart','touchend','touchcancel'])canvas.addEventListener(type,rebase,{passive:true});
  canvas.addEventListener('touchmove',move,{passive:false});
  this.removeTouch=()=>{for(const type of ['touchstart','touchend','touchcancel'])canvas.removeEventListener(type,rebase);canvas.removeEventListener('touchmove',move)};
 }
 set(next,x,y,W,H){next=clamp(next,.55,2.5);const wx=(x-W/2-this.targetPanX)/this.targetZoom,wy=(y-H/2-this.targetPanY)/this.targetZoom;this.targetPanX=x-W/2-wx*next;this.targetPanY=y-H/2-wy*next;this.targetZoom=next;if(next<=1){this.targetPanX=this.targetPanY=0;}else{this.targetPanX=clamp(this.targetPanX,-W*(next-1)/2,W*(next-1)/2);this.targetPanY=clamp(this.targetPanY,-H*(next-1)/2,H*(next-1)/2);}}
 update(dt){if(this.pendingWheel.length){const r=this.canvas.getBoundingClientRect();for(const e of this.pendingWheel){const unit=e.deltaMode===1?16:e.deltaMode===2?r.height:1;this.set(this.targetZoom*Math.exp(-clamp(e.deltaY*unit,-160,160)*.0018),e.clientX-r.left,e.clientY-r.top,r.width,r.height);}this.pendingWheel.length=0;}const a=1-Math.exp(-Math.max(0,dt)/.095);for(const [value,target]of [['zoom','targetZoom'],['panX','targetPanX'],['panY','targetPanY']]){this[value]+=(this[target]-this[value])*a;if(Math.abs(this[target]-this[value])<.0001)this[value]=this[target];}this.renderLabel();}
 renderLabel(){const text=Math.round(this.zoom*100)+'%';if(text!==this.lastLabel){this.label.textContent=text;this.lastLabel=text;}}
 visibleBounds(W,H){return{left:W/2+(-W/2-this.panX)/this.zoom-2/this.zoom,right:W/2+(W/2-this.panX)/this.zoom+2/this.zoom,top:H/2+(-H/2-this.panY)/this.zoom-2/this.zoom,bottom:H/2+(H/2-this.panY)/this.zoom+2/this.zoom};}
 apply(ctx,W,H){ctx.translate(W/2+this.panX,H/2+this.panY);ctx.scale(this.zoom,this.zoom);ctx.translate(-W/2,-H/2);}
 destroy(){this.removeTouch();this.canvas.removeEventListener('wheel',this.wheel);this.reset.onclick=null;}
}
