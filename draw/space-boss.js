import {scaledEnemyHp} from './space-enemy-stats.js?v=38.0';
import {BOSS_TIMELINE,sourceFrameIndex} from './space-boss-timeline.js?v=38.0';
import {SpaceEscorts} from './space-escorts.js?v=38.0';
import {markHit,hitFeedback} from './space-hit.js?v=38.0';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
// Boss parts/effects retain original execution data. Escort poses are native;
// their health, contacts, death and aimed projectiles are live game entities.
export class SpaceBoss{
 constructor(duration,ships,audio,media){Object.assign(this,{duration,audio,media,rosterCount:ships});this.stage='approach';this.stageAt=duration*.48;this.time=0;this.counter=0;this.nativeTicks=0;this.queuedLoop=0;this.history=[];this.escortFleet=new SpaceEscorts(media,audio,ships);this.media.bossData.clips.first.loop_end=260;this.maxHp=scaledEnemyHp(8400,ships);this.hp=this.maxHp;}
 get clip(){return this.stage==='orbs'||this.stage==='complete'?'entry':this.stage;}
 get seconds(){return Math.max(0,this.time-this.stageAt);}
 transition(stage,time){this.audio.cancelQueued?.('native-boss-',time);this.stage=stage;this.stageAt=time;if(stage==='collapse')this.escortFleet.destroyAll(time);this.queuedLoop=0;if(stage==='orbs')this.orbsAt=time;this.history.push({stage,time});const clip=this.media.bossData.clips[this.clip];if(clip&&stage!=='complete')this.audio.add({kind:'clip',id:'native-boss-'+stage+'-'+time,clip:'boss-native-'+this.clip,toFrame:clip.loop_end,at:time});}
 step(time,dt,alive,bounds,selectionReady,targets=[],combatStarted=true){this.time=time;this.bounds=bounds;if(!combatStarted)return;this.selectionReady=selectionReady;this.aimTargets=targets;this.nativeTicks+=dt*this.media.bossData.hz;const ticks=Math.floor(this.nativeTicks);this.nativeTicks-=ticks;this.counter=Math.max(0,this.counter-ticks);
  if(this.stage==='approach'&&time>=this.duration*.48){this.maxHp=scaledEnemyHp(8400,this.rosterCount);this.hp=this.maxHp;this.transition('first',time);}
  if(this.stage==='fusion'&&this.seconds>=this.media.bossData.clips.fusion.frames.length/this.media.bossData.hz){this.maxHp=scaledEnemyHp(9600,this.rosterCount);this.hp=this.maxHp;this.transition('second',time);}
  if(this.stage==='collapse'&&this.seconds>=this.media.bossData.clips.collapse.frames.length/this.media.bossData.hz)this.transition('orbs',time);
  if(this.stage==='orbs'&&this.seconds>=6.4)this.transition('complete',time);
  if(['first','second'].includes(this.stage)){const clip=this.media.bossData.clips[this.clip],n=clip.loop_end||clip.frames.length,from=clip.loop_from||0,index=Math.floor(this.seconds*clip.hz),loop=index<n?0:1+Math.floor((index-n)/(n-from));if(loop>this.queuedLoop){this.queuedLoop=loop;this.audio.add({kind:'clip',id:'native-boss-loop-'+this.stageAt+'-'+loop,clip:'boss-native-'+this.clip,fromFrame:from,toFrame:n,at:this.stageAt+(n+(loop-1)*(n-from)-from)/clip.hz});}}
  if(this.stage==='first'){const f=this.sourceFrame(),a=1-Math.exp(-12*dt);this.firstPose??={x:f.hull[0],y:f.hull[1]};this.firstPose.x+=(f.hull[0]-this.firstPose.x)*a;this.firstPose.y+=(f.hull[1]-this.firstPose.y)*a;}
  this.escortFleet.step(time,bounds,this.port(),targets,this.stage,this.attackState());
 }
 attackState(seconds=this.seconds){
  if(!['first','second'].includes(this.stage))return {open:false,electric:false,launches:[]};
  const {index,cycle}=sourceFrameIndex(this.media.bossData.clips[this.clip],seconds,true),timeline=BOSS_TIMELINE[this.stage],hatch=timeline.hatches.find(w=>index>=w.start&&index<w.end),electric=(timeline.electric||[]).some(([a,b])=>index>=a&&index<b);
  return {frame:index,cycle,open:!!hatch&&!electric,electric,launches:hatch&&!electric?hatch.launches.filter(e=>index>=e.at).map(e=>({...e,key:this.stageAt+'/'+this.stage+'/'+cycle+'/'+e.at,age:(index-e.at)/this.media.bossData.hz})):[]};
 }
 get firstElectricFinished(){return ['collapse','orbs','complete'].includes(this.stage)||(this.stage==='second'&&this.seconds>=BOSS_TIMELINE.second.electric[0][1]/this.media.bossData.hz);}
 electricDirection(seconds=this.seconds){
  const {index,cycle}=sourceFrameIndex(this.media.bossData.clips.second,Math.max(0,seconds),true),windows=BOSS_TIMELINE.second.electric;let n=windows.findIndex(([a,b])=>index>=a&&index<b);if(n<0)n=windows.findIndex(([a])=>a>index);if(n<0)n=0;
  const key=this.stageAt+'/'+cycle+'/'+n;this.electricAims??=new Map;if(this.electricAims.has(key))return this.electricAims.get(key);
  const tr=this.transform(),origin={x:tr.x+159*tr.scale,y:tr.y+89*tr.scale},targets=(this.aimTargets||[]).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.y>origin.y),reachable=targets.filter(p=>Math.abs(Math.atan2(p.x-origin.x,p.y-origin.y))<=Math.PI/4),pool=reachable.length?reachable:targets,target=pool[(cycle*windows.length+n)%Math.max(1,pool.length)],angle=target?Math.atan2(target.x-origin.x,target.y-origin.y):0,direction=clamp(Math.round(angle/(Math.PI/16))+4,0,8);
  // Lock the native direction during warning and firing, allowing pilots to dodge it.
  if(target)this.electricAims.set(key,direction);return direction;
 }
 electricPose(seconds=this.seconds){if(this.stage!=='second')return null;const {index}=sourceFrameIndex(this.media.bossData.clips.second,Math.max(0,seconds),true),win=BOSS_TIMELINE.second.electric.find(([a,b])=>index>=a&&index<b);return win?{direction:this.electricDirection(seconds),ticks:index-win[0]-24}:null;}
 electricThreats(lead=.38){if(this.stage!=='second')return[];let pose=this.electricPose();if(!pose)pose=this.electricPose(this.seconds+lead);if(!pose)return[];const a=(pose.direction-4)*Math.PI/16,tr=this.transform(),x=tr.x+159*tr.scale,y=tr.y+89*tr.scale;return[{x,y,toX:x+Math.sin(a)*240*tr.scale,toY:y+Math.cos(a)*240*tr.scale,r:18*tr.scale,warning:pose.ticks<0}];}
 electricContacts(from,to,targets){
  if(this.stage!=='second'||!targets.length)return[];const hz=this.media.bossData.hz,tr=this.transform(),hits=new Set,start=Math.floor(Math.max(0,from-this.stageAt)*hz),end=Math.floor(Math.max(0,to-this.stageAt)*hz);
  for(let tick=start;tick<=end;tick++){const seconds=tick/hz;if(!this.attackState(seconds).electric)continue;const f=this.media.nativeFrame('second',seconds,{loop:true}),pose=this.electricPose(seconds),u=Math.max(0,Math.min(1,(this.stageAt+seconds-from)/Math.max(.001,to-from)));for(const p of targets){if(hits.has(p.id))continue;const x=(p.from.x+(p.to.x-p.from.x)*u-tr.x)/tr.scale,y=(p.from.y+(p.to.y-p.from.y)*u-tr.y)/tr.scale,hit=this.media.electricData?this.media.electricSourceHit(pose.direction,pose.ticks,x-159,y-89,p.r/tr.scale):this.media.electricHit(f,x,y,p.r/tr.scale);if(hit)hits.add(p.id);}}
  return [...hits];
 }
 sourceFrame(){return this.media.nativeFrame(this.clip,['orbs','complete'].includes(this.stage)?0:this.seconds,{loop:['first','second'].includes(this.stage)});}
 geometry(frame=this.sourceFrame()){
  this.geometryCache??=new WeakMap;const cached=this.geometryCache.get(frame);if(cached)return cached;
  const parts=frame.parts,meta=this.media.bossData.proof.native_parts,textures=this.media.bossData.textures,roof=[],exit=[];
  for(const p of parts){const m=meta[p[0]],pointer=Number(m.pointer),box={left:p[1],top:p[2],right:p[1]+p[4],bottom:p[2]+textures[p[0]][3]};if(pointer===0x190000)roof.push(box);if(['0xd8','0xd9'].includes(m.palette_at_submission))exit.push(box);}
  const rect=items=>items.length?{left:Math.min(...items.map(b=>b.left)),top:Math.min(...items.map(b=>b.top)),right:Math.max(...items.map(b=>b.right)),bottom:Math.max(...items.map(b=>b.bottom))}:null;
  const geometry={roof:rect(roof),exit:rect(exit)};this.geometryCache.set(frame,geometry);return geometry;
 }
 transform(){
  const {W,H}=this.bounds,base=Math.min(W/320,H/224);let scale=base,x=(W-320*scale)/2,y=0;
  if(['first','fusion','second','collapse','orbs','complete'].includes(this.stage)){
   const {roof,exit}=this.geometry(['first','fusion'].includes(this.stage)?this.media.bossData.clips.second.frames[0]:this.sourceFrame());if(roof){const v=this.bounds.view||{left:0,top:0,right:W,bottom:H};scale=Math.max(base,(v.right-v.left+64)/(roof.right-roof.left));x=(v.left+v.right)/2-(roof.left+roof.right)/2*scale;const portY=exit?.bottom??65;y=Math.min(v.top-32-roof.top*scale,v.top+(v.bottom-v.top)*.32-portY*scale);}
  }
  if(this.stage==='first'&&this.firstPose){const f=this.sourceFrame();x+=(this.firstPose.x-f.hull[0])*scale;y+=(this.firstPose.y-f.hull[1])*scale;}return {x,y,scale};
 }
 port(){if(this.stage==='approach')return {x:this.bounds.W/2,y:0};const tr=this.transform(),exit=this.geometry().exit;if(this.stage==='first'){const f=this.sourceFrame();return{x:tr.x+f.hull[0]*tr.scale,y:tr.y+(f.hull[1]+64)*tr.scale};}return {x:tr.x+(exit?(exit.left+exit.right)/2:160)*tr.scale,y:tr.y+(exit?exit.bottom:65)*tr.scale};}
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
 orbProgress(index,total){return clamp((this.time-(this.orbsAt??this.stageAt)-2.5)/3.8,0,1);}
 entryLip(){const tr=this.transform();return tr.y+70*tr.scale;}
 orbPosition(start,index,total){
  const elapsed=this.time-(this.orbsAt??this.stageAt),gather=ease(elapsed/2),p=this.orbProgress(index,total),e=ease(p),tr=this.transform(),view=this.bounds.view||{left:0,top:0,right:this.bounds.W,bottom:this.bounds.H},radius=2*(this.rosterCount>150?10:this.rosterCount>100?13:this.rosterCount>50?16:this.rosterCount>25?21:28),columns=Math.ceil(Math.sqrt(Math.max(1,total))),rows=Math.ceil(total/columns),row=Math.floor(index/columns),rowCount=Math.min(columns,total-row*columns),spacingX=Math.min(radius*2.5,(view.right-view.left)*.55/Math.max(1,columns-1)),spacingY=Math.min(radius*2.5,(view.bottom-view.top)*.25/Math.max(1,rows-1)),x=tr.x+160*tr.scale,y=Math.max(this.entryLip()+radius*3,(view.top+view.bottom)/2),gx=x+(index%columns-(rowCount-1)/2)*spacingX,gy=y+(row-(rows-1)/2)*spacingY,entryY=this.entryLip()-radius*1.5;
  return{x:(start.x+(gx-start.x)*gather)*(1-e)+x*e,y:(start.y+(gy-start.y)*gather)*(1-e)+entryY*e,p};
 }

 draw(ctx,media){
  if(this.stage==='approach')return;
  const tr=this.transform(),seconds=['orbs','complete'].includes(this.stage)?0:this.seconds;
  media.drawNative(ctx,this.clip,seconds,tr.x,tr.y,tr.scale,{loop:['first','second'].includes(this.stage),flash:hitFeedback(this).flash});
  const electric=this.electricPose();if(electric&&media.electricData)media.drawElectric(ctx,electric.direction,electric.ticks,tr.x+159*tr.scale,tr.y+89*tr.scale,tr.scale);
  this.escortFleet.draw(ctx,media);
 }

 drawHud(){}
}
