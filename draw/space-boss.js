const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
// Raffle health is host-owned; all visible boss parts, attacks, explosions,
// fusion, opening and sound cues are recorded original M68000 actor execution.
export class SpaceBoss{
 constructor(duration,ships,audio,media){Object.assign(this,{duration,audio,media});this.stage='approach';this.stageAt=duration*.48;this.time=0;this.counter=0;this.nativeTicks=0;this.queuedLoop=0;this.history=[];this.maxHp=Math.max(70,Math.min(1800,ships*28));this.hp=this.maxHp;}
 get clip(){return this.stage==='orbs'||this.stage==='complete'?'entry':this.stage;}
 get seconds(){return Math.max(0,this.time-this.stageAt);}
 transition(stage,time){this.audio.cancelQueued?.('native-boss-',time);this.stage=stage;this.stageAt=time;this.queuedLoop=0;if(stage==='orbs')this.orbsAt=time;this.history.push({stage,time});const clip=this.media.bossData.clips[this.clip];if(clip&&stage!=='complete')this.audio.add({kind:'clip',id:'native-boss-'+stage+'-'+time,clip:'boss-native-'+this.clip,at:time});}
 step(time,dt,alive,bounds,selectionReady){this.time=time;this.bounds=bounds;this.selectionReady=selectionReady;this.nativeTicks+=dt*this.media.bossData.hz;const ticks=Math.floor(this.nativeTicks);this.nativeTicks-=ticks;this.counter=Math.max(0,this.counter-ticks);
  if(this.stage==='approach'&&time>=this.duration*.48)this.transition('first',time);
  if(this.stage==='fusion'&&this.seconds>=this.media.bossData.clips.fusion.frames.length/this.media.bossData.hz){this.maxHp=Math.max(120,Math.min(2400,alive*70));this.hp=this.maxHp;this.transition('second',time);}
  if(this.stage==='collapse'&&this.seconds>=this.media.bossData.clips.collapse.frames.length/this.media.bossData.hz)this.transition('orbs',time);
  if(this.stage==='orbs'&&this.seconds>=6.4)this.transition('complete',time);
  if(['first','second'].includes(this.stage)){const clip=this.media.bossData.clips[this.clip],n=clip.frames.length,from=clip.loop_from||0,index=Math.floor(this.seconds*clip.hz),loop=index<n?0:1+Math.floor((index-n)/(n-from));if(loop>this.queuedLoop){this.queuedLoop=loop;this.audio.add({kind:'clip',id:'native-boss-loop-'+this.stageAt+'-'+loop,clip:'boss-native-'+this.clip,fromFrame:from,at:this.stageAt+(n+(loop-1)*(n-from)-from)/clip.hz});}}
 }
 transform(){const {W,H}=this.bounds,scale=Math.min(W/320,H/224);return{x:(W-320*scale)/2,y:0,scale};}
 hulls(){if(!['first','second'].includes(this.stage))return[];const f=this.media.nativeFrame(this.clip,this.seconds,{loop:true}),tr=this.transform(),[x,y,r]=f.hull;if(y+r<0)return[];return[{x:tr.x+x*tr.scale,y:tr.y+y*tr.scale,r:Math.max(12,r*tr.scale*.85),key:'space-boss',boss:true}];}
 hurt(time){if(!['first','second'].includes(this.stage))return false;this.counter|=6;if(this.stage==='second'&&this.hp<=1&&(!this.selectionReady||time<this.duration))return true;this.hp=Math.max(0,this.hp-1);if(!this.hp)this.transition(this.stage==='first'?'fusion':'collapse',time);return true;}
 get ceasefire(){return ['collapse','orbs','complete'].includes(this.stage);}
 get finished(){return this.stage==='complete';}
 orbProgress(index,total){return clamp((this.time-(this.orbsAt??this.stageAt)-index/Math.max(1,total)*1.9)/3.8,0,1);}
 orbPosition(start,index,total){const p=this.orbProgress(index,total),e=ease(p),tr=this.transform(),x=tr.x+160*tr.scale,y=42*tr.scale,r=Math.sin(p*Math.PI)*Math.min(this.bounds.W*.12,90);return{x:start.x*(1-e)+x*e+Math.cos(p*Math.PI*3+index*2.4)*r,y:start.y*(1-e)+y*e+Math.sin(p*Math.PI*3+index*2.4)*r*.3,p};}
 draw(ctx,media){if(this.stage==='approach')return;const tr=this.transform(),seconds=this.stage==='complete'?6.4:this.seconds;media.drawNative(ctx,this.clip,seconds,tr.x,tr.y,tr.scale,{loop:['first','second'].includes(this.stage),flash:this.counter>0&&!(this.counter&1)});}
 drawHud(ctx){if(!['first','fusion','second'].includes(this.stage))return;const {W}=this.bounds,w=Math.min(340,W*.55),x=(W-w)/2;ctx.save();ctx.fillStyle='#091321dd';ctx.fillRect(x-8,48,w+16,46);ctx.fillStyle='#e8f6ff';ctx.textAlign='center';ctx.font='600 13px system-ui';ctx.fillText(this.stage==='first'?'X 표식 거대우주선':this.stage==='fusion'?'거대 모선과 합체 중':'최종 거대 모선',W/2,65);ctx.fillStyle='#27374b';ctx.fillRect(x,76,w,8);ctx.fillStyle=this.stage==='first'?'#f49a49':'#5cd7f4';ctx.fillRect(x,76,w*(this.stage==='fusion'?0:this.hp/this.maxHp),8);ctx.restore();}
}
