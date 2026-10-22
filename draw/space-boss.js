import {SpaceEscorts} from './space-escorts.js?v=7.0';
import {markHit,hitFeedback} from './space-hit.js?v=7.0';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
// Boss parts/effects retain original execution data. Escort poses are native;
// their health, contacts, death and aimed projectiles are live game entities.
export class SpaceBoss{
 constructor(duration,ships,audio,media){Object.assign(this,{duration,audio,media});this.stage='approach';this.stageAt=duration*.48;this.time=0;this.counter=0;this.nativeTicks=0;this.queuedLoop=0;this.history=[];this.escortFleet=new SpaceEscorts(media,audio);this.maxHp=Math.max(70,Math.min(1800,ships*28));this.hp=this.maxHp;}
 get clip(){return this.stage==='orbs'||this.stage==='complete'?'entry':this.stage;}
 get seconds(){return Math.max(0,this.time-this.stageAt);}
 transition(stage,time){this.audio.cancelQueued?.('native-boss-',time);this.stage=stage;this.stageAt=time;if(stage==='collapse')this.escortFleet.destroyAll(time);this.queuedLoop=0;if(stage==='orbs')this.orbsAt=time;this.history.push({stage,time});const clip=this.media.bossData.clips[this.clip];if(clip&&stage!=='complete')this.audio.add({kind:'clip',id:'native-boss-'+stage+'-'+time,clip:'boss-native-'+this.clip,at:time});}
 step(time,dt,alive,bounds,selectionReady,targets=[]){this.time=time;this.bounds=bounds;this.selectionReady=selectionReady;this.nativeTicks+=dt*this.media.bossData.hz;const ticks=Math.floor(this.nativeTicks);this.nativeTicks-=ticks;this.counter=Math.max(0,this.counter-ticks);
  if(this.stage==='approach'&&time>=this.duration*.48)this.transition('first',time);
  if(this.stage==='fusion'&&this.seconds>=this.media.bossData.clips.fusion.frames.length/this.media.bossData.hz){this.maxHp=Math.max(120,Math.min(2400,alive*70));this.hp=this.maxHp;this.transition('second',time);}
  if(this.stage==='collapse'&&this.seconds>=this.media.bossData.clips.collapse.frames.length/this.media.bossData.hz)this.transition('orbs',time);
  if(this.stage==='orbs'&&this.seconds>=6.4)this.transition('complete',time);
  if(['first','second'].includes(this.stage)){const clip=this.media.bossData.clips[this.clip],n=clip.frames.length,from=clip.loop_from||0,index=Math.floor(this.seconds*clip.hz),loop=index<n?0:1+Math.floor((index-n)/(n-from));if(loop>this.queuedLoop){this.queuedLoop=loop;this.audio.add({kind:'clip',id:'native-boss-loop-'+this.stageAt+'-'+loop,clip:'boss-native-'+this.clip,fromFrame:from,at:this.stageAt+(n+(loop-1)*(n-from)-from)/clip.hz});}}
  this.escortFleet.step(time,bounds,this.port(),targets,this.stage);
 }
 sourceFrame(){return this.media.nativeFrame(this.clip,this.seconds,{loop:['first','second'].includes(this.stage)});}
 geometry(frame=this.sourceFrame()){
  const parts=frame.parts,meta=this.media.bossData.proof.native_parts,textures=this.media.bossData.textures,roof=[],exit=[];
  for(const p of parts){const m=meta[p[0]],pointer=Number(m.pointer),box={left:p[1],top:p[2],right:p[1]+p[4],bottom:p[2]+textures[p[0]][3]};if(pointer===0x190000)roof.push(box);if(['0xd8','0xd9'].includes(m.palette_at_submission))exit.push(box);}
  const rect=items=>items.length?{left:Math.min(...items.map(b=>b.left)),top:Math.min(...items.map(b=>b.top)),right:Math.max(...items.map(b=>b.right)),bottom:Math.max(...items.map(b=>b.bottom))}:null;
  return {roof:rect(roof),exit:rect(exit)};
 }
 transform(){
  const {W,H}=this.bounds,base=Math.min(W/320,H/224);let scale=base,x=(W-320*scale)/2,y=0;
  if(['second','collapse','orbs','complete'].includes(this.stage)){
   const {roof,exit}=this.geometry();if(roof){const v=this.bounds.view||{left:0,top:0,right:W,bottom:H};scale=Math.max(base,(v.right-v.left+64)/(roof.right-roof.left));x=(v.left+v.right)/2-(roof.left+roof.right)/2*scale;const portY=exit?.bottom??65;y=Math.min(v.top-32-roof.top*scale,v.top+(v.bottom-v.top)*.32-portY*scale);}
  }
  return {x,y,scale};
 }
 port(){if(this.stage==='approach')return {x:this.bounds.W/2,y:0};const tr=this.transform(),exit=this.geometry().exit;return {x:tr.x+(exit?(exit.left+exit.right)/2:160)*tr.scale,y:tr.y+(exit?exit.bottom:65)*tr.scale};}
 get escorts(){return this.escortFleet.entities;}
 get escortKills(){return this.escortFleet.kills;}
 hulls(){
  if(this.stage==='approach'||this.ceasefire)return[];
  const escorts=this.escortFleet.hulls();
  if(!['first','second'].includes(this.stage))return escorts;
  const f=this.media.nativeFrame(this.clip,this.seconds,{loop:true}),tr=this.transform(),[x,y,r]=f.hull;
  if(y+r<0)return escorts;
  return [...escorts,{x:tr.x+x*tr.scale,y:tr.y+y*tr.scale,r:Math.max(12,r*tr.scale*.85),key:'space-boss',boss:true}];
 }
 hurt(time,key='space-boss'){
  if(key.startsWith('space-escort-'))return !this.ceasefire&&this.escortFleet.hurt(key,time);
  if(!['first','second'].includes(this.stage))return false;this.counter|=6;markHit(this);if(this.stage==='second'&&this.hp<=1&&(!this.selectionReady||time<this.duration))return true;this.hp=Math.max(0,this.hp-1);if(!this.hp)this.transition(this.stage==='first'?'fusion':'collapse',time);return true;
 }
 get ceasefire(){return ['collapse','orbs','complete'].includes(this.stage);}
 get finished(){return this.stage==='complete';}
 orbProgress(index,total){return clamp((this.time-(this.orbsAt??this.stageAt)-index/Math.max(1,total)*1.9)/3.8,0,1);}
 orbPosition(start,index,total){const p=this.orbProgress(index,total),e=ease(p),tr=this.transform(),x=tr.x+160*tr.scale,y=tr.y+42*tr.scale,r=Math.sin(p*Math.PI)*Math.min(this.bounds.W*.12,90);return{x:start.x*(1-e)+x*e+Math.cos(p*Math.PI*3+index*2.4)*r,y:start.y*(1-e)+y*e+Math.sin(p*Math.PI*3+index*2.4)*r*.3,p};}
 draw(ctx,media){
  if(this.stage==='approach')return;
  const tr=this.transform(),seconds=this.stage==='complete'?6.4:this.seconds;
  media.drawNative(ctx,this.clip,seconds,tr.x,tr.y,tr.scale,{loop:['first','second'].includes(this.stage),flash:hitFeedback(this).flash});
  this.escortFleet.draw(ctx,media);
 }

 drawHud(ctx){if(!['first','fusion','second'].includes(this.stage))return;const {W}=this.bounds,w=Math.min(340,W*.55),x=(W-w)/2;ctx.save();ctx.fillStyle='#091321dd';ctx.fillRect(x-8,48,w+16,46);ctx.fillStyle='#e8f6ff';ctx.textAlign='center';ctx.font='600 13px system-ui';ctx.fillText(this.stage==='first'?'X 표식 거대우주선':this.stage==='fusion'?'거대 모선과 합체 중':'최종 거대 모선',W/2,65);ctx.fillStyle='#27374b';ctx.fillRect(x,76,w,8);ctx.fillStyle=this.stage==='first'?'#f49a49':'#5cd7f4';ctx.fillRect(x,76,w*(this.stage==='fusion'?0:this.hp/this.maxHp),8);ctx.restore();}
}
