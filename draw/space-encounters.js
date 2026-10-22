import {ENEMY_STATS,drawEnemyHealth} from './space-enemy-stats.js?v=8.0';
import {markHit,hitFeedback} from './space-hit.js?v=8.0';
// The original game's shuffled winners and timed participant damage remain authoritative.
// Restored enemies have independent health; only actual swept bullet contacts destroy them.
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n)),ease=x=>x*x*(3-2*x);
const body=ENEMY_STATS;
export function sweptHit(a,b,h){const dx=b.x-a.x,dy=b.y-a.y,ox=a.x-h.x,oy=a.y-h.y,A=dx*dx+dy*dy,C=ox*ox+oy*oy-h.r*h.r;if(C<=0)return 0;if(!A)return null;const B=2*(ox*dx+oy*dy),D=B*B-4*A*C;if(D<0)return null;const u=(-B-Math.sqrt(D))/(2*A);return u>=0&&u<=1?u:null;}
export class NativeEncounters{
 constructor(media,audio,events){this.media=media;this.audio=audio;this.events=events;this.entities=[];this.bullets=[];this.enemyShots=[];this.spawned=new Set;this.clock=0;this.serial=0;this.cursor=0;this.stopped=false;this.time=0;this.nativeTicks=0;this.kills={small:0,large:0,ufo:0,ring:0,alien:0};}
 ceasefire(){this.stopped=true;this.entities=[];this.bullets=[];this.enemyShots=[];}
 pose(e,time){const {event,member,type}=e,{W,H}=this.bounds,p=event.fired?{x:event.x,y:event.y}:this.position(event.s,event.at),age=time-event.at,z=ease(clamp((age+3)/3,0,1)),origin=event.side===0?{x:-100,y:H*.18}:event.side===1?{x:W+100,y:H*.22}:{x:W*.5,y:-100};let x=origin.x+(p.x-origin.x)*z,y=origin.y+(p.y-origin.y)*z;
  if(type==='alien'){const v=ease(clamp((Math.min(age,-1)+3)/3,0,1));x=origin.x+(p.x-origin.x)*v;y=origin.y+(Math.max(85,p.y-140)-origin.y)*v;}
  if(type==='ufo'){const left=event.side%2===0,from=left?-90:W+90,to=left?35:W-35;x=from+(to-from)*ease(clamp((age+3)/1.8,0,1));y=p.y;}
  if(type==='small'||type==='large')y+=Math.max(0,age)*(type==='large'?24:120);
  if(type==='ring'){x+=(member-2)*114;y+=Math.sin(member*1.3)*60+Math.max(0,age)*70;}
  return{x,y};
 }
 spawn(event,index){const type=event.type===0?(index%8===1?'large':'small'):event.type===2?'ufo':event.type===3?'ring':'alien';for(let member=0;member<(type==='ring'?5:1);member++)this.entities.push({id:event.key+'-'+member,event,type,member,...body[type],maxHp:body[type].hp,dead:false,shot:false,lastHit:-10,hitCounter:0,hitCount:0});}
 hurt(id,time){if(id==='space-boss'||id.startsWith('space-escort-'))return this.boss?.hurt(time,id)||false;const e=this.entities.find(e=>e.id===id);if(!e||e.dead)return false;e.hp--;markHit(e);e.lastHit=time;e.hitCounter|=6;e.hitCount++;if(e.hp<=0){e.dead=true;e.death=time;this.kills[e.type]++;this.audio.add({kind:'clip',id:'death-'+e.id,clip:e.type+'-death',at:time});}return true;}
 hulls(time){return [...this.entities.filter(e=>!e.dead).map(e=>({x:e.x,y:e.y,r:e.r,key:e.id,entity:e})),...(this.boss?.hulls()||[])];}
 step(time,dt,ships,position,bounds,announced=false){this.time=time;this.nativeTicks+=dt*59.18560606060606;const nativeTicks=Math.floor(this.nativeTicks);this.nativeTicks-=nativeTicks;for(const e of this.entities)e.hitCounter=Math.max(0,e.hitCounter-nativeTicks);this.position=position;this.bounds=bounds;if(announced||this.stopped){this.ceasefire();return;}
  this.events.forEach((e,i)=>{if(e.type!==1&&time>=e.at-3&&time<e.at+4.5&&!this.spawned.has(e.key)){this.spawned.add(e.key);this.spawn(e,i);}});
  for(const e of this.entities){if(!e.dead)Object.assign(e,this.pose(e,time));if(!e.dead&&!e.shot&&['ufo','ring','alien'].includes(e.type)&&time>=e.event.at-1.4){e.shot=true;e.chargedAt=time;const delay=e.type==='alien'?10/60:0,p=position(e.event.s,e.event.at);this.enemyShots.push({id:'shot-'+e.id,type:e.type,from:{x:e.x,y:e.y},to:p,at:time+delay,end:Math.max(time+delay+.1,e.event.at)});const sound=e.type==='alien'?'ym-10d1':e.type==='ufo'?'ym-11d4':null;if(sound)this.audio.add({kind:'sound',id:'fire-'+e.id,sound,at:time});}}
  if(time>=6.2){this.clock+=dt;if(this.clock>=.2){this.clock%=.2;const targets=this.hulls(time);if(targets.length)for(const s of ships.filter(s=>!s.dead).slice(0,24)){const h=targets[this.cursor++%targets.length],p=position(s,time),aimX=h.boss?h.x+Math.sin(this.cursor*2.4)*h.r*.65:h.x,aimY=h.boss?h.y+h.r*.35:h.y,dx=aimX-p.x,dy=aimY-(p.y-30),length=Math.hypot(dx,dy)||1;this.bullets.push({id:++this.serial,x:p.x,y:p.y-30,vx:dx/length*700,vy:dy/length*700,life:Math.max(1.8,length/700+.4)});}}}
  const collisionHulls=this.hulls(time);for(const b of this.bullets){const next={x:b.x+b.vx*dt,y:b.y+b.vy*dt};let hit=null;for(const h of collisionHulls){if(h.entity?.dead||h.boss&&!this.boss.hulls().length)continue;const u=sweptHit(b,next,h);if(u!==null&&(!hit||u<hit.u))hit={u,h};}if(hit){this.hurt(hit.h.key,time);b.life=0;}else{b.x=next.x;b.y=next.y;b.life-=dt;}}
  this.bullets=this.bullets.filter(b=>b.life>0).slice(-350);this.enemyShots=this.enemyShots.filter(s=>time<=s.end);this.entities=this.entities.filter(e=>e.dead?time-e.death<this.media.data.clips[e.type+'-death'].frames.length/60:time<e.event.at+(e.type==='large'?12:4.5));
 }
 draw(ctx,time){if(this.stopped)return;for(const e of this.entities){const feedback=hitFeedback(e),hurt=feedback.flash,clip=e.type+(e.dead?'-death':'-move'),age=e.dead?time-e.death:Math.max(0,time-e.event.at+3);if(!e.dead&&e.type==='large'&&feedback.age<18/59.18560606060606){const stream=e.hp<=e.maxHp/4?(e.hitCount&2?'3d2a6c':'3d2a78'):(e.hitCount&2?'3d2a54':'3d2a60');this.media.drawNative(ctx,'large-native-'+stream,feedback.age,e.x,e.y,e.scale,{body:true});}else this.media.draw(ctx,clip,age,e.x,e.y,e.scale,{loop:!e.dead,flash:hurt});if(!e.dead)drawEnemyHealth(ctx,e.x,e.y,e.r,e.hp,e.maxHp);if(!e.dead&&e.type==='alien'&&e.chargedAt!==undefined&&time-e.chargedAt<10/60){ctx.save();ctx.fillStyle='#baff85';ctx.shadowColor='#93ff4d';ctx.shadowBlur=14;ctx.beginPath();ctx.arc(e.x,e.y+15,4,0,Math.PI*2);ctx.fill();ctx.restore();}}
  // Preserve the original side laser hazard, now emitted by the restored UFO.
  for(const e of this.entities){const age=time-e.event.at;if(e.type!=='ufo'||e.dead||age< -1.2||age>.15)continue;ctx.save();ctx.strokeStyle=age<0?'#ff768060':'#ffccd5';ctx.lineWidth=age<0?1:5;ctx.shadowColor='#ff4569';ctx.shadowBlur=20;ctx.setLineDash(age<0?[6,8]:[]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.event.side%2===0?this.bounds.W:0,e.y);ctx.stroke();ctx.restore();}
  for(const shot of this.enemyShots){if(time<shot.at)continue;const p=clamp((time-shot.at)/(shot.end-shot.at),0,1);this.media.draw(ctx,shot.type+'-shot',time-shot.at,shot.from.x+(shot.to.x-shot.from.x)*p,shot.from.y+(shot.to.y-shot.from.y)*p,1,{loop:true});}
  for(const b of this.bullets)this.media.drawHmg(ctx,b.x,b.y,Math.atan2(b.vy,b.vx),1.4);
 }
}
