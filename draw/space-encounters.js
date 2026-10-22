// The original game's shuffled winners and timed participant damage remain authoritative.
// Restored enemies have independent health; only actual swept bullet contacts destroy them.
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n)),ease=x=>x*x*(3-2*x);
const body={small:{hp:2,r:17,scale:.9},large:{hp:8,r:39,scale:.68},ufo:{hp:4,r:23,scale:.9},ring:{hp:2,r:15,scale:.85},alien:{hp:5,r:24,scale:1}};
export function sweptHit(a,b,h){const dx=b.x-a.x,dy=b.y-a.y,ox=a.x-h.x,oy=a.y-h.y,A=dx*dx+dy*dy,C=ox*ox+oy*oy-h.r*h.r;if(C<=0)return 0;if(!A)return null;const B=2*(ox*dx+oy*dy),D=B*B-4*A*C;if(D<0)return null;const u=(-B-Math.sqrt(D))/(2*A);return u>=0&&u<=1?u:null;}
export class NativeEncounters{
 constructor(media,audio,events){this.media=media;this.audio=audio;this.events=events;this.entities=[];this.bullets=[];this.enemyShots=[];this.spawned=new Set;this.clock=0;this.serial=0;this.cursor=0;this.stopped=false;this.time=0;this.kills={small:0,large:0,ufo:0,ring:0,alien:0};}
 ceasefire(){this.stopped=true;this.entities=[];this.bullets=[];this.enemyShots=[];}
 pose(e,time){const {event,member,type}=e,{W,H}=this.bounds,p=event.fired?{x:event.x,y:event.y}:this.position(event.s,event.at),age=time-event.at,z=ease(clamp((age+3)/3,0,1)),origin=event.side===0?{x:-100,y:H*.18}:event.side===1?{x:W+100,y:H*.22}:{x:W*.5,y:-100};let x=origin.x+(p.x-origin.x)*z,y=origin.y+(p.y-origin.y)*z;
  if(type==='alien'){const v=ease(clamp((Math.min(age,-1)+3)/3,0,1));x=origin.x+(p.x-origin.x)*v;y=origin.y+(Math.max(85,p.y-140)-origin.y)*v;}
  if(type==='ufo'){const left=event.side%2===0,from=left?-90:W+90,to=left?35:W-35;x=from+(to-from)*ease(clamp((age+3)/1.8,0,1));y=p.y;}
  if(type==='small'||type==='large')y+=Math.max(0,age)*120;
  if(type==='ring'){x+=(member-2)*38;y+=Math.sin(member*1.3)*20+Math.max(0,age)*70;}
  return{x,y};
 }
 spawn(event,index){const type=event.type===0?(index%2?'large':'small'):event.type===2?'ufo':event.type===3?'ring':'alien';for(let member=0;member<(type==='ring'?5:1);member++)this.entities.push({id:event.key+'-'+member,event,type,member,...body[type],dead:false,shot:false,lastHit:-10});}
 hurt(id,time){const e=this.entities.find(e=>e.id===id);if(!e||e.dead||time<e.event.at-1.15)return false;e.hp--;e.lastHit=time;if(e.hp<=0){e.dead=true;e.death=time;this.kills[e.type]++;this.audio.add({kind:'clip',id:'death-'+e.id,clip:e.type+'-death',at:time});}return true;}
 hulls(time){return this.entities.filter(e=>!e.dead&&time>=e.event.at-1.15).map(e=>({x:e.x,y:e.y,r:e.r,key:e.id,entity:e}));}
 step(time,dt,ships,position,bounds,announced=false){this.time=time;this.position=position;this.bounds=bounds;if(announced||this.stopped){this.ceasefire();return;}
  this.events.forEach((e,i)=>{if(e.type!==1&&time>=e.at-3&&time<e.at+4.5&&!this.spawned.has(e.key)){this.spawned.add(e.key);this.spawn(e,i);}});
  for(const e of this.entities){if(!e.dead)Object.assign(e,this.pose(e,time));if(!e.dead&&!e.shot&&['ufo','ring','alien'].includes(e.type)&&time>=e.event.at-1.4){e.shot=true;e.chargedAt=time;const delay=e.type==='alien'?10/60:0,p=position(e.event.s,e.event.at);this.enemyShots.push({id:'shot-'+e.id,type:e.type,from:{x:e.x,y:e.y},to:p,at:time+delay,end:Math.max(time+delay+.1,e.event.at)});const sound=e.type==='alien'?'ym-10d1':e.type==='ufo'?'ym-11d4':null;if(sound)this.audio.add({kind:'sound',id:'fire-'+e.id,sound,at:time});}}
  if(time>=6.2){this.clock+=dt;if(this.clock>=.2){this.clock%=.2;const targets=this.hulls(time);if(targets.length)for(const s of ships.filter(s=>!s.dead).slice(0,24)){const h=targets[this.cursor++%targets.length],p=position(s,time),dx=h.x-p.x,dy=h.y-(p.y-30),length=Math.hypot(dx,dy)||1;this.bullets.push({id:++this.serial,x:p.x,y:p.y-30,vx:dx/length*700,vy:dy/length*700,life:1.8});}}}
  for(const b of this.bullets){const next={x:b.x+b.vx*dt,y:b.y+b.vy*dt};let hit=null;for(const h of this.hulls(time)){const u=sweptHit(b,next,h);if(u!==null&&(!hit||u<hit.u))hit={u,h};}if(hit){this.hurt(hit.h.key,time);b.life=0;}else{b.x=next.x;b.y=next.y;b.life-=dt;}}
  this.bullets=this.bullets.filter(b=>b.life>0).slice(-350);this.enemyShots=this.enemyShots.filter(s=>time<=s.end);this.entities=this.entities.filter(e=>e.dead?time-e.death<this.media.data.clips[e.type+'-death'].frames.length/60:time<e.event.at+4.5);
 }
 draw(ctx,time){if(this.stopped)return;for(const e of this.entities){const hurt=!e.dead&&time-e.lastHit<.16,clip=e.type+(e.dead?'-death':hurt?'-hurt':'-move'),age=e.dead?time-e.death:hurt?time-e.lastHit:Math.max(0,time-e.event.at+3);this.media.draw(ctx,clip,age,e.x,e.y,e.scale,{loop:!e.dead});if(!e.dead&&e.type==='alien'&&e.chargedAt!==undefined&&time-e.chargedAt<10/60){ctx.save();ctx.fillStyle='#baff85';ctx.shadowColor='#93ff4d';ctx.shadowBlur=14;ctx.beginPath();ctx.arc(e.x,e.y+15,4,0,Math.PI*2);ctx.fill();ctx.restore();}}
  // Preserve the original side laser hazard, now emitted by the restored UFO.
  for(const e of this.entities){const age=time-e.event.at;if(e.type!=='ufo'||e.dead||age< -1.2||age>.15)continue;ctx.save();ctx.strokeStyle=age<0?'#ff768060':'#ffccd5';ctx.lineWidth=age<0?1:5;ctx.shadowColor='#ff4569';ctx.shadowBlur=20;ctx.setLineDash(age<0?[6,8]:[]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.event.side%2===0?this.bounds.W:0,e.y);ctx.stroke();ctx.restore();}
  for(const shot of this.enemyShots){if(time<shot.at)continue;const p=clamp((time-shot.at)/(shot.end-shot.at),0,1);this.media.draw(ctx,shot.type+'-shot',time-shot.at,shot.from.x+(shot.to.x-shot.from.x)*p,shot.from.y+(shot.to.y-shot.from.y)*p,1,{loop:true});}
  ctx.save();ctx.strokeStyle='#b1f7ff';ctx.lineWidth=2;ctx.shadowColor='#63ddff';ctx.shadowBlur=7;for(const b of this.bullets){const n=Math.hypot(b.vx,b.vy)||1;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-b.vx/n*14,b.y-b.vy/n*14);ctx.stroke();}ctx.restore();
 }
}
