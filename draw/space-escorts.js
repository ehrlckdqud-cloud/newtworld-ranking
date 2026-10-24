import {markHit,hitFeedback} from './space-hit.js?v=62.0';
import {ESCORT_HP,drawEnemyHealth,scaledEnemyHp} from './space-enemy-stats.js?v=62.0';
const hz=59.18560606060606;
export class SpaceEscorts{
 constructor(media,audio,rosterCount=50){Object.assign(this,{media,audio,rosterCount,entities:new Map,shots:[],serial:0,kills:0,emitted:new Set,lastFinalSpawn:-Infinity,lastFirstSpawn:-Infinity,sourcePorts:new WeakMap,firstWaves:new Map});this.profiles={};for(const [clip,ids]of [['first',[2,3,4]],['second',[56]]])this.profiles[clip]=ids.map(id=>{const frames=media.bossData.clips[clip].frames,start=frames.findIndex(f=>f.escorts?.some(a=>a.id===id));return {clip,id,start,origin:frames[start].escorts.find(a=>a.id===id).hull};});}
 portFor(frame){if(this.sourcePorts.has(frame))return this.sourcePorts.get(frame);const meta=this.media.bossData.proof.native_parts,rects=frame.parts.filter(p=>['0xd8','0xd9'].includes(meta[p[0]].palette_at_submission));const port=rects.length?{x:(Math.min(...rects.map(p=>p[1]))+Math.max(...rects.map(p=>p[1]+p[4])))/2,y:Math.max(...rects.map(p=>p[2]+this.media.bossData.textures[p[0]][3]))}:{x:160,y:65};this.sourcePorts.set(frame,port);return port;}
 sample(profile,age){const frames=this.media.bossData.clips[profile.clip].frames;let index=Math.min(frames.length-1,profile.start+Math.floor(Math.max(0,age)*hz)),frame=frames[index],actor=frame.escorts.find(a=>a.id===profile.id);
  if(profile.clip==='first'&&age>.65){profile.flightFrames??=frames.slice(profile.start).filter(f=>f.escorts.some(a=>a.id===profile.id)).slice(-32);const loop=profile.flightFrames;if(loop.length){frame=loop[Math.floor((age-.65)*hz)%loop.length];actor=frame.escorts.find(a=>a.id===profile.id);}}
  return {frame,actor,id:profile.id,port:this.portFor(frame)};
 }
 step(time,bounds,port,targets,stage,attack={open:false,launches:[]}){this.time=time;this.bounds=bounds;if(this.retreatAt!==undefined){this.shots=[];const view=bounds.view||{top:0};for(const [id,e]of this.entities){if(e.dead)continue;e.attached=false;e.y=e.retreatY-Math.max(0,time-this.retreatAt)*300;e.visible=e.y+e.r>view.top;if(!e.visible)this.entities.delete(id);}return;}if(!['first','fusion','second'].includes(stage)){this.shots=[];return;}
  if(stage!==this.launchStage){this.pendingFirst=0;this.launchStage=stage;}
  if(stage==='first')this.stepFirstWaves(time,attack.firstPorts||[]);
  const launches=stage==='second'&&attack.open&&!attack.electric?(attack.launches||[]):[];
  for(const launch of launches){const opening=stage==='first'?(attack.openingKey||launch.key):launch.key;if(this.emitted.has(opening))continue;
   const active=[...this.entities.values()].filter(e=>!e.dead&&!e.exited);
   if(stage==='second'&&active.some(e=>e.profile.clip==='second'))continue;
   this.emitted.add(opening);
   if(stage==='first'){if(!this.pendingFirst){this.pendingFirst=Math.max(0,10-active.length);this.pendingProfile=launch.profile;}continue;}
   for(let wing=0;wing<4;wing++)this.launch(time,port,stage,launch.profile,wing,4);
  }
  const portNow=port,view=bounds.view||{left:0,top:0,right:bounds.W,bottom:bounds.H};
  for(const e of this.entities.values()){if(e.dead||e.exited)continue;const age=time-e.born,pose=this.sample(e.profile,age);if(!pose.actor){if(e.pose){const dt=Math.max(0,time-(e.lastStep??time));e.x+=(e.vx||e.direction*140)*dt;e.y+=(e.vy||50)*dt;e.visible=e.x+e.r>view.left&&e.x-e.r<view.right&&e.y+e.r>view.top&&e.y-e.r<view.bottom;}if(!e.attached&&this.outside(e,view))e.exited=true;e.lastStep=time;continue;}const [nx,ny,nr]=pose.actor.hull;e.age=age;e.pose=pose;e.r=Math.max(12,nr*e.scale*.8);
   const dt=Math.max(0,time-(e.lastStep??time));
   if(!e.detach&&age<=.65){const port=e.profile.clip==='first'?e.launchPort:portNow;const previous={x:e.x,y:e.y};e.x=port.x+(e.profile.clip==='first'?0:(nx-pose.port.x)*e.scale)+(e.launchOffset||0);const rawY=port.y+(ny-pose.port.y)*e.scale;e.spawnYShift??=Math.min(0,(view.top+view.bottom)/2-e.r-8-rawY);e.y=rawY+e.spawnYShift;e.lip=port.y+e.spawnYShift;e.frontExit=e.profile.clip==='first';e.attached=true;if(dt&&Number.isFinite(previous.x)){e.vx=Math.max(-260,Math.min(260,(e.x-previous.x)/dt));e.vy=Math.max(-260,Math.min(260,(e.y-previous.y)/dt));}}
   else{if(!e.detach){e.detach={x:e.x??port.x,y:e.y??port.y};e.x=e.detach.x;e.y=e.detach.y;e.vx??=e.launchDirection*120;e.vy??=140;e.attached=false;}const blend=1-Math.exp(-2*dt);e.vx+=(e.launchDirection*(115+e.profile.id%3*20)-e.vx)*blend;e.vy+=(120-e.vy)*blend;e.x+=e.vx*dt;e.y+=e.vy*dt;e.direction=e.launchDirection;}e.lastStep=time;

   e.visible=e.x+e.r>view.left&&e.x-e.r<view.right&&e.y+e.r>view.top&&e.y-e.r<view.bottom&&(!e.attached||e.frontExit||e.y+e.r>e.lip+1);if(!e.attached&&this.outside(e,view))e.exited=true;
   if(!e.exited&&e.visible&&targets.length&&time>=e.nextShot){e.nextShot=time+1.65;const target=targets[(this.serial+Math.floor(time))%targets.length];this.shots.push({owner:e.id,from:{x:e.x,y:e.y},to:{...target},at:time,end:time+1.1});this.audio.add({kind:'sound',id:'escort-shot-'+e.id+'-'+time,sound:'ym-10d1',at:time});}}
  this.shots=this.shots.filter(s=>time<=s.end+2);this.entities.forEach((e,id)=>{if(e.exited||e.dead&&time-e.death>3)this.entities.delete(id);});
 }
 outside(e,view){if(!e.pose?.actor)return false;const [cx,cy]=e.pose.actor.hull,parts=e.pose.frame.parts.filter(p=>p[6]===e.pose.id);if(!parts.length)return false;return parts.every(p=>{const x=e.x+(p[1]-cx)*e.scale,y=e.y+(p[2]-cy)*e.scale,w=p[4]*e.scale,h=this.media.bossData.textures[p[0]][3]*e.scale;return x+w<view.left||x>view.right||y+h<view.top||y>view.bottom;});}
 stepFirstWaves(time,ports){for(const port of ports){let wave=this.firstWaves.get(port.key);if(!wave){wave={alive:new Set,remaining:0,closedAt:-Infinity,round:0};this.firstWaves.set(port.key,wave);}
  if(!wave.remaining&&!wave.alive.size&&time>=wave.closedAt+.3){wave.round++;wave.openedAt=time;wave.remaining=10;wave.next=time+.34;wave.closedAt=Infinity;}
  if(wave.remaining&&time>=wave.next){const e=this.launch(time,port,'first',2+(10-wave.remaining)%3,10-wave.remaining,1);e.mother=port.key;wave.alive.add(e.id);wave.remaining--;wave.next=time+.16;if(!wave.remaining)wave.closedAt=time+.65;}
 }}
 firstHatchFrame(key,time){const w=this.firstWaves.get(key);if(!w)return 130;if(time<w.closedAt)return Math.min(100,80+Math.floor((time-w.openedAt)*hz));return Math.min(130,115+Math.floor((time-w.closedAt)*hz));}

 launch(time,port,stage,profileId,wing,total){const profile=this.profiles[stage]?.find(p=>p.id===profileId);if(!profile)return;const id='space-escort-'+(++this.serial);this.entities.set(id,{id,profile,born:time,launchPort:{...port},launchOffset:stage==='first'?0:(wing-(total-1)/2)*14,launchDirection:wing%2?-1:1,scale:3,hp:scaledEnemyHp(ESCORT_HP,this.rosterCount),maxHp:scaledEnemyHp(ESCORT_HP,this.rosterCount),dead:false,nextShot:time+1.2});return this.entities.get(id);}
 hulls(){if(this.retreatAt!==undefined)return [];return [...this.entities.values()].filter(e=>!e.dead&&e.visible).map(e=>({x:e.x,y:e.y,r:e.r,key:e.id,entity:e}));}
 hurt(id,time){if(this.retreatAt!==undefined)return false;const e=this.entities.get(id);if(!e||e.dead||!e.visible)return false;e.hp--;markHit(e);if(e.hp<=0)this.destroy(e,time);return true;}
 destroy(e,time){if(e.dead)return;e.dead=true;e.death=time;this.firstWaves.get(e.mother)?.alive.delete(e.id);this.kills++;this.audio.cancelQueued?.('escort-shot-'+e.id+'-',time);this.audio.add({kind:'clip',id:'escort-death-'+e.id,clip:'alien-death',at:time});}
 retreat(time){this.retreatAt=time;this.shots=[];for(const e of this.entities.values())if(!e.dead){e.retreatY=e.y;e.attached=false;this.audio.cancelQueued?.('escort-shot-'+e.id+'-',time);}}
 destroyAll(time){for(const e of this.entities.values())this.destroy(e,time);this.shots=[];}
 draw(ctx,media){for(const e of this.entities.values()){if(e.dead){if(this.time-e.death<media.data.clips['alien-death'].frames.length/60)media.draw(ctx,'alien-death',this.time-e.death,e.x,e.y,e.scale);continue;}if(e.pose){ctx.save();if(e.attached&&!e.frontExit){ctx.beginPath();ctx.rect(e.x-5000,e.lip,10000,10000);ctx.clip();}media.drawEscort(ctx,e.pose,e.x,e.y,e.scale,hitFeedback(e).flash);ctx.restore();if(e.visible&&this.retreatAt===undefined)drawEnemyHealth(ctx,e.x,e.y,e.r,e.hp,e.maxHp);}}for(const shot of this.shots){const p=Math.max(0,(this.time-shot.at)/(shot.end-shot.at));ctx.save();ctx.translate(shot.from.x+(shot.to.x-shot.from.x)*p,shot.from.y+(shot.to.y-shot.from.y)*p);ctx.rotate(Math.atan2(shot.to.y-shot.from.y,shot.to.x-shot.from.x)-Math.PI);media.draw(ctx,'alien-shot',this.time-shot.at,0,0,2.4,{loop:true});ctx.restore();}}
}
