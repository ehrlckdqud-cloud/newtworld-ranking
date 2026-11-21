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
  function wavePlan(count,seconds,attacks,survivors){
    const start=seconds*2/3,door=Math.floor(Math.random()*4),events=[];
    const boss=prepareEvent({start,end:seconds,door},count,false,0);
    Object.assign(boss,{boss:true,hp:100,maxHp:100,beforeHit:100,route:[],survivor:survivors[0]});
    const bossVictims=attacks.filter(a=>a.end>=start);
    const firstImpact=start+3.08+slamContact,lastImpact=seconds-2.50+slamContact;
    const strikes=Math.max(1,1+2*Math.floor((lastImpact-firstImpact)/1.40));
    for(let i=0;i<strikes;i++){
      const impact=strikes===1?firstImpact:firstImpact+(lastImpact-firstImpact)*i/(strikes-1);
      boss.route.push({impact,target:boss.survivor});
    }
    bossVictims.forEach((a,i)=>{
      const slot=boss.route[bossVictims.length===1?strikes-1:Math.round(i*(strikes-1)/(bossVictims.length-1))];
      slot.target=a.target;a.end=slot.impact;a.start=a.end-slamContact;a.boss=true;a.door=door;
    });
    for(const a of attacks){
      if(!a.boss){a.start=a.end-3.5;events.push(prepareEvent(a,count,true,events.length));}
    }
    const interval=Math.max(.28,.62-count*.002);
    for(let t=0;t<start;t+=interval){
      for(let j=0;j<4;j++){
        const spawn=t+(t===0?0:Math.random()*.12);
        if(spawn>=start)continue;
        events.push(prepareEvent({start:spawn,end:spawn+3.65+Math.random()*.7,
          door:(j+Math.floor(t*2))%4,target:Math.floor(Math.random()*count),drift:Math.random()*2-1},count,false,events.length));
      }
    }
    events.sort((a,b)=>a.start-b.start);
    events.boss=boss;
    return events;
  }
  function kindOf(e){return e.boss?'press':kinds[e.id%kinds.length];}
  function relativeSize(kind){return kind==='press'?2.70:kind==='fire'?1.08:kind==='courier'?.94:1;}
  function viewOf(e,tilt){return tilt>=62.5?'top':e.boss && tilt>=17.5?'raised':'side';}
  function armReach(e,size,tilt){
    const kind=kindOf(e),view=viewOf(e,tilt),meta=art.get(kind+'/'+view)?.meta;
    if(!meta)return size*(e.boss?1.275:.55);
    const pose=e.boss?motions.get('slam/'+view).meta.frames[5]:meta.frames[6],pivot=view==='top'?pose.contact[0]:.5;
    const projection=view==='top'?1:Math.max(.57,Math.cos(tilt*Math.PI/180));
    const hand=size*1.15*relativeSize(kind)*projection/meta.standingHeight*
      meta.cellWidth/meta.cellHeight*(pose.bounds[2]-pivot);
    // X world-units are 1.32 screen units at the same floor depth.
    return (Math.max(size*.20,hand)+size*.14)/1.32;
  }
  function approach(p,fromX,gap){
    const dir=fromX<p.homeX?1:-1;
    return {x:p.x-dir*gap,y:p.y,dir};
  }
  function bossPosition(e,t,people,entrances,size,tilt){
    if(Number.isFinite(e.deadAt))return {event:e,x:e.lastX,y:e.lastY,dir:e.dir,fade:1,active:false,contact:false};
    // After the entrance the boss starts its combat route from the roar position.
    const originX=landing.x,originY=landing.y;
    const age=t-e.start,gap=armReach(e,size,tilt);
    let i=e.routeIndex||0;
    while(i+1<e.route.length && t>=e.route[i].impact+slamRecovery)i++;
    e.routeIndex=i;
    const step=e.route[i],prev=e.route[i-1],p=people[step.target];
    const begin=prev?prev.impact+slamRecovery:e.start+entranceDuration;
    const src=prev?approach(people[prev.target],originX,gap):{x:originX,y:originY};
    const dst=approach(p,originX,gap),windup=step.impact-slamContact;
    const progress=Math.max(0,Math.min(1,(t-begin)/Math.max(.04,windup-begin)));
    const smooth=progress*progress*(3-2*progress);
    e.lastX=src.x+(dst.x-src.x)*smooth;e.lastY=src.y+(dst.y-src.y)*smooth;
    e.dir=progress<.95 && Math.abs(dst.x-src.x)>8?Math.sign(dst.x-src.x):dst.dir;
    e.angle=progress>0 && progress<.95?Math.atan2((dst.y-src.y)*1.92,(dst.x-src.x)*1.32):e.dir<0?Math.PI:0;
    if(age<wallTravel){
      const at=entryPoint(age);
      e.lastX=at.x;e.lastY=at.y;
      // Turn from the camera-facing passage toward the first target on reaching the floor mark.
      const turn=Math.min(1,Math.max(0,(age-.42)/(wallTravel-.42)));
      e.angle=Math.PI/2+(e.angle-Math.PI/2)*turn;
    }
    e.target=step.target;e.swingAt=windup;
    return {event:e,x:e.lastX,y:e.lastY,dir:e.dir,fade:1,active:age>=.50,
      contact:t>=step.impact && t<step.impact+.08,gap,
      arrival:age<entranceDuration?age:null,slamAge:t>=windup && t<step.impact+slamRecovery?t-windup:null};
  }
  function positions(events,first,t,people,entrances,warnings,size,tilt){
    let survivors;
    const actors=[];
    for(let i=first;i<events.length && events[i].start<=t;i++){
      const e=events[i];
      if(!e.breach && people[e.target].hp===0 && e.removedAt===Infinity){
        if(e.lastX===undefined){
          survivors ||= people.map((p,i)=>p.hp>0?i:-1).filter(i=>i>=0);
          if(!survivors.length)continue;
          e.target=survivors[e.id%survivors.length];
        }else e.removedAt=t;
      }
      const fadeStart=Math.min(e.removedAt,e.end+(e.breach?.35:.6)),dying=Number.isFinite(e.deadAt);
      if(t>(dying?e.deadAt+6:fadeStart+.35))continue;
      const age=Math.min(t,e.removedAt)-e.start;
      const travel=e.end-e.start, progress=Math.min(1,Math.max(0,age/(travel-(e.breach?.78:.45))));
      const p=people[e.target],door=entrances[e.door],gap=armReach(e,size,tilt);
      const srcX=door[0]+e.lane,srcY=door[1]+e.offset,dst=approach(p,srcX,gap);
      const sway=Math.sin(progress*Math.PI)*e.drift*70;
      let x=srcX+(dst.x-srcX)*progress+sway,y=srcY+(dst.y-srcY)*progress;
      if(e.removedAt!==Infinity){x=e.lastX;y=e.lastY;}else{
        e.lastX=x;e.lastY=y;e.dir=dst.dir;e.angle=Math.atan2((p.y-y)*1.92,(p.x-x)*1.32);
      }
      if(progress>=1 && e.swingAt===Infinity)e.swingAt=t;
      const fade=dying?Math.min(1,Math.max(0,(e.deadAt+2.2-t)/.45)):Math.min(1,Math.max(0,1-(t-fadeStart)/.35));
      actors.push({event:e,x,y,dir:e.dir,fade,gap,active:t<fadeStart && e.hp>0,contact:progress>=1});
      if(e.breach && t<=e.end)warnings[e.door]=Math.max(warnings[e.door],.6+Math.sin(t*9)*.35);
    }
    if(t>=events.boss.start)actors.push(bossPosition(events.boss,t,people,entrances,size,tilt));
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
        const score=(e.event.boss?.08:1)*distance*(.77+.46*((e.event.id*17+i*29+e.event.id*i*7)%61)/60);
        if(score<best){best=score;nearest=e;}
      }
      return {nearest,threat,close};
    });
    const living=people.length-dead.size;
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
      p.fired=t;p.shotAngle=p.aimAngle;p.nextShot=t+(weapon==='k2'?.32:.68)+.08*((i*19)%31)/30;shots++;
      const e=enemy.event;
      // A scheduled breach reserves its last point until contact so gun selection cannot bias the raffle.
      if(e.hp<=0)return;
      recordHit(e,t,p.aimAngle,enemy.x,enemy.y);
      if(e.boss){
        const remaining=Math.max(.1,e.end-1.35-t);
        const interval=weapon==='k2'?.36:.72;
        const amount=t>=e.end-1.35?e.hp:Math.max(.01,e.hp*interval/(remaining*living));
        damage(e,amount,t,t<e.end-1.35?.1:0);
      }else damage(e,1,t,e.breach && t<e.end?1:0);
      if(e.hp===0 && e.removedAt===Infinity){e.deadAt=e.removedAt=t;playCue(e.boss?'bDeath':'zDeath');}
    });
    for(const enemy of live){
      const e=enemy.event,p=people[e.target];
      if(!e.boss && e.hp>0 && enemy.contact && !dead.has(e.target)){
        const swing=Math.floor((t-e.swingAt)/.64);
        if(e.lastVocalSwing!==swing){e.lastVocalSwing=swing;playCue('zAttack');}
      }
      if(e.hp<=0 || dead.has(e.target) || !enemy.contact || t<e.contactAt || t-p.hitAt<(e.breach?.42:Math.max(2.4,seconds*.115)))continue;
      if(!e.boss && ((t-e.swingAt)%.64<.16 || (t-e.swingAt)%.64>.49))continue;
      const distance=Math.hypot(enemy.x-p.x,enemy.y-p.y);
      if(Math.abs(distance-enemy.gap)>Math.max(8,size*.16))continue;
      const before=p.hp;damage(p,1,t,1);if(p.hp<before)playCue('hurt');e.contactAt=t+.55;
    }
    return shots;
  }
  const entranceDuration=2.34,slamContact=.12,slamRecovery=.10;
  const motionRoot=new URL('breach-v1/',document.currentScript.src);
  const motions=new Map();
  let roof,debrisAtlas;
  async function prepareBreach(){
    const response=await fetch(new URL('poses.json',motionRoot));
    if(!response.ok)throw Error('Boss poses unavailable');
    const poses=await response.json();
    await Promise.all(['slam','roar'].flatMap(action=>['side','raised','top'].map(async view=>{
      const image=await readImage(new URL(action+'-'+view+'.webp',motionRoot));
      const meta=poses[action][view];motions.set(action+'/'+view,{image,meta});
    })).concat(readImage(new URL('roof.webp',motionRoot)).then(image=>{roof=image;})));
  }
  const clips={"hurt":[[0,13856],[14959,8372],[24434,9836],[35373,5584]],"crewDeath":[[42060,23040],[66203,15232]],"zAttack":[[82538,18777],[102418,18215],[121736,23234],[146073,20926]],"zDeath":[[168102,17354],[186559,16640],[204302,20714],[226119,16848]],"bAttack":[[244070,12432]],"bDeath":[[257605,28361]],"roar":[[287069,53312]],"wallBreak":[],"slam":[[370149,12127]]};
  const levels={hurt:.75,crewDeath:.88,zAttack:.48,zDeath:.59,bAttack:.94,bDeath:1,roar:.97,wallBreak:3,slam:1.04};
  const crowdDelay={hurt:.12,crewDeath:.09,zAttack:.21,zDeath:.14};
  const activeSounds=new Map(),lastVariant=new Map(),nextVoice=new Map();
  let mixer,bank,wallSound,loadingBank,loadingWall,bus,wallBus;
  function loadSound(ctx,file){
    return fetch(new URL('../audio/'+file,motionRoot))
      .then(r=>{if(!r.ok)throw Error('Combat sound unavailable: '+file);return r.arrayBuffer();})
      .then(bytes=>ctx.decodeAudioData(bytes));
  }
  function prepareAudio(ctx){
    if(!ctx)return;
    if(!mixer){
      mixer=ctx;bus=ctx.createGain();bus.connect(ctx.destination);
      wallBus=ctx.createGain();
      const limiter=ctx.createDynamicsCompressor();
      limiter.threshold.value=-1;limiter.knee.value=0;limiter.ratio.value=20;
      limiter.attack.value=.001;limiter.release.value=.08;
      wallBus.connect(limiter);limiter.connect(ctx.destination);
    }
    if(!loadingBank)loadingBank=loadSound(ctx,'combat-v2.mp3').then(decoded=>{bank=decoded;})
      .catch(()=>{loadingBank=null;});
    if(!loadingWall)loadingWall=loadSound(ctx,'wall-break-v3.mp3').then(decoded=>{
      wallSound=decoded;clips.wallBreak=[[0,decoded.duration*22050]];
    }).catch(()=>{loadingWall=null;});
    return Promise.all([loadingBank,loadingWall]);
  }
  function audioLevel(value){if(bus){bus.gain.value=value;wallBus.gain.value=value;}}
  function stopAudio(){
    for(const source of activeSounds.keys())source.stop();
    activeSounds.clear();nextVoice.clear();
  }
  function playCue(name,offset=0){
    const wall=name==='wallBreak',buffer=wall?wallSound:bank;
    if(!buffer || !bus.gain.value || mixer.state!=='running')return false;
    const now=mixer.currentTime, delay=crowdDelay[name];
    if(delay && (now<(nextVoice.get(name)||0) || activeSounds.size>=11))return false;
    const variants=clips[name],prior=lastVariant.get(name);
    let i=0;
    if(variants.length>1){
      i=Math.floor(Math.random()*(variants.length-(prior===undefined?0:1)));
      if(prior!==undefined && i>=prior)i++;
    }
    const [start,length]=variants[i],duration=length/22050-offset;
    if(duration<=0)return false;
    const source=mixer.createBufferSource(),level=mixer.createGain();
    level.gain.value=levels[name];source.buffer=buffer;
    source.connect(level);level.connect(wall?wallBus:bus);activeSounds.set(source,name);
    source.onended=()=>{activeSounds.delete(source);source.disconnect();level.disconnect();};
    source.start(0,start/22050+offset,duration);
    lastVariant.set(name,i);
    if(delay)nextVoice.set(name,now+delay);
    return true;
  }
  function syncEntranceVoice(boss,age){
    // Resume from the current game time after a pause or unmute. Never restart a finished clip.
    const firstBreachFrame=age>=0 && !boss.wallPassed;
    if(firstBreachFrame)boss.wallPassed=true;
    for(const [name,start] of [['wallBreak',0],['roar',.74]]){
      const offset=age-start;
      if(offset<0 || !clips[name].length || offset>=clips[name][0][1]/22050 || boss.voicePlayed?.has(name))continue;
      // Keep the initial crack aligned with the first frame that shows the broken wall.
      const from=name==='wallBreak' && firstBreachFrame && age<.74?0:offset;
      if(playCue(name,from)){(boss.voicePlayed||=new Set()).add(name);}
    }
  }
  let currentBoss,nextImpact=0,strikeAt=-Infinity;
  function cameraShake(time,duration,slam){
    if(time<0 || time>=duration)return null;
    const edge=Math.min(innerWidth,innerHeight), u=time/duration;
    const amplitude=slam?.5*Math.min(50,edge*.085):Math.min(40,edge*.068);
    const envelope=slam?(1-u)**1.6:Math.min(1,u/.05,(1-u)/.25);
    const x=slam?.60*Math.cos(time*49):.75*Math.sin(time*47)+.23*Math.sin(time*69);
    const y=slam?Math.cos(time*54):.80*Math.sin(time*59+.4);
    return {x:x*amplitude*envelope,y:y*amplitude*envelope};
  }
  function syncBossFeedback(ctx,boss,t,volume,shakeOn){
    if(!boss)return null;
    if(currentBoss!==boss){currentBoss=boss;nextImpact=0;strikeAt=-Infinity;}
    syncEntranceVoice(boss,t-boss.start);
    const attack=boss.route[nextImpact];
    if(attack && t>=attack.impact-slamContact && t<boss.deadAt && !attack.voiced){
      attack.voiced=true;playCue('bAttack');
    }
    let struck=false;
    while(nextImpact<boss.route.length && boss.route[nextImpact].impact<=Math.min(t,boss.deadAt)){
      nextImpact++;struck=true;
    }
    if(struck && t<boss.deadAt){
      // Show contact on the first painted frame that crosses it, even after a slow frame.
      strikeAt=t;playCue('slam');
    }
    if(!shakeOn)return null;
    return cameraShake(t-strikeAt,.42,true) || cameraShake(t-boss.start-.74,1.67,false);
  }
  const assetRoot=new URL('zombies-v3/',document.currentScript.src);
  const kinds=['office','fire','courier'];
  const art=new Map(), hitLights=new WeakMap();
  const hitFlashSeconds=.065;
  const bossRoot=new URL('press-v1/',document.currentScript.src);
  const effectsRoot=new URL('ballistic-v1/',document.currentScript.src);
  const surfaceRoot=new URL('impact-v2/',document.currentScript.src);
  const spraySheets=new Map(),impactSheets=new Map();
  let stainAtlas;
  const sprayDuration=1, lastDeathEmission=.46;
  async function readImage(url){
    const image=new Image();image.crossOrigin='anonymous';image.src=url;
    await image.decode();return image;
  }
  let preparing;
  function prepare(){
    if(preparing)return preparing;
    async function loadSpecies(root,boss){
      const response=await fetch(new URL('catalog.json',root));
      if(!response.ok)throw Error('Zombie art metadata unavailable');
      const catalog=await response.json();
      await Promise.all((boss?['press']:kinds).flatMap(kind=>(boss?['side','raised','top']:['side','top']).map(async view=>{
        const url=new URL(boss?view+'.webp':kind+'/'+(view==='top'?'top':'atlas')+'.webp',root);
        const [image,clean]=await Promise.all([readImage(url),boss?readImage(new URL('boss-'+view+'.webp',effectsRoot)):null]);
        art.set(kind+'/'+view,{image,clean,meta:boss?catalog[view]:catalog[kind][view]});
      })));
    }
    preparing=Promise.all([readImage(new URL('debris-v1.webp',motionRoot)).then(img=>{debrisAtlas=img;}),prepareBreach(),loadSpecies(assetRoot,false),loadSpecies(bossRoot,true),
      readImage(new URL('stains.webp',surfaceRoot)).then(img=>{stainAtlas=img;}),
      ...['side','raised','top'].flatMap(view=>[
        readImage(new URL('spray-'+view+'.webp',effectsRoot)).then(img=>spraySheets.set(view,img)),
        readImage(new URL('impact-'+view+'.webp',surfaceRoot)).then(img=>impactSheets.set(view,img))
      ])])
      .catch(error=>{preparing=null;throw error;});
    return preparing;
  }
  // A warm, directional light pass on the actual painted pose keeps its material detail.
  function hitLight(image,meta,tile,pose,fromLeft){
    let cache=hitLights.get(image);
    if(!cache){cache=[];hitLights.set(image,cache);}
    const key=tile*2+Number(fromLeft);
    if(cache[key])return cache[key];
    const sw=meta.cellWidth,sh=meta.cellHeight,layer=document.createElement('canvas');
    layer.width=160;layer.height=Math.round(160*sh/sw);
    const c=layer.getContext('2d'),w=layer.width,h=layer.height;
    c.drawImage(image,tile%meta.cols*sw,Math.floor(tile/meta.cols)*sh,sw,sh,0,0,w,h);
    const [left,upper,right,bottom]=pose.bounds;
    const x=(left+(right-left)*(fromLeft?.37:.63))*w,y=(upper+(bottom-upper)*.41)*h;
    const radius=Math.max(w*(right-left)*.70,h*(bottom-upper)*.47);
    const glow=c.createRadialGradient(x,y,0,x,y,radius);
    glow.addColorStop(0,'rgba(255,196,125,.70)');
    glow.addColorStop(.34,'rgba(238,137,55,.51)');
    glow.addColorStop(1,'rgba(201,82,29,.08)');
    c.globalCompositeOperation='source-atop';c.fillStyle=glow;c.fillRect(0,0,w,h);
    cache[key]=layer;return layer;
  }
  function recordHit(e,t,angle,x,y){
    e.shotAt=t;e.shotCount=(e.shotCount||0)+1;
    const recent=e.bursts||(e.bursts=[]),last=recent[recent.length-1];
    if(last && last.t===t && Math.cos(last.angle-angle)>.75)return;
    if(recent.length===16)recent.shift();
    recent.push({t,angle,x,y,index:e.shotCount});
  }
  // The droplets in each sheet have their own flight time and stop at the floor.
  // Render from the shot's world position so an advancing zombie cannot drag a cloud along.
  function drawFlight(ctx,camera,sheets,view,feet,size,age,angle,height,offset,variant,scale=1){
    if(age<0 || age>=sprayDuration)return;
    const frame=(variant&1)*32+Math.floor(age*32),image=sheets.get(view);
    const unit=size*height*scale/56, tilt=camera.tilt*Math.PI/180;
    const lift=view==='top'?0:Math.cos(tilt);
    const vertical=view==='top'?1:lift/(view==='raised'?Math.cos(32*Math.PI/180):1);
    const extraHeight=size*height*(1-scale);
    const remainingLift=Math.max(0,1-(age/.76)**2);
    const x=feet.x+size*offset,y=feet.y-(unit*56+extraHeight*remainingLift)*lift;
    ctx.save();ctx.translate(x,y);
    if(view==='top')ctx.rotate(angle);
    else ctx.scale(Math.cos(angle)<0?-1:1,vertical);
    ctx.drawImage(image,(frame%8)*192,Math.floor(frame/8)*144,192,144,
      -29*unit,-52*unit,192*unit,144*unit);
    ctx.restore();
  }
  const deathBursts=[
    // Time after impact, source height and horizontal position, direction from the torso.
    [0,.57,.01,.16],[.07,.47,-.15,2.75],[.16,.35,.22,-.28],
    [.28,.25,-.29,3.55],[lastDeathEmission,.16,.29,.53]
  ];
  function drawSprays(ctx,camera,actor,base,t){
    const e=actor.event,view=camera.tilt>=62.5?'top':camera.tilt>=17.5?'raised':'side';
    const height=base*1.15*relativeSize(kindOf(e));
    for(const burst of e.bursts||[]){
      const age=t-burst.t;
      if(age<0 || age>=sprayDuration)continue;
      const feet=camera.project(burst.x,burst.y);
      drawFlight(ctx,camera,impactSheets,view,feet,height*feet.scale,age,burst.angle,.49+(burst.index%3)*.035,0,burst.index,e.boss?1/1.5:1);
    }
    const death=t-e.deadAt;
    if(death<0 || death>=lastDeathEmission+sprayDuration)return;
    const feet=camera.project(actor.x,actor.y),dir=actor.dir||1;
    for(const [delay,level,offset,angle] of deathBursts){
      drawFlight(ctx,camera,spraySheets,view,feet,height*feet.scale,death-delay,
        view==='top'?(e.angle||0)+angle:dir<0?Math.PI-angle:angle,level,dir*offset,e.id+Math.round(delay*100));
    }
  }
  function drawPool(ctx,camera,actor,size,t){
    const e=actor.event,age=t-e.deadAt;
    if(age<.16)return;
    const pos=camera.project(actor.x,actor.y);
    const spread=1-Math.exp(-Math.max(0,age-.16)*3.5);
    const w=size*pos.scale*relativeSize(kindOf(e))*(.42+.92*spread);
    const h=w*(.19+.58*Math.sin(camera.tilt*Math.PI/180));
    ctx.save();ctx.globalAlpha=e.boss?.93:Math.min(.92,Math.max(0,(6-age)/1.2));
    const tile=e.id%4;
    ctx.drawImage(stainAtlas,tile%2*256,Math.floor(tile/2)*256,256,256,pos.x-w*.5,pos.y-h*.5,w,h);
    ctx.restore();
  }
  function actionTile(age,ends){const i=ends.findIndex(end=>age<end);return i<0?7:i;}
  const slamEnds=[.0225,.05,.075,.10,slamContact,.16,.19,slamContact+slamRecovery];
  // The roar painter framed each view differently from the walk cycle.
  // Match the visible body mass at the planted feet, including its projected shadow.
  const roarScale={side:[1.48,1.08],raised:[1.20,1.10],top:[1.06,1.06]};
  // Alpha-weighted body area of the clean death art against the four walking poses.
  const deathScale={side:[1.02,1.02,1.15,1.30],raised:[1.03,1.12,1.14,1.31],top:[1.12,1.01,1.02,1.00]};
  const roarEnds=[.56,.69,.83,.99,1.16,1.77,2.04,entranceDuration];
  const landing={x:600,y:550}, wallTravel=.74;
  const wallY=525-650/1.92;
  function entryPoint(age){
    const u=Math.min(1,Math.max(0,age/wallTravel));
    const progress=u*u*(3-2*u);
    return {x:landing.x,y:wallY+(landing.y-wallY)*progress,progress};
  }
  // Launch positions use the same factory floor coordinates as the wall opening.
  const debrisDuration=2.25;
  function createDebris(){
    const pieces=[];
    for(let i=0;i<72;i++){
      const side=i%2?-1:1, lateral=Math.random(),rim=i%3!==0;
      const x=rim?side*(165+lateral*183):side*lateral*210;
      const z=rim?45+Math.random()*350:285+Math.random()*170;
      const vz=80+Math.random()*270,gravity=1120;
      const impact=(vz+Math.sqrt(vz*vz+2*gravity*z))/gravity;
      const rebound=(gravity*impact-vz)*(.13+Math.random()*.14);
      pieces.push({tile:i%12,x:600+x,y:wallY+2+Math.random()*14,z,vz,gravity,impact,rebound,
        vx:x*.64+(Math.random()-.5)*290,vy:55+Math.random()*245,
        start:i<12?0:Math.random()*.13,diameter:8+Math.random()**2*43,
        angle:Math.random()*6.28,spin:side*(3+Math.random()*10)});
    }
    return pieces;
  }
  function addBreachDebris(actors,boss,t){
    if(!boss || !debrisAtlas)return;
    const age=t-boss.start;
    if(age<0 || age>=debrisDuration)return;
    const pieces=boss.debris || (boss.debris=createDebris());
    for(const piece of pieces){
      const time=age-piece.start;if(time<0)continue;
      const after=Math.max(0,time-piece.impact),flight=Math.min(time,piece.impact);
      const bounce=Math.min(after,2*piece.rebound/piece.gravity);
      const z=after>0?bounce*(piece.rebound-.5*piece.gravity*bounce):piece.z+time*(piece.vz-.5*piece.gravity*time);
      const travel=flight+.28*(1-Math.exp(-after*4))/4;
      actors.push({piece,x:piece.x+piece.vx*travel,y:piece.y+piece.vy*travel,z:Math.max(0,z),
        rotation:piece.angle+piece.spin*(flight+.35*bounce),alpha:Math.min(1,(debrisDuration-age)/.42)});
    }
  }
  function drawDebris(ctx,camera,actor){
    const {piece,x,y,z,rotation,alpha}=actor,at=camera.project(x,y,z),foot=camera.project(x,y);
    const size=piece.diameter*at.scale,w=debrisAtlas.naturalWidth/4,h=debrisAtlas.naturalHeight/3;
    ctx.save();ctx.globalAlpha=.20*alpha/(1+z/160);ctx.fillStyle='#191a18';
    ctx.beginPath();ctx.ellipse(foot.x,foot.y,size*.35,size*.09,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=alpha;ctx.translate(at.x,at.y);ctx.rotate(rotation);
    const tumble=.46+.54*Math.abs(Math.cos(rotation*.71));
    ctx.drawImage(debrisAtlas,(piece.tile%4)*w,Math.floor(piece.tile/4)*h,w,h,-size/2,-size*tumble/2,size,size*tumble);
    ctx.restore();
  }
  function drawZombie(ctx,camera,actor,base,t){
    const {event:e,x,y,dir,fade}=actor,top=camera.tilt>=62.5;
    const species=kindOf(e),view=viewOf(e,camera.tilt),asset=art.get(species+'/'+view);
    if(!asset || fade<=0)return;
    const death=t-e.deadAt,arriving=e.boss && death<0 && actor.arrival!=null;
    const entering=arriving && actor.arrival<.60;
    const action=arriving && !entering?'roar':e.boss && death<0 && actor.slamAge!=null?'slam':null;
    const active=action?motions.get(action+'/'+view):asset;
    const {meta}=active;
    const hit=t-e.shotAt;
    const frame=entering?4+Math.floor(actor.arrival*9)%4:action?actionTile(arriving?actor.arrival:actor.slamAge,arriving?roarEnds:slamEnds):e.boss?(death>=0?16+Math.min(3,Math.floor(death/.22)):

      hit>=0 && hit<.18 && e.shotCount%5===1?12+Math.min(3,Math.floor(hit/.045)):
      4+Math.floor((t-e.start)*5)%4):death>=0?8+Math.min(3,Math.floor(death/.19)):
      t>=e.swingAt?4+Math.floor((t-e.swingAt)%.64/.16):
      Math.floor((t-e.start)*6+e.id)%4;
    const pose=meta.frames[frame],floor=camera.project(x,y);
    const feet=floor;
    const size=base*1.15*feet.scale*relativeSize(species);
    // Fit the shoulders through the opening, then unfold to full roar size in the room.
    const atWall=Math.min(1,208/(base*1.15*relativeSize(species)));
    const poseScale=arriving?atWall+(1.5-atWall)*entryPoint(actor.arrival).progress:
      e.boss && death>=0?deathScale[view][frame-16]:1;
    const cellHeight=poseScale*size*(top?1.00:Math.max(.57,Math.cos(camera.tilt*Math.PI/180)))/meta.standingHeight;
    const h=cellHeight*(action==='roar'?roarScale[view][1]:1);
    const w=cellHeight*meta.cellWidth/meta.cellHeight*(action==='roar'?roarScale[view][0]:1);
    const dx=-(top?pose.contact[0]:.5)*w,dy=-pose.contact[1]*h;
    const cleaned=e.boss && !action && frame>=12, image=cleaned?asset.clean:active.image, tile=cleaned?frame-12:frame;
    const mask=DefenseMechanic.silhouette(image,meta,tile);
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
    const shot=e.bursts?.[e.bursts.length-1];
    const fromLeft=shot && Math.cos(shot.angle-(top?angle:dir<0?Math.PI:0))>=0;
    if(shot && !action && death<0 && hit>=0 && hit<.11){
      // A short lean from the hips sells the impact without sliding the grounded feet.
      const recoil=Math.sin(Math.PI*hit/.11)*(1-hit/.11)*(fromLeft?1:-1);
      if(top)ctx.translate(recoil*size*.018,0);
      else ctx.transform(1,0,-recoil*.045,1,0,0);
    }
    ctx.drawImage(image,tile%4*meta.cellWidth,Math.floor(tile/4)*meta.cellHeight,
      meta.cellWidth,meta.cellHeight,dx,dy,w,h);
    if(shot && hit>=0 && hit<hitFlashSeconds){
      ctx.globalAlpha*=Math.pow(1-hit/hitFlashSeconds,1.4);
      ctx.drawImage(hitLight(image,meta,tile,pose,fromLeft),dx,dy,w,h);
    }
    ctx.restore();
    if(action==='slam'){
      const since=actor.slamAge-slamContact;
      if(since>=0 && since<.33){
        const a=top?angle:dir<0?Math.PI:0,distance=actor.gap*1.32*floor.scale;
        const px=floor.x+Math.cos(a)*distance,py=floor.y+(top?Math.sin(a)*distance:0);
        const radius=size*(.15+.60*since);
        ctx.save();ctx.globalAlpha=.56*(1-since/.33);
        ctx.drawImage(roof,256,256,256,256,px-radius,py-radius*.40,2*radius,radius*.75);ctx.restore();
      }
    }
    drawSprays(ctx,camera,actor,base,t);
    if(e.boss && death>=0)return;
    const sn=Math.sin(angle),cs=Math.cos(angle);
    const bottom=top?Math.max((dx+w*l)*sn,(dx+w*r)*sn)+Math.max((dy+h*u)*cs,(dy+h*b)*cs):dy+h*b;
    healthBar(ctx,feet.x,feet.y+bottom+3,Math.min(46,Math.max(18,size*.34)),e.hp,e.maxHp,t-e.hitAt,e.beforeHit,fade);
  }
  return {addBreachDebris,drawDebris,prepareAudio,audioLevel,stopAudio,playCue,syncBossFeedback,settleTime:lastDeathEmission+sprayDuration,prepare,wavePlan,positions,engage,healthBar,damage,drawZombie,drawPool};
})();
