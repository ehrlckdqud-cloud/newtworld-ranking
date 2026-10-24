// Predict closest approach to visible ordinary attacks; never alter HP or winners.
export function ordinaryThreats(battle,time,dt){
 if(!battle||battle.stopped)return[];const out=[];
 for(const b of battle.hostileFire?.shots||[])if(!b.done)out.push({x:b.x,y:b.y,vx:Math.cos(b.angle)*b.speed,vy:Math.sin(b.angle)*b.speed,r:12,target:b.event.s.id});
 for(const b of battle.shaft?.shots||[])if(b.life>0)out.push({...b,r:12});
 for(const b of battle.enemyShots||[]){if(time<b.at||time>b.end)continue;const span=Math.max(.01,b.end-b.at),age=(time-b.at)/span;if(b.type==='ufo'){out.push({x:b.from.x,y:b.from.y,vx:0,vy:0,r:20,beam:true});continue;}out.push({x:b.from.x+(b.to.x-b.from.x)*age,y:b.from.y+(b.to.y-b.from.y)*age,vx:(b.to.x-b.from.x)/span,vy:(b.to.y-b.from.y)/span,r:10});}
 for(const e of battle.shaft?.entities||[])if(!e.dead&&e.type==='wall')out.push({x:e.x,y:e.y,vx:0,vy:e.previous?(e.y-e.previous.y)/Math.max(.001,dt):0,r:25*e.scale,halfW:150*e.scale});
 return out;
}
export function ordinaryEvasion(ship,p,threats,view,radius,strong){
 let best=null,urgency=-Infinity;const horizon=strong?.85:.5;
 for(const b of threats){if(b.target!==undefined&&b.target!==ship.id)continue;let dx=p.x-b.x,dy=p.y-b.y,tc=0,nx,ny,dist,safe=radius+b.r+24;
  if(b.beam){if(p.y<b.y)continue;nx=dx;ny=0;dist=Math.abs(dx);}
  else if(b.halfW){if(Math.abs(dx)>b.halfW+radius+24)continue;tc=Math.max(0,Math.min(horizon,dy/(b.vy||1)));nx=0;ny=dy-b.vy*tc;dist=Math.abs(ny);}
  else{const speed2=b.vx*b.vx+b.vy*b.vy;if(!speed2)continue;tc=(dx*b.vx+dy*b.vy)/speed2;if(tc<0||tc>horizon)continue;nx=dx-b.vx*tc;ny=dy-b.vy*tc;dist=Math.hypot(nx,ny);}
  if(dist>=safe)continue;let ex,ey;if(dist>2){ex=nx/dist;ey=ny/dist;}else{const len=Math.hypot(b.vx,b.vy)||1;ex=b.beam?1:-b.vy/len;ey=b.beam?0:b.vx/len;}
  const room=(x,y)=>Math.min(x>0?(view.right-radius-p.x)/x:x<0?(view.left+radius-p.x)/x:Infinity,y>0?(view.bottom-radius-p.y)/y:y<0?(view.top+radius-p.y)/y:Infinity);
  if(room(ex,ey)<safe&&room(-ex,-ey)>room(ex,ey)){ex=-ex;ey=-ey;}
  const score=(safe-dist)/safe+1/(.12+tc);if(score>urgency){urgency=score;const speed=strong?560:370;best={vx:ex*speed,vy:ey*speed};}
 }
 return best;
}
