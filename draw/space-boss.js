const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
// Damage comes from swept H-bullet contacts. The final phase cannot finish before
// the original raffle has resolved its losing tickets; the winner order is unchanged.
export class SpaceBoss{
 constructor(duration,ships,audio){this.duration=duration;this.audio=audio;this.stage='approach';this.stageAt=duration*.48;this.time=0;this.lastHit=-10;this.volley=-1;this.shots=[];this.history=[];this.maxHp=Math.max(70,Math.min(1800,ships*28));this.hp=this.maxHp;}
 transition(stage,time){this.stage=stage;this.stageAt=time;if(stage==='orbs')this.orbsAt=time;this.history.push({stage,time});}
 step(time,dt,alive,bounds,selectionReady){this.time=time;this.bounds=bounds;this.selectionReady=selectionReady;const {W,H}=bounds;
  if(this.stage==='approach'&&time>=this.duration*.48)this.transition('first',time);
  const age=time-this.stageAt;
  this.x=W*(.5+Math.sin(time*.53)*.16);this.y=H*.19;if(this.stage==='first')this.y=-H*.18+H*.37*ease(age/1.8);
  if(this.stage==='fusion'){this.x=W*.5;this.y=H*(.19-.09*ease(age/3));if(age>=3.4){this.maxHp=Math.max(120,Math.min(2400,alive*70));this.hp=this.maxHp;this.transition('second',time);}}
  if(this.stage==='second'||this.stage==='collapse'||this.stage==='orbs'||this.stage==='complete'){this.x=W*.5;this.y=H*.15;}
  if(['first','second'].includes(this.stage)){const shot=Math.floor(age/(this.stage==='first'?1.35:1.05));if(shot!==this.volley){this.volley=shot;this.shots.push({x:this.x,y:this.y+H*.09,at:time,second:this.stage==='second'});this.audio.add({kind:'sound',id:'boss-fire-'+time,sound:'ym-11d4',at:time});}}
  this.shots=this.shots.filter(s=>time-s.at<2.2);
  if(this.stage==='collapse'&&age>=2.6){this.transition('orbs',time);this.shots=[];}
  if(this.stage==='orbs'&&age>=6.4)this.transition('complete',time);
 }
 hulls(){if(!['first','second'].includes(this.stage))return[];const {W,H}=this.bounds;return[{x:this.x,y:this.y,r:Math.min(W*(this.stage==='first'?.16:.27),H*.15),key:'space-boss',boss:true}];}
 hurt(time){if(!['first','second'].includes(this.stage))return false;this.lastHit=time;if(this.stage==='second'&&this.hp<=1&&(!this.selectionReady||time<this.duration))return true;
  this.hp=Math.max(0,this.hp-1);if(!this.hp){this.audio.add({kind:'sound',id:'boss-break-'+time,sound:'ym-10d1',at:time});if(this.stage==='first')this.transition('fusion',time);else this.transition('collapse',time);}return true;
 }
 get ceasefire(){return ['collapse','orbs','complete'].includes(this.stage);}
 get finished(){return this.stage==='complete';}
 orbProgress(index,total){return clamp((this.time-(this.orbsAt??this.stageAt)-index/Math.max(1,total)*1.9)/3.8,0,1);}
 orbPosition(start,index,total){const p=this.orbProgress(index,total),e=ease(p),angle=p*Math.PI*3+index*2.4,r=Math.sin(p*Math.PI)*Math.min(this.bounds.W*.12,90);return{x:start.x*(1-e)+this.bounds.W*.5*e+Math.cos(angle)*r,y:start.y*(1-e)+this.bounds.H*.18*e+Math.sin(angle)*r*.3,p};}
 draw(ctx,media){if(this.stage==='approach')return;const {W,H}=this.bounds,age=this.time-this.stageAt,flash=this.time-this.lastHit<.2;ctx.save();
  const firstWidth=Math.min(W*.43,H*.48),carrierWidth=Math.max(W*1.05,firstWidth*2.5),fusion=this.stage==='fusion'?ease(age/3):1;
  if(this.stage!=='first'){const reveal=this.stage==='fusion'?fusion:1,carrierHeight=carrierWidth*103/416;media.drawBoss(ctx,['orbs','complete'].includes(this.stage)?'boss-carrier-open':'boss-carrier',this.time,W*.5,H*.02-carrierHeight*(1-reveal),carrierWidth,{flash});}
  if(!['orbs','complete'].includes(this.stage)){const y=this.stage==='first'?this.y:this.stage==='fusion'?H*(.22-.14*fusion):H*.1,shaking=this.stage==='collapse'?Math.sin(age*65)*5:0;media.drawBoss(ctx,'boss-x',this.time,this.x+shaking,y,firstWidth,{flash:flash||this.stage==='collapse'&&Math.floor(age*12)%2===0});}
  for(const shot of this.shots){const p=(this.time-shot.at)/2.2,x=shot.x+Math.sin(p*9)*W*.1,y=shot.y+p*H*.85;ctx.shadowColor='#37bfff';ctx.shadowBlur=18;ctx.fillStyle='#70edff';ctx.beginPath();ctx.arc(x,y,shot.second?14:7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#c5ffff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);for(let k=1;k<8;k++)ctx.lineTo(x+Math.sin(k*7+this.time*24)*13,y+k*10);ctx.stroke();}
  if(this.stage==='fusion'||this.stage==='collapse'){ctx.shadowColor='#ff8a21';ctx.shadowBlur=24;for(let i=0;i<8;i++){const p=(age*1.6+i*.17)%1,x=this.x+Math.sin(i*13)*firstWidth*.4,y=H*.12+Math.cos(i*7)*firstWidth*.2;ctx.globalAlpha=1-p;ctx.fillStyle=i%2?'#fff6d4':'#ff922c';ctx.beginPath();ctx.arc(x,y,4+p*25,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
  if(['second','collapse','orbs','complete'].includes(this.stage)){const x=W*.5,y=H*.18,r=Math.min(W*.06,38)*(this.stage==='orbs'?1+Math.sin(age*4)*.05:1);ctx.shadowColor='#21cfff';ctx.shadowBlur=35;const g=ctx.createRadialGradient(x,y,2,x,y,r);g.addColorStop(0,'#e8ffff');g.addColorStop(.3,'#56edff');g.addColorStop(1,'#008bea66');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#7af4ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,r*.8,r*.3,this.time,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
 }
 drawHud(ctx){if(!['first','fusion','second'].includes(this.stage))return;const {W}=this.bounds,w=Math.min(340,W*.55),x=(W-w)/2;ctx.save();ctx.fillStyle='#091321dd';ctx.fillRect(x-8,48,w+16,46);ctx.fillStyle='#e8f6ff';ctx.textAlign='center';ctx.font='600 13px system-ui';ctx.fillText(this.stage==='first'?'X 표식 거대우주선':this.stage==='fusion'?'거대 모선과 합체 중':'최종 거대 모선',W/2,65);ctx.fillStyle='#27374b';ctx.fillRect(x,76,w,8);ctx.fillStyle=this.stage==='first'?'#f49a49':'#5cd7f4';ctx.fillRect(x,76,w*(this.stage==='fusion'?0:this.hp/this.maxHp),8);ctx.restore();}
}
