// Shared online/offline motion guard; never changes damage or selection.
export function bossFlightFloor(boss,radius){
 if(!boss||!['fusion','second'].includes(boss.stage)||!boss.bounds)return -Infinity;
 const tr=boss.transform();return tr.y+112*tr.scale+radius*1.8;
}
export function firstBossBody(boss,radius){
 if(boss?.stage!=='first'||!boss.bounds)return null;
 const hull=boss.hulls().find(h=>h.boss);if(!hull)return null;
 // The weapon hit circle is deliberately smaller than the visible hull.
 return {x:hull.x,y:hull.y,r:hull.r/.85+radius*1.8};
}
export function constrainPilotMotion(ships,position,time,dt,boss,radius){
 if(boss?.ceasefire)return;
 const bodies=boss?.stage==='first'?boss.hulls().filter(h=>h.boss).map(h=>({x:h.x,y:h.y,r:h.r/.85+radius*1.8})):[],finalFloor=bossFlightFloor(boss,radius),view=boss?.bounds?.view||{top:0,bottom:boss?.bounds?.H||600};
 for(const s of ships){if(s.dead)continue;const p=position(s,time),from=s.motionStart||p,floor=boss?.stage==='approach'?view.top+(view.bottom-view.top)*(s.aiVanguard?1/3:.5):finalFloor;
  const dx=p.x-from.x,dy=p.y-from.y,d=Math.hypot(dx,dy),limit=(s.evadingAttack||s.evadingElectric?480:330)*dt;
  let x=p.x,y=p.y;if(d>limit){x=from.x+dx/d*limit;y=from.y+dy/d*limit;}
  // The machinery is solid while fighting. Docking explicitly releases this guard.
  y=Math.max(y,boss?.stage==='second'?floor:Math.min(floor,from.y+limit));const room=Math.sqrt(Math.max(0,limit*limit-(y-from.y)**2));x=Math.max(from.x-room,Math.min(from.x+room,x));for(const body of bodies){const bx=x-body.x,by=y-body.y,distance=Math.hypot(bx,by);if(distance<body.r){const nx=distance>.001?bx/distance:0,ny=distance>.001?by/distance:1;x=body.x+nx*(body.r+1);y=body.y+ny*(body.r+1);}}
  if(bodies.some(b=>Math.hypot(x-b.x,y-b.y)<b.r)){for(const b of bodies){const dx=x-b.x;if(Math.abs(dx)<b.r)y=Math.max(y,b.y+Math.sqrt(b.r*b.r-dx*dx)+1);}}
  s.pilotX=(s.pilotX||0)+x-p.x;s.pilotY=(s.pilotY||0)+y-p.y;
 }
}
