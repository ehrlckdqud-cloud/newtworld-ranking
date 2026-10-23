import {scaledEnemyHp,drawEnemyHealth} from './space-enemy-stats.js?v=33.0';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class SpaceShaftEnemies{
 constructor(media,audio,count){Object.assign(this,{media,audio,count});this.entities=[];this.shots=[];this.spawned=new Set;this.wallCount=0;this.serial=0;this.kills={wall:0,eye:0};this.stopped=false;}
 get data(){return this.media.shaftData;}
 destroyAll(time){for(const e of this.entities){if(e.dead)continue;e.hp=0;e.dead=true;e.death=time;this.kills[e.type]++;this.audio.add({kind:'clip',id:'shaft-final-death-'+e.id,clip:'shaft-'+e.type+'-death',at:time});}this.ceasefire();}
 ceasefire(){this.stopped=true;this.shots=[];}
 pose(e,time){const c=this.data.clips[e.type+'-move'],raw=Math.max(0,(time-e.born)*c.hz*(e.type==='eye'?.55:1)),i=Math.min(c.frames.length-1,Math.floor(raw)),f=c.frames[i],last=c.frames.at(-1).motion,prev=c.frames.at(-2).motion,extra=Math.max(0,raw-c.frames.length+1),dx=f.motion[0]+(last[0]-prev[0])*extra,dy=f.motion[1]+(last[1]-prev[1])*extra;return{x:e.origin.x+dx*e.scale*e.mirror,y:e.origin.y+dy*e.scale};}
 spawn(type,time,view,index=0){const scale=type==='wall'?Math.min(3.4,(view.right-view.left-36)/320):2.6,hp=scaledEnemyHp(type==='wall'?675:60,this.count),e={id:'shaft-'+type+'-'+(++this.serial),type,born:time,origin:{x:type==='wall'?(view.left+view.right)/2:view.left+(index%2?.72:.28)*(view.right-view.left),y:view.top-(type==='wall'?72:60)},scale,mirror:index%2?-1:1,hp,maxHp:hp,r:type==='wall'?36*scale:16*scale,dead:false,lastHit:-10,nextShot:0};Object.assign(e,this.pose(e,time));this.entities.push(e);if(type==='wall')this.wallCount++;return e;}
 step(time,dt,ships,position,battle){if(!this.data||this.stopped)return;const view=battle.view(),duration=battle.boss?.duration||120;this.view=view;
  for(let i=0;i<5;i++){const at=9+duration*.145*i,key='wall-'+i;if(time>=at&&!this.spawned.has(key)){this.spawned.add(key);this.spawn('wall',time,view,i);}}
  for(const event of battle.events){if(event.type!==5||time<event.at-3||this.spawned.has(event.key))continue;this.spawned.add(event.key);for(let i=0;i<2;i++)this.spawn('eye',time,view,i);}
  for(const e of this.entities){if(e.dead)continue;e.previous={x:e.x,y:e.y};Object.assign(e,this.pose(e,time));const age=(time-e.born)*.55;
   if(e.type==='eye'&&e.nextShot<this.data.proof.eye.shot_ticks.length){const tick=this.data.proof.eye.shot_ticks[e.nextShot],fireAt=e.born+tick/this.data.hz/.55;e.charge=age*this.data.hz>=tick-9&&time<fireAt?Math.max(0,age-(tick-9)/this.data.hz):null;
    if(time>=fireAt){e.nextShot++;const live=ships.filter(s=>!s.dead);if(live.length){const target=live[(this.serial+e.nextShot)%live.length],p=position(target,time),dx=p.x-e.x,dy=p.y-e.y,len=Math.hypot(dx,dy)||1;this.shots.push({id:++this.serial,x:e.x,y:e.y,vx:dx/len*270,vy:dy/len*270,life:6,born:time,owner:e.id});this.audio.add({kind:'sound',id:'shaft-shot-'+this.serial,sound:'ym-11d4',at:time});}}
   }
  }
  for(const s of this.shots){s.previous={x:s.x,y:s.y};s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;}
  this.shots=this.shots.filter(s=>s.life>0&&s.x>view.left-100&&s.x<view.right+100&&s.y>view.top-100&&s.y<view.bottom+100);
  this.entities=this.entities.filter(e=>e.dead?time-e.death<this.data.clips[e.type+'-death'].frames.length/this.data.hz:time-e.born<18&&e.y<view.bottom+e.r*3);
 }
 hulls(){if(!this.data||this.stopped)return[];const out=[],v=this.view;for(const e of this.entities){if(e.dead)continue;const offsets=e.type==='wall'?[-128,-96,-64,-32,0,32,64,96,128]:[0];for(const off of offsets){const x=e.x+off*e.scale,y=e.y;if(v&&(x+e.r<v.left||x-e.r>v.right||y+e.r<v.top||y-e.r>v.bottom))continue;out.push({x,y,r:e.r,key:e.id,entity:e});}}return out;}
 hurt(id,time,battle){const e=this.entities.find(e=>e.id===id);if(!e||e.dead)return false;e.hp--;e.lastHit=time;
  // Native reception palette and existing restored H impact cue accompany actual contacts.
  if(time-(e.lastSound??-10)>.16){e.lastSound=time;this.audio.add({kind:'sound',id:'shaft-hit-'+id+'-'+Math.round(time*100),sound:'ym-1021',at:time});}
  if(e.hp<=0){e.dead=true;e.death=time;this.kills[e.type]++;battle.killedEnemy(e,time);this.audio.add({kind:'clip',id:'shaft-death-'+id,clip:'shaft-'+e.type+'-death',at:time});}return true;}
 contacts(ships,position,time,dt,r,battle,damage){if(this.stopped)return;for(const shot of this.shots){if(shot.life<=0)continue;let closest=null;for(const s of ships){if(s.dead)continue;const p=position(s,time),u=battle.sweptContact(shot.previous||shot,shot,{...p,r:r+9});if(u!==null&&(!closest||u<closest.u))closest={s,u};}if(closest){shot.life=0;damage(closest.s,time,{organic:true});}}
  for(const e of this.entities){if(e.dead||e.type!=='wall')continue;for(const s of ships){if(s.dead||time-(s.lastShaftHit??-10)<.7)continue;const p=position(s,time);if(Math.abs(p.x-e.x)<145*e.scale+r&&Math.abs(p.y-e.y)<23*e.scale+r){s.lastShaftHit=time;damage(s,time,{organic:true});}}}
 }
 draw(ctx,time){if(!this.data)return;for(const e of this.entities){const age=e.dead?time-e.death:time-e.born,damaged=!e.dead&&e.type==='wall'&&e.hp<e.maxHp/3,name=e.type+(e.dead?'-death':damaged?'-damaged':'-move'),seconds=damaged?age%(.75):e.type==='eye'&&!e.dead?age*.55:age,flash=!e.dead&&time-e.lastHit<6/this.data.hz&&!(Math.floor((time-e.lastHit)*this.data.hz)&1);this.media.drawShaft(ctx,name,seconds,e.x,e.y,e.scale,{loop:!e.dead,flash,mirror:e.mirror});if(!e.dead){drawEnemyHealth(ctx,e.x,e.y,e.r,e.hp,e.maxHp);if(e.charge!==null&&e.charge!==undefined)this.media.drawShaft(ctx,'eye-charge',e.charge,e.x,e.y,e.scale,{mirror:e.mirror});}}
  for(const s of this.shots)this.media.drawShaft(ctx,'eye-shot',time-s.born,s.x,s.y,2.2,{loop:true});
 }
}
