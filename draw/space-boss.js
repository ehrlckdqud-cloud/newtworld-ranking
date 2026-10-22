import {markHit,hitFeedback} from './space-hit.js?v=6.0';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
// Boss parts/effects retain original execution data. Escort poses are native;
// their health, contacts, death and aimed projectiles are live game entities.
export class SpaceBoss{
 constructor(duration,ships,audio,media){Object.assign(this,{duration,audio,media});this.stage='approach';this.stageAt=duration*.48;this.time=0;this.counter=0;this.nativeTicks=0;this.queuedLoop=0;this.history=[];this.escorts=new Map;this.shots=[];this.escortKills=0;this.maxHp=Math.max(70,Math.min(1800,ships*28));this.hp=this.maxHp;}
 get clip(){return this.stage==='orbs'||this.stage==='complete'?'entry':this.stage;}
 get seconds(){return Math.max(0,this.time-this.stageAt);}
 transition(stage,time){this.audio.cancelQueued?.('native-boss-',time);this.stage=stage;this.stageAt=time;this.queuedLoop=0;if(stage==='orbs')this.orbsAt=time;this.history.push({stage,time});const clip=this.media.bossData.clips[this.clip];if(clip&&stage!=='complete')this.audio.add({kind:'clip',id:'native-boss-'+stage+'-'+time,clip:'boss-native-'+this.clip,at:time});}
 step(time,dt,alive,bounds,selectionReady,targets=[]){this.time=time;this.bounds=bounds;this.selectionReady=selectionReady;this.nativeTicks+=dt*this.media.bossData.hz;const ticks=Math.floor(this.nativeTicks);this.nativeTicks-=ticks;this.counter=Math.max(0,this.counter-ticks);
  if(this.stage==='approach'&&time>=this.duration*.48)this.transition('first',time);
  if(this.stage==='fusion'&&this.seconds>=this.media.bossData.clips.fusion.frames.length/this.media.bossData.hz){this.maxHp=Math.max(120,Math.min(2400,alive*70));this.hp=this.maxHp;this.transition('second',time);}
  if(this.stage==='collapse'&&this.seconds>=this.media.bossData.clips.collapse.frames.length/this.media.bossData.hz)this.transition('orbs',time);
  if(this.stage==='orbs'&&this.seconds>=6.4)this.transition('complete',time);
  if(['first','second'].includes(this.stage)){const clip=this.media.bossData.clips[this.clip],n=clip.frames.length,from=clip.loop_from||0,index=Math.floor(this.seconds*clip.hz),loop=index<n?0:1+Math.floor((index-n)/(n-from));if(loop>this.queuedLoop){this.queuedLoop=loop;this.audio.add({kind:'clip',id:'native-boss-loop-'+this.stageAt+'-'+loop,clip:'boss-native-'+this.clip,fromFrame:from,at:this.stageAt+(n+(loop-1)*(n-from)-from)/clip.hz});}}
  this.updateEscorts(targets);
 }
 transform(){const {W,H}=this.bounds,scale=Math.min(W/320,H/224);return{x:(W-320*scale)/2,y:0,scale};}
 updateEscorts(targets){
  if(this.stage==='approach'||this.ceasefire){this.shots=[];return;}
  const f=this.media.nativeFrame(this.clip,this.seconds,{loop:['first','second'].includes(this.stage)}),tr=this.transform();
  for(const e of this.escorts.values())e.active=false;
  for(const part of f.escorts||[]){
   let e=this.escorts.get(part.id);
   if(!e){e={id:part.id,hp:5,dead:false,nextShot:this.time+.8+(this.escorts.size%4)*.15};this.escorts.set(part.id,e);}
   if(e.dead)continue;
   e.active=true;
   const [x,y,r]=part.hull;Object.assign(e,{x:tr.x+x*tr.scale,y:tr.y+y*tr.scale,r:Math.max(10,r*tr.scale*.8),nativeX:x,nativeY:y});
   if(targets.length&&this.time>=e.nextShot){e.nextShot=this.time+1.65;const target=targets[(part.id+Math.floor(this.time))%targets.length];this.shots.push({owner:e.id,from:{x:e.x,y:e.y},to:{...target},at:this.time,end:this.time+1.1});this.audio.add({kind:'sound',id:'escort-shot-'+e.id+'-'+this.time,sound:'ym-10d1',at:this.time});}
  }
  this.shots=this.shots.filter(s=>this.time<=s.end);
 }
 hulls(){
  if(this.stage==='approach'||this.ceasefire)return[];
  const escorts=[...this.escorts.values()].filter(e=>!e.dead&&e.active&&Number.isFinite(e.x)).map(e=>({x:e.x,y:e.y,r:e.r,key:'space-escort-'+e.id,entity:e}));
  if(!['first','second'].includes(this.stage))return escorts;
  const f=this.media.nativeFrame(this.clip,this.seconds,{loop:true}),tr=this.transform(),[x,y,r]=f.hull;
  if(y+r<0)return escorts;
  return [...escorts,{x:tr.x+x*tr.scale,y:tr.y+y*tr.scale,r:Math.max(12,r*tr.scale*.85),key:'space-boss',boss:true}];
 }
 hurt(time,key='space-boss'){
  if(key.startsWith('space-escort-')){const e=this.escorts.get(Number(key.slice(13)));if(!e||e.dead||!e.active||this.ceasefire)return false;e.hp--;markHit(e);if(e.hp<=0){e.dead=true;e.death=this.time;this.escortKills++;this.audio.add({kind:'clip',id:'escort-death-'+e.id,clip:'alien-death',at:time});}return true;}
  if(!['first','second'].includes(this.stage))return false;this.counter|=6;markHit(this);if(this.stage==='second'&&this.hp<=1&&(!this.selectionReady||time<this.duration))return true;this.hp=Math.max(0,this.hp-1);if(!this.hp)this.transition(this.stage==='first'?'fusion':'collapse',time);return true;
 }
 get ceasefire(){return ['collapse','orbs','complete'].includes(this.stage);}
 get finished(){return this.stage==='complete';}
 orbProgress(index,total){return clamp((this.time-(this.orbsAt??this.stageAt)-index/Math.max(1,total)*1.9)/3.8,0,1);}
 orbPosition(start,index,total){const p=this.orbProgress(index,total),e=ease(p),tr=this.transform(),x=tr.x+160*tr.scale,y=42*tr.scale,r=Math.sin(p*Math.PI)*Math.min(this.bounds.W*.12,90);return{x:start.x*(1-e)+x*e+Math.cos(p*Math.PI*3+index*2.4)*r,y:start.y*(1-e)+y*e+Math.sin(p*Math.PI*3+index*2.4)*r*.3,p};}
 draw(ctx,media){
  if(this.stage==='approach')return;
  const tr=this.transform(),seconds=this.stage==='complete'?6.4:this.seconds;
  const flash=hitFeedback(this).flash;for(const e of this.escorts.values())e.flash=hitFeedback(e).flash;
  media.drawNative(ctx,this.clip,seconds,tr.x,tr.y,tr.scale,{loop:['first','second'].includes(this.stage),flash,escorts:this.escorts});
  for(const e of this.escorts.values())if(e.dead&&this.time-e.death<media.data.clips['alien-death'].frames.length/60)media.draw(ctx,'alien-death',this.time-e.death,tr.x+e.nativeX*tr.scale,tr.y+e.nativeY*tr.scale,tr.scale);
  for(const shot of this.shots){const p=clamp((this.time-shot.at)/(shot.end-shot.at),0,1);media.draw(ctx,'alien-shot',this.time-shot.at,shot.from.x+(shot.to.x-shot.from.x)*p,shot.from.y+(shot.to.y-shot.from.y)*p,tr.scale*.8,{loop:true});}
 }

 drawHud(ctx){if(!['first','fusion','second'].includes(this.stage))return;const {W}=this.bounds,w=Math.min(340,W*.55),x=(W-w)/2;ctx.save();ctx.fillStyle='#091321dd';ctx.fillRect(x-8,48,w+16,46);ctx.fillStyle='#e8f6ff';ctx.textAlign='center';ctx.font='600 13px system-ui';ctx.fillText(this.stage==='first'?'X 표식 거대우주선':this.stage==='fusion'?'거대 모선과 합체 중':'최종 거대 모선',W/2,65);ctx.fillStyle='#27374b';ctx.fillRect(x,76,w,8);ctx.fillStyle=this.stage==='first'?'#f49a49':'#5cd7f4';ctx.fillRect(x,76,w*(this.stage==='fusion'?0:this.hp/this.maxHp),8);ctx.restore();}
}
