// Scheduled encounters request attacks, never damage. Only swept physical contact
// with the intended craft calls playerDamage; misses leave the event retryable.
export class SpaceEnemyFire{
 constructor(media,audio){this.media=media;this.audio=audio;this.shots=[];this.nextLaunch=0;this.serial=0;}
 clear(){this.shots=[];}
 source(battle,target,radius){
  const v=battle.view(),inside=p=>p.x>=v.left&&p.x<=v.right&&p.y>=v.top&&p.y<=v.bottom;
  const sources=[...battle.entities.filter(e=>!e.dead&&['alien','ring'].includes(e.type)).map(e=>({x:e.x,y:e.y,type:e.type,owner:e.id})),...[...(battle.boss?.escortFleet?.entities.values()||[])].filter(e=>!e.dead&&e.visible).map(e=>({x:e.x,y:e.y,type:'alien',owner:e.id}))];
  if(['first','second'].includes(battle.boss?.stage))sources.push({...battle.boss.port(),type:'alien',owner:'space-boss'});
  let nearest=null,distance=Infinity;for(const p of sources){if(!inside(p))continue;const d=Math.hypot(p.x-target.x,p.y-target.y);if(d>radius+90&&d<distance){nearest=p;distance=d;}}return nearest;
 }
 step(time,dt,events,ships,position,radius,battle,damage,eligible){
  if(battle.stopped||battle.boss?.ceasefire){this.clear();return;}
  for(const e of events){
   if(e.s.dead){e.fired=true;continue;}
   if(e.fired||e.inFlight||time<e.at||time<(e.retryAt||0)||time<this.nextLaunch||!eligible(e)||this.shots.some(s=>s.event.s===e.s))continue;
   const p=position(e.s,time),source=this.source(battle,p,radius);if(!source)continue;
   const shot={id:++this.serial,event:e,x:source.x,y:source.y,source,at:time,speed:Math.max(360,Math.min(720,Math.hypot(p.x-source.x,p.y-source.y)/.85)),angle:Math.atan2(p.y-source.y,p.x-source.x)};
   e.inFlight=true;this.shots.push(shot);this.nextLaunch=time+(e.lethal?.18:.025);
   this.audio.add({kind:'sound',id:'hostile-fire-'+shot.id,sound:'ym-10d1',at:time});
  }
  for(const shot of this.shots){
   if(time<=shot.at)continue;const e=shot.event;if(time-shot.at>6){shot.done=true;e.inFlight=false;e.retryAt=time+.5;continue;}
   if(e.s.dead||e.s.evadingAttack)shot.ballistic=true;
   const p=position(e.s,time),previous=position(e.s,time-dt),dx=p.x-shot.x,dy=p.y-shot.y,d=Math.hypot(dx,dy)||1,travel=Math.min(d,shot.speed*dt),next=shot.ballistic?{x:shot.x+Math.cos(shot.angle)*shot.speed*dt,y:shot.y+Math.sin(shot.angle)*shot.speed*dt}:{x:shot.x+dx/d*travel,y:shot.y+dy/d*travel};if(!shot.ballistic)shot.angle=Math.atan2(dy,dx);
   shot.passed??=new Set;
   const contacts=[];for(const ship of ships){if(ship.dead||shot.passed.has(ship.id))continue;const to=position(ship,time),from=position(ship,time-dt),u=battle.sweptContact({x:shot.x-from.x,y:shot.y-from.y},{x:next.x-to.x,y:next.y-to.y},{x:0,y:0,r:radius*1.25+7});if(u!==null)contacts.push({ship,to,u});}
   Object.assign(shot,next);
   for(const {ship,to} of contacts.sort((a,b)=>a.u-b.u)){
    shot.passed.add(ship.id);const contact={time,shot:shot.id,source:shot.source.owner,launched:shot.at,type:shot.source.type};
    const accepted=damage(ship,time,{lethal:e.lethal,organic:shot.source.type==='alien',contact});
    if(!accepted){shot.ballistic=true;continue;}ship.lastEnemyContact=contact;shot.done=true;e.inFlight=false;battle.impacts?.push({at:time,x:to.x,y:to.y});
    if(ship===e.s){e.x=to.x;e.y=to.y;e.contactAt=time;e.fired=!e.lethal||ship.dead;}e.retryAt=time+.8;break;
   }
  }
  this.shots=this.shots.filter(s=>!s.done);
 }
 draw(ctx,time){for(const s of this.shots){ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle-Math.PI);this.media.draw(ctx,s.source.type+'-shot',time-s.at,0,0,2.4,{loop:true});ctx.restore();}}
}
