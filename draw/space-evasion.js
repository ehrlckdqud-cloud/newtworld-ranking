// Predict closest approach to visible ordinary attacks; never alter HP or winners.
export function ordinaryThreats(battle,time,dt){
 if(!battle||battle.stopped)return[];const out=[];
 for(const b of battle.hostileFire?.shots||[])if(!b.done)out.push({x:b.x,y:b.y,vx:Math.cos(b.angle)*b.speed,vy:Math.sin(b.angle)*b.speed,r:12,target:b.event.s.id});
 for(const b of battle.shaft?.shots||[])if(b.life>0)out.push({...b,r:12});
 for(const b of battle.enemyShots||[]){if(time<b.at||time>b.end)continue;const span=Math.max(.01,b.end-b.at),age=(time-b.at)/span;if(b.type==='ufo'){out.push({x:b.from.x,y:b.from.y,vx:0,vy:0,r:20,beam:true});continue;}out.push({x:b.from.x+(b.to.x-b.from.x)*age,y:b.from.y+(b.to.y-b.from.y)*age,vx:(b.to.x-b.from.x)/span,vy:(b.to.y-b.from.y)/span,r:10});}
 for(const e of battle.shaft?.entities||[])if(!e.dead&&e.type==='wall')out.push({x:e.x,y:e.y,vx:0,vy:e.previous?(e.y-e.previous.y)/Math.max(.001,dt):0,r:25*e.scale,halfW:150*e.scale});
 return out;
}
// Score complete routes, rather than dodging one projectile into another.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const directions=Array.from({length:16},(_,i)=>({x:Math.cos(i*Math.PI/8),y:Math.sin(i*Math.PI/8)}));
export function ordinaryEvasion(ship,p,threats,view,radius,strong){
 const horizon=strong?1.15:.9,speed=strong?600:480,pad=Math.max(40,radius+12),margin=28;
 const relevant=threats.filter(b=>(b.target===undefined||b.target===ship.id)&&
  (b.beam||Math.hypot(p.x-b.x,p.y-b.y)<(Math.hypot(b.vx,b.vy)+speed)*horizon+radius+b.r+(b.halfW||0)));
 if(!relevant.length)return null;
 // Include inertia and continuous segment contacts between prediction samples.
 function risk(vx,vy){
  let sum=0,worst=0,x=p.x,y=p.y,pvx=ship.pilotVX||0,pvy=ship.pilotVY||0;
  const step=horizon/8,a=1-Math.exp(-24*step);
  for(let i=1;i<=8;i++){
   pvx+=(vx-pvx)*a;pvy+=(vy-pvy)*a;
   const nx=clamp(x+pvx*step,view.left+pad,view.right-pad),ny=clamp(y+pvy*step,view.top+pad,view.bottom-pad),t=(i-1)*step;
   for(const b of relevant){
    const dx=x-b.x-b.vx*t,dy=y-b.y-b.vy*t,rx=nx-x-b.vx*step,ry=ny-y-b.vy*step;
    let d;
    if(b.beam){if(Math.max(y,ny)<b.y)continue;d=dx*(dx+rx)<=0?0:Math.min(Math.abs(dx),Math.abs(dx+rx));}
    else if(b.halfW){
     // Swept rectangle contact: horizontal walls cannot be treated as points.
     let lo=0,hi=1;const extX=b.halfW+radius+margin,extY=b.r+radius+margin;
     for(const [origin,delta,extent] of [[dx,rx,extX],[dy,ry,extY]]){
      if(Math.abs(delta)<1e-8){if(Math.abs(origin)>extent){hi=-1;break;}}
      else{const u=(-extent-origin)/delta,v=(extent-origin)/delta;lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v));}
     }
     if(lo>hi)continue;d=0;
    }else{const l2=rx*rx+ry*ry,u=l2?clamp(-(dx*rx+dy*ry)/l2,0,1):0;d=Math.hypot(dx+rx*u,dy+ry*u);}
    const safe=radius+b.r+margin,overlap=Math.max(0,1-d/safe),cost=overlap*overlap/(.2+i*step);
    worst=Math.max(worst,cost);sum+=cost;
   }
   x=nx;y=ny;
  }
  return worst*10+sum;
 }
 const stopped=risk(0,0),current=risk(ship.pilotVX||0,ship.pilotVY||0);
 if(stopped<.001&&current<.001)return null;
 let best=null,bestScore=Infinity;
 for(const dir of [{x:0,y:0},...directions]){
  const vx=dir.x*speed,vy=dir.y*speed,travel=.35;
  const room=Math.hypot(clamp(p.x+vx*travel,view.left+pad,view.right-pad)-p.x,clamp(p.y+vy*travel,view.top+pad,view.bottom-pad)-p.y);
  const blocked=dir.x||dir.y?Math.max(0,1-room/(speed*travel))*.8:0;
  const continuity=ship.dodgeVX===undefined?0:(1-(vx*ship.dodgeVX+vy*ship.dodgeVY)/(speed*speed))*.025;
  const score=risk(vx,vy)+blocked+continuity;
  if(score<bestScore){bestScore=score;best={vx,vy};}
 }
 return best;
}
