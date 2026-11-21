'use strict';
window.DefenseBattle = (() => {
  function healthBar(ctx,x,y,width,hp,maxHp,hitAge,previous=hp,alpha=1){
    const ratio=Math.max(0,Math.min(1,hp/maxHp)), level=ratio*4;
    const w=Math.round(width), h=w<30?5:7, gap=w<30?1:2, seg=(w-2-3*gap)/4;
    x=Math.round(x-w/2); y=Math.round(y);
    const trail=hitAge>=0?Math.max(0,1-hitAge/.36):0;
    const pending=level+(previous/maxHp*4-level)*trail;
    ctx.save();ctx.globalAlpha*=alpha;
    ctx.fillStyle='#101a24';ctx.fillRect(x,y,w,h);
    for(let i=0;i<4;i++){
      const start=x+1+i*(seg+gap);
      ctx.fillStyle='#334155';ctx.fillRect(start,y+1,seg,h-2);
      if(pending>level && pending>i){
        ctx.fillStyle='#ffe2c2';ctx.fillRect(start,y+1,seg*Math.min(1,pending-i),h-2);
      }
      if(level>i){
        ctx.fillStyle=level<=1?'#f52235':level<=2?'#e6b800':'#16c65b';
        ctx.fillRect(start,y+1,seg*Math.min(1,level-i),h-2);
      }
    }
    ctx.restore();
  }
  function damage(actor,amount,t,floor=0){
    const hp=Math.max(floor,actor.hp-amount);
    if(hp>=actor.hp)return;
    if(t!==actor.hitAt)actor.beforeHit=actor.hp;
    actor.hp=hp;actor.hitAt=t;
  }
  function prepareEvent(event,count,breach,id){
    const capacity=breach?Math.max(12,count*4):Math.max(4,Math.ceil(count/8));
    return Object.assign(event,{id,breach,hp:capacity,maxHp:capacity,beforeHit:capacity,hitAt:-10,
      lane:(Math.random()-.5)*95,offset:(Math.random()-.5)*44,contactAt:0,removedAt:Infinity});
  }
  function wavePlan(count,seconds,attacks){
    const events=[];
    for(const a of attacks){
      a.start=a.end-3.5;
      events.push(prepareEvent(a,count,true,events.length));
    }
    // Four entry lanes push together. Bound the active population for a 300-name draw.
    const interval=Math.max(.28,.62-count*.002);
    for(let t=0;t<seconds-.5;t+=interval){
      for(let j=0;j<4;j++){
        const start=t+(t===0?0:Math.random()*.12);
        events.push(prepareEvent({start,end:start+3.65+Math.random()*.7,
          door:(j+Math.floor(t*2))%4,target:Math.floor(Math.random()*count),
          drift:Math.random()*2-1},count,false,events.length));
      }
    }
    return events.sort((a,b)=>a.start-b.start);
  }
  function positions(events,first,t,people,entrances,warnings){
    let survivors;
    const actors=[];
    for(let i=first;i<events.length && events[i].start<=t;i++){
      const e=events[i];
      if(!e.breach && people[e.target].hp===0 && e.removedAt===Infinity){
        if(e.lastX===undefined){
          survivors ||= people.map((p,i)=>p.hp>0?i:-1).filter(i=>i>=0);
          if(!survivors.length)continue;
          e.target=survivors[e.id%survivors.length];
        }else{
          e.removedAt=t;
        }
      }
      const fadeStart=Math.min(e.removedAt,e.end+(e.breach?.35:.6));
      if(t>fadeStart+.35)continue;
      const age=Math.min(t,e.removedAt)-e.start;
      const travel=e.end-e.start, progress=Math.min(1,Math.max(0,age/(travel-(e.breach?.78:.45))));
      const p=people[e.target],door=entrances[e.door];
      // Enter from different positions across the opening and fan out on the floor.
      const sway=Math.sin(progress*Math.PI)*e.drift*70;
      let x=door[0]+e.lane+(p.x-door[0]-e.lane)*progress+sway;
      let y=door[1]+(p.y-door[1])*progress+e.offset*(1-progress);
      if(e.removedAt!==Infinity){x=e.lastX;y=e.lastY;}else{e.lastX=x;e.lastY=y;}
      const fade=Math.min(1,Math.max(0,1-(t-fadeStart)/.35));
      actors.push({event:e,x,y,dir:p.x>door[0]?1:-1,step:Math.sin(age*8+e.id),fade,
        active:t<fadeStart && e.hp>0,contact:progress>=1});
      if(e.breach && t<=e.end)warnings[e.door]=Math.max(warnings[e.door],.6+Math.sin(t*9)*.35);
    }
    return actors;
  }
  function engage(people,dead,enemies,t,dt,size,weapon,seconds){
    const live=enemies.filter(e=>e.active);
    // Acquire from the same snapshot so a single volley can include every surviving defender.
    const targets=people.map((p,i)=>{
      if(dead.has(i))return null;
      let nearest=null,best=Infinity,threat=null,close=Infinity;
      for(const e of live){
        const distance=(p.x-e.x)**2+(p.y-e.y)**2;
        if(distance<close){close=distance;threat=e;}
        // Vary preference at similar ranges, spreading shots across the entrance lanes.
        const score=distance*(.77+.46*((e.event.id*17+i*29+e.event.id*i*7)%61)/60);
        if(score<best){best=score;nearest=e;}
      }
      return {nearest,threat,close};
    });
    let shots=0;
    people.forEach((p,i)=>{
      const target=targets[i];if(!target)return;
      const enemy=target.nearest,radius=Math.max(40,size*.65);
      if(target.threat && target.close<radius*radius){
        const dx=p.x-target.threat.x,dy=p.y-target.threat.y,d=Math.hypot(dx,dy);
        p.escapeX=d>.01?dx/d:p.facing;p.escapeY=d>.01?dy/d:0;p.runUntil=t+.34;
      }
      p.running=false;
      const fleeing=t<p.runUntil,homeDistance=Math.hypot(p.homeX-p.x,p.homeY-p.y);
      if(fleeing || (t>p.runUntil+.35 && homeDistance>1)){
        const speed=Math.max(80,size*1.25),step=fleeing?dt*speed:Math.min(homeDistance,dt*speed*.72);
        const dx=fleeing?p.escapeX:(p.homeX-p.x)/homeDistance;
        const dy=fleeing?p.escapeY:(p.homeY-p.y)/homeDistance;
        const reach=Math.max(38,Math.min(100,size*.65));
        const x=Math.max(80,p.homeX-reach,Math.min(1120,p.homeX+reach,p.x+dx*step));
        const y=Math.max(310,p.homeY-reach,Math.min(770,p.homeY+reach,p.y+dy*step));
        const moved=Math.hypot(x-p.x,y-p.y);
        if(moved>.01){
          p.angle=Math.atan2((y-p.y)*1.92,(x-p.x)*1.32);p.travel+=moved/(size*.65);
          p.x=x;p.y=y;p.running=true;
        }
      }
      if(!enemy)return;
      p.aimAngle=Math.atan2((enemy.y-p.y)*1.92,(enemy.x-p.x)*1.32);
      if(!p.running)p.angle=p.aimAngle;
      p.aimUntil=t+.24;
      if(t<p.nextShot)return;
      p.fired=t;p.nextShot=t+(weapon==='k2'?.32:.68)+.08*((i*19)%31)/30;shots++;
      const e=enemy.event;
      // A scheduled breach reserves its last point until contact so gun selection cannot bias the raffle.
      damage(e,1,t,e.breach && t<e.end?1:0);
      if(e.hp===0 && e.removedAt===Infinity)e.removedAt=t;
    });
    for(const enemy of live){
      const e=enemy.event,p=people[e.target];
      if(e.hp<=0 || dead.has(e.target) || !enemy.contact || t<e.contactAt || t-p.hitAt<(e.breach?.42:Math.max(2.4,seconds*.115)))continue;
      const distance=Math.hypot(enemy.x-p.x,enemy.y-p.y);
      if(distance>Math.max(24,size*.48))continue;
      damage(p,1,t,1);e.contactAt=t+.55;
    }
    return shots;
  }
function drawZombie(ctx,camera,walker,overheadEnemy,{x,y,dir,step,fade,event},base,t) {
  const feet=camera.project(x,y), rad=camera.tilt*Math.PI/180;
  const full=base*1.15, height=full*feet.scale*Math.max(.34,Math.cos(rad));
  let blend=overheadEnemy.naturalWidth?Math.max(0,Math.min(1,(camera.tilt-48)/32)):0;
  blend=blend*blend*(3-2*blend);
  const center=camera.project(x,y,full*.80), side=full*center.scale*.59;
  const hitAge=t-event.hitAt;
  const recoil=hitAge>=0 && hitAge<.14?(1-hitAge/.14)*full*feet.scale*.035:0;
  ctx.save();ctx.translate(feet.x-dir*recoil,feet.y);ctx.globalAlpha=fade;
  if(walker.naturalWidth && blend<1){
    const w=height*walker.width/walker.height;
    ctx.save();ctx.globalAlpha=fade*(1-blend)*.62;ctx.transform(1,0,-.53,-.25,1,1);
    ctx.scale(dir,1);ctx.translate(0,-Math.abs(step)*height*.018);ctx.rotate(step*.032);
    ctx.drawImage(DefenseMechanic.silhouette(walker,{},0),-w/2,-height,w,height);ctx.restore();
  }
  if(blend){
    ctx.save();ctx.globalAlpha=fade*blend*.62;ctx.translate(center.x-feet.x+side*.12,center.y-feet.y+side*.10);
    ctx.scale(dir,1);ctx.rotate(step*.025+Math.PI/2);
    ctx.drawImage(DefenseMechanic.silhouette(overheadEnemy,{},0),-side/2,-side/2,side,side);ctx.restore();
  }
  ctx.scale(dir,1);ctx.translate(0,-Math.abs(step)*height*.018);
  if(walker.naturalWidth && blend<1){
    const w=height*walker.width/walker.height;
    ctx.rotate(step*.032);ctx.globalAlpha=fade*(1-blend);ctx.drawImage(walker,-w/2,-height,w,height);
  }
  ctx.restore();
  if(blend){
    ctx.save();ctx.globalAlpha=fade*blend;ctx.translate(center.x,center.y);
    ctx.scale(dir,1);ctx.rotate(step*.025+Math.PI/2);
    ctx.drawImage(overheadEnemy,-side/2,-side/2,side,side);ctx.restore();
  }
  const crown=center;
  const headY=(feet.y-height)*(1-blend)+(crown.y-full*crown.scale*.30)*blend;
  healthBar(ctx,feet.x,headY-8,Math.min(46,Math.max(18,height*.34)),event.hp,event.maxHp,hitAge,event.beforeHit,fade);
}
  return {wavePlan,positions,engage,healthBar,damage,drawZombie};
})();
