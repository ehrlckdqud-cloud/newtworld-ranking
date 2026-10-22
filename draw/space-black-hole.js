const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=v=>v*v*(3-2*v);
export const BLACK_HOLE_RULES=Object.freeze({frequencyDivisor:3,sizeMultiplier:3,lifetime:5.2*3});
// Uploaded movie frames have no audio track. The simulation clock controls playback,
// including pause, replay and game speed; there is no independent video timer.
export class SpaceBlackHole{
 constructor(){this.events=[];this.active=[];}
 async load(){const base=new URL('./space-assets/',import.meta.url),r=await fetch(new URL('black-hole-video-v12.json',base));if(!r.ok)throw Error('블랙홀 영상을 불러오지 못했어요.');this.movie=await r.json();const parts=await Promise.all(this.movie.parts.map(async p=>{const r=await fetch(new URL(p.url,base));if(!r.ok)throw Error('블랙홀 영상 조각을 불러오지 못했어요.');const b=await r.arrayBuffer();if(b.byteLength!==p.bytes)throw Error('블랙홀 영상이 손상됐어요.');return b;}));const url=URL.createObjectURL(new Blob(parts,{type:this.movie.mime}));try{this.image=new Image;this.image.src=url;await this.image.decode();}finally{URL.revokeObjectURL(url);}return this;}
 reset(events){this.events=events.filter(e=>e.type===1).filter((_,i)=>i%BLACK_HOLE_RULES.frequencyDivisor===0).map(e=>({event:e,start:e.at-3}));this.active=[];}
 step(time,dt,ships,position,bounds,capture,stopped=false){const {W,H}=bounds,v=bounds.view||{left:0,top:0,right:W,bottom:H},r=Math.min(W,H)*.085*BLACK_HOLE_RULES.sizeMultiplier;this.active=[];
  if(!stopped)for(const h of this.events){const age=time-h.start;if(age<0||age>BLACK_HOLE_RULES.lifetime)continue;if(!h.goal){const p=position(h.event.s,h.event.at);p.x-=h.event.s.gravityX||0;p.y-=h.event.s.gravityY||0;const mx=Math.min(r*1.65,(v.right-v.left)/2),my=Math.min(r*.928125,(v.bottom-v.top)/2);h.goal={x:clamp(p.x,v.left+mx,v.right-mx),y:clamp(p.y,v.top+my,v.bottom-my)};}const pad=r*1.8,origin=h.event.side===0?{x:v.left-pad,y:h.goal.y}:h.event.side===1?{x:v.right+pad,y:h.goal.y}:{x:h.goal.x,y:v.top-pad},z=ease(clamp(age/5,0,1)),fade=Math.min(clamp(age/.6,0,1),clamp((BLACK_HOLE_RULES.lifetime-age)/1.2,0,1));this.active.push({...h,x:origin.x+(h.goal.x-origin.x)*z,y:origin.y+(h.goal.y-origin.y)*z,r,age,fade});}
  for(const s of ships){if(s.dead)continue;const p=position(s,time);let fx=0,fy=0,nearest=null;
   for(const h of this.active){const dx=h.x-p.x,dy=h.y-p.y,d=Math.hypot(dx,dy),reach=h.r*2.6;if(d>=reach)continue;const strength=(1-d/reach)*h.fade,force=850*strength,inv=1/Math.max(d,12);if(s.gravityOrbit===h.event){const angle=(s.seed||s.id||0)+time*1.1,ox=h.x+Math.cos(angle)*h.r*.72,oy=h.y+Math.sin(angle)*h.r*.54;fx+=(ox-p.x)*7*h.fade;fy+=(oy-p.y)*7*h.fade;}else{fx+=(dx-dy*.16)*inv*force;fy+=(dy+dx*.16)*inv*force;}if(!nearest||d<nearest.d)nearest={...h,d};}
   const damp=Math.exp(-3*dt);s.gravityVX=((s.gravityVX||0)+fx*dt)*damp;s.gravityVY=((s.gravityVY||0)+fy*dt)*damp;s.gravityX=(s.gravityX||0)+s.gravityVX*dt;s.gravityY=(s.gravityY||0)+s.gravityVY*dt;
   if(!nearest){const release=Math.exp(-1.8*dt);s.gravityX*=release;s.gravityY*=release;s.gravityScale=1;}else{const core=nearest.r*.44;s.gravityScale=clamp(nearest.d/(core*1.4),.35,1);if(nearest.d<core*.72&&time-(s.lastGravityCapture??-10)>.7){s.lastGravityCapture=time;capture?.(s,time,{x:nearest.x,y:nearest.y});if(!s.dead)s.gravityOrbit=nearest.event;}}
  }
 }
 draw(ctx,x,y,r,time,opacity=1){if(!this.image||!this.movie)return;const m=this.movie,frame=Math.floor(Math.max(0,time)*m.fps)%m.frames,sx=frame%m.columns*m.width,sy=Math.floor(frame/m.columns)*m.height,w=r*3.3,h=w*m.height/m.width;ctx.save();ctx.globalAlpha=opacity;ctx.drawImage(this.image,sx,sy,m.width,m.height,x-w/2,y-h/2,w,h);ctx.restore();}
 drawAll(ctx){for(const h of this.active)this.draw(ctx,h.x,h.y,h.r,h.age,h.fade);}
}
