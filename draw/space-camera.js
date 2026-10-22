const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export class SpaceCamera{
 constructor(canvas,label,reset){Object.assign(this,{canvas,label,reset,zoom:1,panX:0,panY:0});this.wheel=e=>{if(e.ctrlKey)return;e.preventDefault();const r=canvas.getBoundingClientRect();this.set(this.zoom*Math.exp(-clamp(e.deltaY,-160,160)*.0025),e.clientX-r.left,e.clientY-r.top,r.width,r.height);};canvas.addEventListener('wheel',this.wheel,{passive:false});reset.onclick=()=>{this.zoom=1;this.panX=this.panY=0;this.renderLabel();};this.renderLabel();}
 set(next,x,y,W,H){next=clamp(next,.55,2.5);const wx=(x-W/2-this.panX)/this.zoom,wy=(y-H/2-this.panY)/this.zoom;this.panX=x-W/2-wx*next;this.panY=y-H/2-wy*next;this.zoom=next;if(next<=1){this.panX=this.panY=0;}else{this.panX=clamp(this.panX,-W*(next-1)/2,W*(next-1)/2);this.panY=clamp(this.panY,-H*(next-1)/2,H*(next-1)/2);}this.renderLabel();}
 renderLabel(){this.label.textContent=Math.round(this.zoom*100)+'%';}
 apply(ctx,W,H){ctx.translate(W/2+this.panX,H/2+this.panY);ctx.scale(this.zoom,this.zoom);ctx.translate(-W/2,-H/2);}
 destroy(){this.canvas.removeEventListener('wheel',this.wheel);this.reset.onclick=null;}
}
