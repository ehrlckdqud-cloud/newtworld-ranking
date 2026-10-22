/* Space Escape host rules. Recovered ROM clips supply art/audio, never participant selection. */
export const WORLD={width:640,height:900,launchSeconds:6.2};
export const TYPES={small:{hp:2,r:17,speed:95,scale:1.2},large:{hp:10,r:51,speed:58,scale:.62},ufo:{hp:4,r:24,speed:66,scale:1.15,fire:1.7},ring:{hp:2,r:18,speed:76,scale:1.2,fire:1.8},alien:{hp:5,r:23,speed:59,scale:1.2,fire:2.1}};
export function random(seed){let a=seed>>>0;return()=>{a+=0x6d2b79f5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
export function parseNames(text){return String(text).split(/[\n,;]+/).map(s=>s.normalize('NFC').trim()).filter(Boolean).map(s=>s.slice(0,70));}
export function segmentHits(ax,ay,bx,by,cx,cy,r){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((cx-ax)*dx+(cy-ay)*dy)/l)):0;return Math.hypot(ax+t*dx-cx,ay+t*dy-cy)<=r;}
export class SpaceGame{
 constructor(names,winnerCount,{seed=1}={}){
  if(!Array.isArray(names)||names.length<1||names.length>300||names.some(n=>typeof n!=='string'||!n.trim()))throw Error('참가자는 1~300명으로 입력해주세요.');
  if(!Number.isInteger(winnerCount)||winnerCount<1||winnerCount>names.length)throw Error('당첨 인원은 참가자 수 이내로 정해주세요.');
  this.seed=seed>>>0;this.rng=random(seed);this.time=0;this.phase='launch';this.phaseAt=0;this.target=winnerCount;this.serial=1;this.events=[];this.enemies=[];this.bullets=[];this.effects=[];this.hazards=[];this.eliminations=[];this.winners=[];this.shotsFired=0;this.nextWave=7;this.nextHazard=11;
  const slots=Array.from({length:names.length},(_,i)=>i);for(let i=slots.length-1;i>0;i--){const j=Math.floor(this.rng()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
  this.ships=names.map((name,i)=>({id:i+1,name,hp:3,alive:true,x:50+this.rng()*540,y:790,baseX:48+((slots[i]+.5)/names.length)*544,baseY:700+this.rng()*115,phase:this.rng()*Math.PI*2,drift:25+this.rng()*65,rate:.5+this.rng()*.35,shotAt:6.2+this.rng()*.3,invulnerableUntil:0,score:0}));
 }
 get alive(){return this.ships.filter(s=>s.alive);}
 emit(kind,data={}){this.events.push({id:this.serial++,at:this.time,kind,...data});}
 spawn(type,x=50+this.rng()*540,y=-70,extra={}){const t=TYPES[type];if(!t)throw Error('알 수 없는 개체');const e={id:this.serial++,type,x,y,baseX:x,hp:t.hp,maxHp:t.hp,age:0,phase:this.rng()*Math.PI*2,shotAt:.8+this.rng(),pendingShot:null,hitAt:-99,dead:false,...extra};this.enemies.push(e);return e;}
 hurtEnemy(id,damage=1,owner=null){const e=this.enemies.find(e=>e.id===id&&!e.dead);if(!e||this.phase!=='combat')return false;e.hp=Math.max(0,e.hp-damage);e.hitAt=this.time;if(e.hp===0){e.dead=true;this.effects.push({type:e.type,x:e.x,y:e.y,age:0});this.emit('clip',{clip:e.type+'-death'});if(owner){const s=this.ships.find(s=>s.id===owner);if(s)s.score++;}if(e.type==='large'){for(const dir of [-1,1])this.spawn('small',Math.max(25,Math.min(615,e.x+dir*37)),e.y,{vx:dir*30});}}return true;}
 damageShip(ship,damage=1){if(this.phase!=='combat'||!ship.alive||this.alive.length<=this.target||this.time<ship.invulnerableUntil)return false;ship.hp=Math.max(0,ship.hp-damage);ship.invulnerableUntil=this.time+.65;if(ship.hp===0){ship.alive=false;this.eliminations.push({id:ship.id,name:ship.name,at:this.time});this.emit('eliminated',{shipId:ship.id});if(this.alive.length===this.target)this.protect();}return true;}
 protect(){if(this.phase!=='combat')return;this.phase='shield';this.phaseAt=this.time;this.winners=this.alive.map(s=>({id:s.id,name:s.name,score:s.score}));this.bullets=[];this.hazards=[];this.enemies=[];this.emit('protected',{winners:this.winners});}
 fire(e){if(this.phase!=='combat'||e.dead)return;const live=this.alive;if(!live.length)return;const target=live[Math.floor(this.rng()*live.length)],dx=target.x-e.x,dy=target.y-e.y,length=Math.hypot(dx,dy)||1,speed=e.type==='alien'?220:e.type==='ufo'?250:180;this.bullets.push({id:this.serial++,enemy:true,type:e.type,x:e.x,y:e.y+8,px:e.x,py:e.y+8,vx:dx/length*speed,vy:dy/length*speed,age:0,life:5,r:e.type==='ufo'?5:6});}
 wave(){const types=['small','small','large','ufo','ring','alien'];const type=types[Math.floor(this.rng()*types.length)];if(type==='ring'){const group=this.serial++;for(let i=0;i<5;i++)this.spawn(type,66+i*127,-40-i*7,{group,member:i+1});}else this.spawn(type);}
 hazard(){const live=this.alive;if(!live.length)return;const target=live[Math.floor(this.rng()*live.length)],heat=Math.max(0,this.time-35)/50;
  if(this.rng()<.72){this.hazards.push({id:this.serial++,type:'laser',x:Math.max(40,Math.min(600,target.x)),age:0,warning:.9,width:30+Math.min(100,heat*30),life:1.5});}
  else this.hazards.push({id:this.serial++,type:'blackhole',x:100+this.rng()*440,y:450+this.rng()*280,age:0,r:28+Math.min(32,heat*15),life:4.5});
 }
 step(dt){if(!Number.isFinite(dt)||dt<=0||dt>.1)throw Error('고정 시간 간격 오류');if(this.phase==='finished')return;this.time+=dt;
  for(const s of this.ships){if(!s.alive)continue;
   if(this.phase==='launch'){const f=Math.min(1,this.time/WORLD.launchSeconds),ease=1-(1-f)**3;s.x+=(s.baseX-s.x)*Math.min(1,dt*3);s.y=990+(s.baseY-990)*ease;}
   else if(this.phase==='combat'){s.x=Math.max(23,Math.min(617,s.baseX+Math.sin(this.time*s.rate+s.phase)*s.drift));s.y=s.baseY+Math.sin(this.time*.7+s.phase)*28;}
   else if(this.phase==='dock'||this.phase==='shield'){const i=this.winners.findIndex(w=>w.id===s.id),x=320+(i-(this.target-1)/2)*Math.min(80,500/this.target),f=Math.min(1,(this.time-this.phaseAt)/(this.phase==='dock'?3.8:1));s.x+=(x-s.x)*Math.min(1,dt*2);if(this.phase==='dock')s.y+=(155-s.y)*Math.min(1,dt*(.4+f));}
  }
  if(this.phase==='launch'&&this.time>=WORLD.launchSeconds){this.phase='combat';this.phaseAt=this.time;this.emit('combat');if(this.alive.length===this.target)this.protect();}
  if(this.phase==='shield'&&this.time-this.phaseAt>=1.3){this.phase='dock';this.phaseAt=this.time;this.emit('docking');}
  if(this.phase==='dock'&&this.time-this.phaseAt>=5.5){this.phase='finished';this.emit('finished',{winners:this.winners});return;}
  if(this.phase==='combat'){
   if(this.time>=this.nextWave){this.wave();this.nextWave=this.time+Math.max(.55,1.7-this.time/100);}
   if(this.time>=this.nextHazard){this.hazard();this.nextHazard=this.time+Math.max(.6,2.3-this.time/80);}
   for(const s of this.alive){if(this.time<s.shotAt)continue;s.shotAt=this.time+.44;let target=null,distance=Infinity;for(const e of this.enemies)if(!e.dead&&e.y<s.y-20){const d=Math.hypot(e.x-s.x,e.y-s.y);if(d<distance){distance=d;target=e;}}const dx=target?target.x-s.x:0,dy=target?target.y-s.y:-1,len=Math.hypot(dx,dy)||1;this.bullets.push({id:this.serial++,enemy:false,owner:s.id,x:s.x,y:s.y-16,px:s.x,py:s.y-16,vx:dx/len*520,vy:dy/len*520,age:0,life:2,r:3});this.shotsFired++;}
   for(const e of this.enemies){if(e.dead)continue;e.age+=dt;e.y+=TYPES[e.type].speed*dt;e.x=e.vx?e.x+e.vx*dt:e.baseX+Math.sin(e.age*1.7+e.phase)*(e.type==='small'?8:20);if(e.pendingShot!==null&&e.age>=e.pendingShot){this.fire(e);e.pendingShot=null;}
    if(TYPES[e.type].fire&&e.age>=e.shotAt){e.shotAt=e.age+TYPES[e.type].fire;if(e.type==='alien'){this.emit('sound',{sound:'ym-10d1'});e.pendingShot=e.age+10/(6000000/101376);}else{if(e.type==='ufo')this.emit('sound',{sound:'ym-11d4'});this.fire(e);}}
   }
   for(const b of this.bullets){b.px=b.x;b.py=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.age+=dt;if(b.enemy){const victims=this.alive.slice();for(let i=victims.length-1;i>0;i--){const j=Math.floor(this.rng()*(i+1));[victims[i],victims[j]]=[victims[j],victims[i]];}for(const s of victims)if(segmentHits(b.px,b.py,b.x,b.y,s.x,s.y,12+b.r)&&this.damageShip(s)){b.life=0;break;}}
    else for(const e of this.enemies)if(!e.dead&&segmentHits(b.px,b.py,b.x,b.y,e.x,e.y,TYPES[e.type].r)){this.hurtEnemy(e.id,1,b.owner);b.life=0;break;}
   }
   const victims=this.alive.slice();for(let i=victims.length-1;i>0;i--){const j=Math.floor(this.rng()*(i+1));[victims[i],victims[j]]=[victims[j],victims[i]];}
   for(const s of victims){if(this.phase!=='combat')break;for(const e of this.enemies)if(!e.dead&&Math.hypot(e.x-s.x,e.y-s.y)<TYPES[e.type].r+10){this.damageShip(s,e.type==='large'?3:2);break;}for(const h of this.hazards){if(h.type==='laser'&&h.age>=h.warning&&Math.abs(s.x-h.x)<h.width/2+8)this.damageShip(s,3);if(h.type==='blackhole'){const d=Math.hypot(s.x-h.x,s.y-h.y);if(d<h.r+10)this.damageShip(s,3);else if(d<160){s.baseX+=((h.x-s.x)/Math.max(d,1))*dt*18;s.baseX=Math.max(24,Math.min(616,s.baseX));}}}}
  }
  for(const h of this.hazards)h.age+=dt;for(const f of this.effects)f.age+=dt;this.hazards=this.hazards.filter(h=>h.age<h.life);this.effects=this.effects.filter(f=>f.age<3.1);this.enemies=this.enemies.filter(e=>!e.dead&&e.y<1010&&e.x>-100&&e.x<740);this.bullets=this.bullets.filter(b=>b.age<b.life&&b.y>-80&&b.y<1020&&b.x>-80&&b.x<720);
 }
 drainEvents(){return this.events.splice(0);}
}
