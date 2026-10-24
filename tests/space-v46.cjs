const assert=require('node:assert/strict');
(async()=>{
 const {ordinaryEvasion}=await import('../draw/space-evasion.js');
 const {sweptHit}=await import('../draw/space-encounters.js');
 const old=(await import('./fixtures/space-evasion-v45.mjs')).ordinaryEvasion;
 function run(planner,scenario){
  const p={...scenario.p},ship={id:0},view={left:0,top:0,right:800,bottom:600},shots=scenario.shots.map(s=>({...s}));let hits=0,changes=0,last=null;
  for(let frame=0;frame<120;frame++){
   const dt=1/60,t=frame*dt,dodge=planner(ship,p,shots.filter(s=>!s.done),view,42,true);
   if(dodge){ship.dodgeVX=dodge.vx;ship.dodgeVY=dodge.vy;ship.until=t+.22;}
   const hold=planner===ordinaryEvasion&&t<ship.until,vx=dodge?.vx??(hold?ship.dodgeVX:0),vy=dodge?.vy??(hold?ship.dodgeVY:0);
   if(last&&vx*last.vx+vy*last.vy<0)changes++;last={vx,vy};
   const a=1-Math.exp(-(planner===ordinaryEvasion?24:18)*dt);ship.pilotVX=(ship.pilotVX||0)+(vx-(ship.pilotVX||0))*a;ship.pilotVY=(ship.pilotVY||0)+(vy-(ship.pilotVY||0))*a;
   const next={x:Math.max(54,Math.min(746,p.x+ship.pilotVX*dt)),y:Math.max(54,Math.min(546,p.y+ship.pilotVY*dt))};
   for(const b of shots){if(b.done)continue;const q={x:b.x+b.vx*dt,y:b.y+b.vy*dt};if(sweptHit({x:b.x-p.x,y:b.y-p.y},{x:q.x-next.x,y:q.y-next.y},{x:0,y:0,r:51})!==null){hits++;b.done=true;}Object.assign(b,q);}
   Object.assign(p,next);
  }
  return{hits,changes};
 }
 const scenarios=[];
 for(const x of [60,140,400,660,740])for(const speed of [270,500,720])for(const offset of [-90,0,90]){
  const p={x,y:300},shots=[{x:x+offset,y:0,vx:-offset/300*speed,vy:speed,r:12},{x:0,y:300+offset,vx:speed,vy:-offset/Math.max(1,x)*speed,r:12},{x:800,y:300-offset,vx:-speed,vy:offset/Math.max(1,800-x)*speed,r:12}];scenarios.push({p,shots});
 }
 let before=0,after=0;for(const s of scenarios){before+=run(old,s).hits;after+=run(ordinaryEvasion,s).hits;}
 assert(after<before*.7,`Crossfire contacts must fall meaningfully: ${before} -> ${after}`);
 const edge=ordinaryEvasion({id:0},{x:60,y:300},[{x:60,y:0,vx:0,vy:500,r:12}],{left:0,top:0,right:800,bottom:600},42,true);assert(edge.vx>0,'Escape toward open viewport at left edge');
 console.log(JSON.stringify({scenarios:scenarios.length,v45Contacts:before,v46Contacts:after,edgeEscape:edge}));
})().catch(e=>{console.error(e);process.exit(1)});
