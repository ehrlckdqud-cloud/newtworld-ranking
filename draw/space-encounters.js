import {SpaceEnemyFire} from './space-enemy-fire.js?v=18.0';
import {SpaceShaftEnemies} from './space-shaft-enemies.js?v=18.0';
import {steerPilots} from './space-pilots.js?v=18.0';
import {SpaceHLoadout} from './space-h-loadout.js?v=18.0';
import {SpaceCWeapon} from './space-c-weapon.js?v=18.0';
import {ENEMY_STATS,drawEnemyHealth,scaledEnemyHp} from './space-enemy-stats.js?v=18.0';
import {markHit,hitFeedback} from './space-hit.js?v=18.0';
// Shuffled finalists are preserved; scheduled damage now requires a visible enemy projectile contact.
// Restored enemies have independent health; only actual swept bullet contacts destroy them.
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n)),ease=x=>x*x*(3-2*x);
const body=ENEMY_STATS;
export function sweptHit(a,b,h){const dx=b.x-a.x,dy=b.y-a.y,ox=a.x-h.x,oy=a.y-h.y,A=dx*dx+dy*dy,C=ox*ox+oy*oy-h.r*h.r;if(C<=0)return 0;if(!A)return null;const B=2*(ox*dx+oy*dy),D=B*B-4*A*C;if(D<0)return null;const u=(-B-Math.sqrt(D))/(2*A);return u>=0&&u<=1?u:null;}
export class NativeEncounters{
 constructor(media,audio,events,rosterCount=50){this.rosterCount=rosterCount;this.hostileFire=new SpaceEnemyFire(media,audio);this.shaft=new SpaceShaftEnemies(media,audio,rosterCount);this.cWeapon=new SpaceCWeapon(media,audio);this.hLoadout=new SpaceHLoadout(media,audio);this.media=media;this.audio=audio;this.events=events;this.entities=[];this.bullets=[];this.enemyShots=[];this.impacts=[];this.spawned=new Set;this.clock=0;this.serial=0;this.cursor=0;this.stopped=false;this.time=0;this.nativeTicks=0;this.kills={small:0,large:0,ufo:0,ring:0,alien:0};}
 steerPilots(time,dt,ships,position,bounds){steerPilots(time,dt,ships,position,bounds,this.cWeapon,this.boss);}
 sweptContact(a,b,h){return sweptHit(a,b,h);}
 ceasefire(){this.hostileFire.clear();this.shaft.ceasefire();this.cWeapon.ceasefire();this.stopped=true;this.bullets=[];this.enemyShots=[];this.impacts=[];}
 view(){return this.bounds?.view||{left:0,top:0,right:this.bounds?.W||800,bottom:this.bounds?.H||610};}
 typeFor(event,index){return event.type===0?(index%8===1?'large':'small'):event.type===2?'ufo':event.type===3?'ring':'alien';}
 waveSize(event,index){const type=this.typeFor(event,index);return type==='small'?8:type==='ring'?10:2;}
 pose(e,time){
  const age=Math.max(0,time-e.born),v=this.view(),pad=e.r+90,spanX=v.right-v.left+2*pad,spanY=v.bottom-v.top+2*pad;
  if(e.retirement){const r=e.retirement,z=clamp((time-r.at)/4.4,0,1);return{x:r.x+(r.exit-r.x)*z,y:r.y};}
  if(e.type==='ufo'){const phase=age%5,goalY=v.top+Math.max(e.r+26,Math.min(140,(v.bottom-v.top)*.16));if(phase<.55){const z=ease(phase/.55);return{x:e.origin.x,y:e.origin.y+(goalY-e.origin.y)*z};}const z=clamp((phase-1.12)/1.45,0,1),exit=e.exitSide<0?v.left-pad:v.right+pad;return{x:e.origin.x+(exit-e.origin.x)*z,y:goalY};}
  if(e.type==='small'&&e.aim){return{x:e.origin.x+e.aim.vx*age,y:e.origin.y+e.aim.vy*age};}
  const period=e.type==='large'?26:e.type==='small'?3:12,phase=(age%period)/period,side=e.type==='small'?2:e.side;
  if(side===2)return{x:e.origin.x,y:v.top-pad+spanY*phase};
  return{x:side===0?v.left-pad+spanX*phase:v.right+pad-spanX*phase,y:e.origin.y+Math.sin(phase*Math.PI*2+e.member)*Math.min(55,(v.bottom-v.top)*.06)};
 }
 spawn(event,index){
  const type=this.typeFor(event,index),v=this.view();if(type==='large'&&['fusion','second','collapse','orbs','complete'].includes(this.boss?.stage))return;
  const copies=type==='small'?8:2;
  for(let copy=0;copy<copies;copy++)for(let member=0;member<(type==='ring'?5:1);member++){
   const stats=body[type],r=stats.r,p=this.position?.(event.s,event.at)||{x:(v.left+v.right)/2,y:(v.top+v.bottom)/2},side=['ufo','small'].includes(type)?2:(event.side+copy)%3,lane=type==='small'?(copy+.5)/8:clamp((p.x-v.left)/(v.right-v.left)+(copy?1:-1)*.12,.08,.92),origin=side===0?{x:v.left-r-90,y:clamp(p.y+(copy?60:-60),v.top,v.bottom)}:side===1?{x:v.right+r+90,y:clamp(p.y+(copy?60:-60),v.top,v.bottom)}:{x:type==='ring'?clamp(p.x+(member-2)*90+(copy?45:-45),v.left,v.right):v.left+(v.right-v.left)*lane,y:v.top-r-90-member*20},hp=scaledEnemyHp(stats.hp,this.rosterCount);
   let aim;if(type==='small'){const live=(this.ships||[]).filter(s=>!s.dead),target=live.length?live[(index*8+copy)%live.length]:event.s,tp=this.position?.(target,this.time??event.at)||p,speed=(v.bottom-v.top+2*(r+90))/3*2,dx=tp.x-origin.x,dy=tp.y-origin.y,length=Math.hypot(dx,dy)||1;aim={vx:dx/length*speed,vy:dy/length*speed,target:target?.id};}
   this.entities.push({aim,id:event.key+'-'+copy+'-'+member,event,type,member,copy,side,exitSide:(index+copy)%2?-1:1,...stats,hp,maxHp:hp,origin,born:(this.time??event.at-3)+copy*.06,dead:false,shot:false,lastHit:-10,hitCounter:0,hitCount:0});
  }
 }

 hurt(id,time){if(id.startsWith('shaft-'))return this.shaft.hurt(id,time,this);if(id==='space-boss'||id.startsWith('space-escort-')){const e=this.boss?.escortFleet?.entities.get(id),wasAlive=e&&!e.dead,stage=this.boss?.stage,hull=id==='space-boss'?this.boss?.hulls().find(h=>h.boss):null,hit=this.boss?.hurt(time,id)||false;if(wasAlive&&e.dead)this.cWeapon.killedEnemy(e,time);if(hull&&stage==='first'&&this.boss.stage==='fusion')this.cWeapon.killedEnemy({id:'space-boss-first',x:hull.x,y:hull.y},time);return hit;}const e=this.entities.find(e=>e.id===id);if(!e||e.dead)return false;e.hp--;markHit(e);e.lastHit=time;e.hitCounter|=6;e.hitCount++;if(e.hp<=0){e.dead=true;e.death=time;this.kills[e.type]++;this.cWeapon.killedEnemy(e,time);this.audio.add({kind:'clip',id:'death-'+e.id,clip:e.type+'-death',at:time});}return true;}
 hulls(time){return [...this.entities.filter(e=>!e.dead&&!e.retirement&&e.x+e.r>this.view().left&&e.x-e.r<this.view().right&&e.y+e.r>this.view().top&&e.y-e.r<this.view().bottom).map(e=>({x:e.x,y:e.y,r:e.r,key:e.id,entity:e})),...this.shaft.hulls(),...(this.boss?.hulls()||[])];}
 step(time,dt,ships,position,bounds,announced=false){this.time=time;this.hLoadout.step(time);this.nativeTicks+=dt*59.18560606060606;const nativeTicks=Math.floor(this.nativeTicks);this.nativeTicks-=nativeTicks;for(const e of this.entities)e.hitCounter=Math.max(0,e.hitCounter-nativeTicks);this.position=position;this.bounds=bounds;this.ships=ships;if(announced||this.stopped){this.ceasefire();return;}
  const finalApproach=['fusion','second','collapse','orbs','complete'].includes(this.boss?.stage),v=this.view();
  if(finalApproach)for(const e of this.entities)if(e.type==='large'&&!e.dead&&!e.retirement){const dx=e.x-(e.previous?.x??e.x),side=dx?Math.sign(dx):e.x<(v.left+v.right)/2?-1:1;e.retirement={at:time,x:e.x,y:e.y,exit:side<0?v.left-e.r-100:v.right+e.r+100};}
  let admitted=this.entities.filter(e=>!e.dead&&!e.retirement).length;
  this.events.forEach((event,i)=>{if((event.type===1||event.type===5)||time<event.at-3||this.spawned.has(event.key))return;if(time>event.at+2){this.spawned.add(event.key);return;}const type=this.typeFor(event,i),size=this.waveSize(event,i);if(finalApproach&&type==='large'){this.spawned.add(event.key);return;}if(admitted+size>112)return;this.spawned.add(event.key);this.spawn(event,i);admitted+=size;});
  for(const e of this.entities){
   if(!e.dead){e.previous={x:e.x??e.origin.x,y:e.y??e.origin.y};Object.assign(e,this.pose(e,time));}
   if(e.type==='ufo'){const cycle=Math.floor(Math.max(0,time-e.born)/5);if(e.cycle!==cycle){e.cycle=cycle;e.shot=false;}}
   const age=Math.max(0,time-e.born),canFire=e.type==='ufo'?age%5>=.58&&age%5<1.08:time>=e.event.at-1.4;
   if(!e.dead&&!e.shot&&['ufo','ring','alien'].includes(e.type)&&canFire){e.shot=true;e.chargedAt=time;const delay=e.type==='alien'?10/60:0,p=e.type==='ufo'?{x:e.x,y:v.bottom+80}:position(e.event.s,e.event.at);this.enemyShots.push({id:'shot-'+e.id+'-'+(e.cycle||0),type:e.type,from:{x:e.x,y:e.y},to:p,at:time+delay,end:e.type==='ufo'?time+29/59.18560606060606:Math.max(time+delay+.1,e.event.at),owner:e.id});const sound=e.type==='alien'?'ym-10d1':e.type==='ufo'?'ym-11d4':null;if(sound)this.audio.add({kind:'sound',id:'fire-'+e.id+'-'+(e.cycle||0),sound,at:time});}
  }
  if(time>=6.2){const cadence=1/18;this.clock+=dt;if(this.clock+1e-9>=cadence){this.clock=Math.max(0,this.clock-cadence)%cadence;const targets=this.hulls(time);for(const s of ships.filter(s=>!s.dead&&s.hReady!==false)){const bossTarget=targets.find(h=>h.boss),n=this.cursor++,p=position(s,time),h=(bossTarget&&(time>=this.boss.duration||n%2===0)?bossTarget:targets[Math.floor(n/2)%targets.length])||{x:p.x,y:v.top-120},radius=2*(this.rosterCount>150?10:this.rosterCount>100?13:this.rosterCount>50?16:this.rosterCount>25?21:28),angle=Math.sin(time*1.5+(s.seed||0))*.08,aimX=h.boss?h.x+Math.sin(this.cursor*2.4)*h.r*.65:h.x,aimY=h.boss?h.y+h.r*.35:h.y;const cActive=this.cWeapon.active(s,time);s.hTipMuzzleAt=time;s.firingUntil=time+cadence*1.5;if(!cActive)s.hMuzzleAt=time;for(const side of cActive?[0]:[-1,0,1]){const mx=side*radius,my=-radius*(side?27:38)/24,x=p.x+mx*Math.cos(angle)-my*Math.sin(angle),y=p.y+mx*Math.sin(angle)+my*Math.cos(angle),dx=aimX-x,dy=aimY-y,length=Math.hypot(dx,dy)||1;this.bullets.push({id:++this.serial,x,y,vx:dx/length*1050,vy:dy/length*1050,life:Math.max(1.8,length/1050+.4)});}}}}
  this.shaft.step(time,dt,ships,position,this);
  const collisionHulls=this.hulls(time);for(const b of this.bullets){const next={x:b.x+b.vx*dt,y:b.y+b.vy*dt};const left=Math.min(b.x,next.x),right=Math.max(b.x,next.x),top=Math.min(b.y,next.y),bottom=Math.max(b.y,next.y);let hit=null;for(const h of collisionHulls){if(h.x+h.r<left||h.x-h.r>right||h.y+h.r<top||h.y-h.r>bottom)continue;if(h.entity?.dead||h.boss&&!this.boss.hulls().length)continue;const u=sweptHit(b,next,h);if(u!==null&&(!hit||u<hit.u))hit={u,h};}if(hit){this.hurt(hit.h.key,time);this.impacts.push({at:time,x:b.x+(next.x-b.x)*hit.u,y:b.y+(next.y-b.y)*hit.u});b.life=0;}else{b.x=next.x;b.y=next.y;b.life-=dt;}}
  this.cWeapon.step(time,dt,ships,position,this);
  this.impacts=this.impacts.filter(e=>time-e.at<.3).slice(-220);this.bullets=this.bullets.filter(b=>b.life>0).slice(-Math.max(350,this.rosterCount*48));this.enemyShots=this.enemyShots.filter(s=>time<=s.end);this.entities=this.entities.filter(e=>(e.type!=='small'||time-e.born<8)&&(!e.dead||time-e.death<this.media.data.clips[e.type+'-death'].frames.length/60));
 }
 draw(ctx,time){this.hostileFire.draw(ctx,time);this.shaft.draw(ctx,time);this.hLoadout.draw(ctx,time,this.position,2*(this.rosterCount>150?10:this.rosterCount>100?13:this.rosterCount>50?16:this.rosterCount>25?21:28));const view=this.view();for(const e of this.entities){if(!e.dead&&(e.x+e.r<view.left||e.x-e.r>view.right||e.y+e.r<view.top||e.y-e.r>view.bottom))continue;const feedback=hitFeedback(e),hurt=feedback.flash,clip=e.type+(e.dead?'-death':'-move'),age=e.dead?time-e.death:Math.max(0,time-e.event.at+3);if(!e.dead&&e.type==='large'&&feedback.age<18/59.18560606060606){const stream=e.hp<=e.maxHp/4?(e.hitCount&2?'3d2a6c':'3d2a78'):(e.hitCount&2?'3d2a54':'3d2a60');this.media.drawNative(ctx,'large-native-'+stream,feedback.age,e.x,e.y,e.scale,{body:true});}else this.media.draw(ctx,clip,age,e.x,e.y,e.scale,{loop:!e.dead,flash:hurt});if(!e.dead)drawEnemyHealth(ctx,e.x,e.y,e.r,e.hp,e.maxHp);if(!e.dead&&e.type==='alien'&&e.chargedAt!==undefined&&time-e.chargedAt<10/60){ctx.save();ctx.fillStyle='#baff85';ctx.shadowColor='#93ff4d';ctx.shadowBlur=14;ctx.beginPath();ctx.arc(e.x,e.y+15,4,0,Math.PI*2);ctx.fill();ctx.restore();}}
  for(const shot of this.enemyShots){if(time<shot.at)continue;if(shot.type==='ufo'){const e=this.entities.find(e=>e.id===shot.owner);this.media.drawUfoLaser?.(ctx,time-shot.at,e?.x??shot.from.x,e?.y??shot.from.y,2.7);continue;}const p=clamp((time-shot.at)/(shot.end-shot.at),0,1),x=shot.from.x+(shot.to.x-shot.from.x)*p,y=shot.from.y+(shot.to.y-shot.from.y)*p;ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(shot.to.y-shot.from.y,shot.to.x-shot.from.x)-Math.PI);this.media.draw(ctx,shot.type+'-shot',time-shot.at,0,0,1,{loop:true});ctx.restore();}
  this.cWeapon.draw(ctx,time,this.position);
  for(const impact of this.impacts)this.media.drawImpact?.(ctx,time-impact.at,impact.x,impact.y);
  for(const b of this.bullets)this.media.drawHmg(ctx,b.x,b.y,Math.atan2(b.vy,b.vx),1.4);
 }
}
