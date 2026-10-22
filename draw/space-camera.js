const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export class SpaceCamera{
 constructor(canvas,label,reset){Object.assign(this,{canvas,label,reset,zoom:1,panX:0,panY:0,targetZoom:1,targetPanX:0,targetPanY:0});this.wheel=e=>{if(e.ctrlKey)return;e.preventDefault();const r=canvas.getBoundingClientRect(),unit=e.deltaMode===1?16:e.deltaMode===2?r.height:1;this.set(this.targetZoom*Math.exp(-clamp(e.deltaY*unit,-160,160)*.0018),e.clientX-r.left,e.clientY-r.top,r.width,r.height);};canvas.addEventListener('wheel',this.wheel,{passive:false});reset.onclick=()=>{this.targetZoom=1;this.targetPanX=this.targetPanY=0;};this.renderLabel();}
 set(next,x,y,W,H){next=clamp(next,.55,2.5);const wx=(x-W/2-this.targetPanX)/this.targetZoom,wy=(y-H/2-this.targetPanY)/this.targetZoom;this.targetPanX=x-W/2-wx*next;this.targetPanY=y-H/2-wy*next;this.targetZoom=next;if(next<=1){this.targetPanX=this.targetPanY=0;}else{this.targetPanX=clamp(this.targetPanX,-W*(next-1)/2,W*(next-1)/2);this.targetPanY=clamp(this.targetPanY,-H*(next-1)/2,H*(next-1)/2);}}
 update(dt){const a=1-Math.exp(-Math.max(0,dt)/.095);for(const [value,target]of [['zoom','targetZoom'],['panX','targetPanX'],['panY','targetPanY']]){this[value]+=(this[target]-this[value])*a;if(Math.abs(this[target]-this[value])<.0001)this[value]=this[target];}this.renderLabel();}
 renderLabel(){this.label.textContent=Math.round(this.zoom*100)+'%';}
 visibleBounds(W,H){return{left:W/2+(-W/2-this.panX)/this.zoom-2/this.zoom,right:W/2+(W/2-this.panX)/this.zoom+2/this.zoom,top:H/2+(-H/2-this.panY)/this.zoom-2/this.zoom,bottom:H/2+(H/2-this.panY)/this.zoom+2/this.zoom};}
 apply(ctx,W,H){ctx.translate(W/2+this.panX,H/2+this.panY);ctx.scale(this.zoom,this.zoom);ctx.translate(-W/2,-H/2);}
 destroy(){this.canvas.removeEventListener('wheel',this.wheel);this.reset.onclick=null;}
}
