import {markHit,hitFeedback} from './space-hit.js?v=7.0';
import {ESCORT_HP,drawEnemyHealth} from './space-enemy-stats.js?v=7.0';
const hz=59.18560606060606;
export class SpaceEscorts{
 constructor(media,audio){Object.assign(this,{media,audio,entities:new Map,shots:[],serial:0,kills:0,phase:null,nextSpawn:Infinity,remaining:0});this.profiles={};for(const [clip,ids]of [['first',[2,3,4]],['second',[56]]])this.profiles[clip]=ids.map(id=>{const frames=media.bossData.clips[clip].frames,start=frames.findIndex(f=>f.escorts?.some(a=>a.id===id));return {clip,id,start,origin:frames[start].escorts.find(a=>a.id===id).hull};});}
 begin(stage,time){if(stage===this.phase)return;this.phase=stage;this.remaining=3;this.nextSpawn=time+.65;}
 sample(profile,age){const frames=this.media.bossData.clips[profile.clip].frames,index=profile.start+Math.floor(Math.max(0,age)*hz)%(frames.length-profile.start),frame=frames[index],actor=frame.escorts.find(a=>a.id===profile.id);return {frame,actor,id:profile.id};}
 step(time,bounds,port,targets,stage){this.time=time;this.bounds=bounds;if(!['first','fusion','second'].includes(stage)){this.shots=[];return;}if(stage==='first'||stage==='second')this.begin(stage,time);
  if(stage!=='fusion'&&this.remaining>0&&time>=this.nextSpawn){const profiles=this.profiles[stage],profile=profiles[this.serial%profiles.length],id='space-escort-'+(++this.serial);this.entities.set(id,{id,profile,born:time,origin:{...port},scale:3,hp:ESCORT_HP,maxHp:ESCORT_HP,dead:false,nextShot:time+1.2});this.remaining--;this.nextSpawn=time+1.8;}
  const view=bounds.view||{left:0,top:0,right:bounds.W,bottom:bounds.H};
  for(const e of this.entities.values()){if(e.dead)continue;const age=time-e.born,pose=this.sample(e.profile,age);if(!pose.actor)continue;const [nx,ny,nr]=pose.actor.hull;Object.assign(e,{pose,x:e.origin.x+(nx-e.profile.origin[0])*e.scale,y:e.origin.y+(ny-e.profile.origin[1])*e.scale,r:Math.max(12,nr*e.scale*.8)});e.visible=age>.12&&e.x+e.r>view.left&&e.x-e.r<view.right&&e.y+e.r>view.top&&e.y-e.r<view.bottom;
   if(e.visible&&targets.length&&time>=e.nextShot){e.nextShot=time+1.65;const target=targets[(this.serial+Math.floor(time))%targets.length];this.shots.push({owner:e.id,from:{x:e.x,y:e.y},to:{...target},at:time,end:time+1.1});this.audio.add({kind:'sound',id:'escort-shot-'+e.id+'-'+time,sound:'ym-10d1',at:time});}}
  this.shots=this.shots.filter(s=>time<=s.end);
 }
 hulls(){return [...this.entities.values()].filter(e=>!e.dead&&e.visible).map(e=>({x:e.x,y:e.y,r:e.r,key:e.id,entity:e}));}
 hurt(id,time){const e=this.entities.get(id);if(!e||e.dead||!e.visible)return false;e.hp--;markHit(e);if(e.hp<=0)this.destroy(e,time);return true;}
 destroy(e,time){if(e.dead)return;e.dead=true;e.death=time;this.kills++;this.audio.cancelQueued?.('escort-shot-'+e.id+'-',time);this.audio.add({kind:'clip',id:'escort-death-'+e.id,clip:'alien-death',at:time});}
 destroyAll(time){for(const e of this.entities.values())this.destroy(e,time);this.remaining=0;this.shots=[];}
 draw(ctx,media){for(const e of this.entities.values()){if(e.dead){if(this.time-e.death<media.data.clips['alien-death'].frames.length/60)media.draw(ctx,'alien-death',this.time-e.death,e.x,e.y,e.scale);continue;}if(e.pose){media.drawEscort(ctx,e.pose,e.x,e.y,e.scale,hitFeedback(e).flash);drawEnemyHealth(ctx,e.x,e.y,e.r,e.hp,e.maxHp);}}for(const shot of this.shots){const p=Math.max(0,Math.min(1,(this.time-shot.at)/(shot.end-shot.at)));media.draw(ctx,'alien-shot',this.time-shot.at,shot.from.x+(shot.to.x-shot.from.x)*p,shot.from.y+(shot.to.y-shot.from.y)*p,2.4,{loop:true});}}
}
