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
      lane:(Math.random()-.5)*95,offset:(Math.random()-.5)*44,contactAt:0,removedAt:Infinity,deadAt:Infinity,shotAt:-10,swingAt:Infinity});
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
      const dying=Number.isFinite(e.deadAt);
      if(t>(dying?e.deadAt+1:fadeStart+.35))continue;
      const age=Math.min(t,e.removedAt)-e.start;
      const travel=e.end-e.start, progress=Math.min(1,Math.max(0,age/(travel-(e.breach?.78:.45))));
      const p=people[e.target],door=entrances[e.door];
      // Enter from different positions across the opening and fan out on the floor.
      const sway=Math.sin(progress*Math.PI)*e.drift*70;
      let x=door[0]+e.lane+(p.x-door[0]-e.lane)*progress+sway;
      let y=door[1]+(p.y-door[1])*progress+e.offset*(1-progress);
      if(e.removedAt!==Infinity){x=e.lastX;y=e.lastY;}else{e.lastX=x;e.lastY=y;}
      if(progress>=1 && e.swingAt===Infinity)e.swingAt=t;
      const fade=dying?Math.min(1,Math.max(0,(e.deadAt+1-t)/.24)):Math.min(1,Math.max(0,1-(t-fadeStart)/.35));
      if(!dying)e.angle=Math.atan2((p.y-door[1])*1.92,(p.x-door[0])*1.32);
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
      if(e.hp<=0)return;
      e.shotAt=t;
      damage(e,1,t,e.breach && t<e.end?1:0);
      if(e.hp===0 && e.removedAt===Infinity)e.deadAt=e.removedAt=t;
    });
    for(const enemy of live){
      const e=enemy.event,p=people[e.target];
      if(e.hp<=0 || dead.has(e.target) || !enemy.contact || t<e.contactAt || t-p.hitAt<(e.breach?.42:Math.max(2.4,seconds*.115)))continue;
      if((t-e.swingAt)%.64<.16 || (t-e.swingAt)%.64>.49)continue;
      const distance=Math.hypot(enemy.x-p.x,enemy.y-p.y);
      if(distance>Math.max(24,size*.48))continue;
      damage(p,1,t,1);e.contactAt=t+.55;
    }
    return shots;
  }
  const assetRoot=new URL('zombies-v3/',document.currentScript.src);
  const kinds=['office','fire','courier'];
  const art=new Map(), orange=new WeakMap();
  let preparing;
  function prepare(){
    if(preparing)return preparing;
    preparing=fetch(new URL('catalog.json',assetRoot)).then(async response=>{
      if(!response.ok)throw Error('Zombie art metadata unavailable');
      const catalog=await response.json();
      await Promise.all(kinds.flatMap(kind=>['side','top'].map(async view=>{
        const image=new Image();image.crossOrigin='anonymous';
        image.src=new URL(kind+'/'+(view==='top'?'top':'atlas')+'.webp',assetRoot);
        await image.decode();
        art.set(kind+'/'+view,{image,meta:catalog[kind][view]});
      })));
    }).catch(error=>{preparing=null;throw error;});
    return preparing;
  }
  function tint(mask){
    if(orange.has(mask))return orange.get(mask);
    const bitmap=document.createElement('canvas');
    bitmap.width=mask.width;bitmap.height=mask.height;
    const c=bitmap.getContext('2d');
    c.drawImage(mask,0,0);c.globalCompositeOperation='source-in';
    c.fillStyle='#ff790e';c.fillRect(0,0,bitmap.width,bitmap.height);
    orange.set(mask,bitmap);return bitmap;
  }
  function drawZombie(ctx,camera,actor,base,t){
    const {event:e,x,y,dir,fade}=actor,top=camera.tilt>=62.5;
    const species=kinds[e.id%kinds.length],asset=art.get(species+'/'+(top?'top':'side'));
    if(!asset || fade<=0)return;
    const {image,meta}=asset,death=t-e.deadAt;
    const frame=death>=0?8+Math.min(3,Math.floor(death/.19)):
      t>=e.swingAt?4+Math.floor((t-e.swingAt)%.64/.16):
      Math.floor((t-e.start)*6+e.id)%4;
    const pose=meta.frames[frame],feet=camera.project(x,y);
    const size=base*1.15*feet.scale*(species==='fire'?1.08:species==='courier'?.94:1);
    const h=size*(top?1.00:Math.max(.57,Math.cos(camera.tilt*Math.PI/180)))/meta.standingHeight;
    const w=h*meta.cellWidth/meta.cellHeight;
    const dx=-(top?pose.contact[0]:.5)*w,dy=-pose.contact[1]*h;
    const mask=DefenseMechanic.silhouette(image,meta,frame);
    const [l,u,r,b]=pose.bounds,angle=e.angle||0;
    ctx.save();ctx.translate(feet.x,feet.y);ctx.globalAlpha=fade;
    ctx.save();ctx.globalAlpha*=.67;
    if(top){ctx.translate(size*.032,size*.02);ctx.rotate(angle);}
    else{
      const shear=death>=.38?-.21:-.53,d=death>=.38?.44:-.25;
      ctx.transform(1,0,shear,d,0,0);ctx.scale(dir,1);
    }
    ctx.drawImage(mask,dx,dy,w,h);ctx.restore();
    if(top)ctx.rotate(angle);else ctx.scale(dir,1);
    ctx.drawImage(image,frame%4*meta.cellWidth,Math.floor(frame/4)*meta.cellHeight,
      meta.cellWidth,meta.cellHeight,dx,dy,w,h);
    const hit=t-e.shotAt;
    if(hit>=0 && hit<.24){
      const pulse=hit<.085?.84:hit<.125?0:.6*(.24-hit)/.115;
      if(pulse>0){ctx.save();ctx.globalAlpha*=pulse;ctx.drawImage(tint(mask),dx,dy,w,h);ctx.restore();}
      ctx.save();ctx.translate(dx+w*(l+(r-l)*.56),dy+h*(u+(b-u)*.43));
      const spread=size*(.04+.55*hit);
      ctx.globalAlpha*=1-hit/.24;ctx.strokeStyle='#ffc779';ctx.lineWidth=Math.max(1,size*.016);
      ctx.beginPath();
      for(let i=0;i<5;i++){
        const a=e.id+i*1.256,cs=Math.cos(a),sn=Math.sin(a);
        ctx.moveTo(cs*spread*.5,sn*spread*.5);ctx.lineTo(cs*spread,sn*spread);
      }
      ctx.stroke();ctx.restore();
    }
    ctx.restore();
    const sn=Math.sin(angle),cs=Math.cos(angle);
    const bottom=top?Math.max((dx+w*l)*sn,(dx+w*r)*sn)+Math.max((dy+h*u)*cs,(dy+h*b)*cs):dy+h*b;
    healthBar(ctx,feet.x,feet.y+bottom+3,Math.min(46,Math.max(18,size*.34)),e.hp,e.maxHp,t-e.hitAt,e.beforeHit,fade);
  }
  return {prepare,wavePlan,positions,engage,healthBar,damage,drawZombie};
})();
