import {finalSelectionOpen,survivorReserve} from './space-selection.js?v=42.0';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// Steering changes flight offsets only; shuffled finalists and survival timing stay authoritative.
export function steerPilots(time,dt,ships,position,bounds,cWeapon,boss,fuel){
 const live=ships.filter(s=>!s.dead),view=bounds.view||{left:0,top:0,right:bounds.W,bottom:bounds.H},docking=boss?.ceasefire,threats=docking?[]:boss?.electricThreats?.(.38)||[],snapshots=new Map(live.map(s=>[s.id,position(s,time)]));
 const target=ships.filter(s=>s.finalist).length,duration=boss?.duration??120,finalOpen=finalSelectionOpen(time,duration,boss),reserve=finalOpen?0:survivorReserve(time,duration,boss,ships.length,target),protectedIds=new Set(live.filter(s=>!s.finalist).slice(-reserve||live.length).map(s=>s.id));
 for(const s of live){s.electricProtected=!!s.finalist||(!finalOpen&&protectedIds.has(s.id));if(threats.some(ray=>!ray.warning))s.electricSeenAt??=time;else delete s.electricSeenAt;const p=snapshots.get(s.id);let vx=0,vy=0;delete s.chasingC;delete s.chasingFuel;delete s.evadingElectric;
  if(!docking&&s.hReady!==false&&!(s.cUntil>time)&&cWeapon.drops.length){let best=null,score=Infinity;for(const d of cWeapon.drops){const distance=Math.hypot(d.x-p.x,d.y-p.y),cost=distance*(1+.12*Math.sin((s.seed||s.id||0)*1.7+d.id));if(cost<score){best=d;score=cost;}}if(best){const lead=Math.min(.55,score/450),dx=best.x+best.vx*lead-p.x,dy=best.y+best.vy*lead-p.y,len=Math.hypot(dx,dy)||1,speed=Math.min(320,150+len*1.7);vx=dx/len*speed;vy=dy/len*speed;s.chasingC=best.id;}}
  if(!docking&&(s.hp??4)<(s.maxHp??4)&&fuel?.drops.length){let best=null,distance=Infinity;for(const d of fuel.drops){const n=Math.hypot(d.x-p.x,d.y-p.y);if(n<distance){distance=n;best=d;}}if(best){const dx=best.x-p.x,dy=best.y-p.y,len=Math.hypot(dx,dy)||1,speed=Math.min(320,150+len*1.7);vx=dx/len*speed;vy=dy/len*speed;s.chasingFuel=best.id;delete s.chasingC;}}
  for(const ray of threats){if(!s.electricProtected&&(finalOpen||ray.warning||time-(s.electricSeenAt??time)<.18+((s.id||0)%7)*.05))continue;const dx=ray.toX-ray.x,dy=ray.toY-ray.y,l2=dx*dx+dy*dy,u=clamp(((p.x-ray.x)*dx+(p.y-ray.y)*dy)/(l2||1),0,1),nx=p.x-ray.x-u*dx,ny=p.y-ray.y-u*dy,d=Math.hypot(nx,ny),safe=ray.r+95;if(d<safe){const side=(s.id%2?1:-1),len=Math.sqrt(l2)||1,ex=d>2?nx/d:-dy/len*side,ey=d>2?ny/d:dx/len*side;vx=ex*(270+120*(1-d/safe));vy=ey*(270+120*(1-d/safe));s.evadingElectric=true;}}
  // Inertia gives continuous flight when a pickup is taken or a warning ends.
  const a=1-Math.exp(-8*dt);s.pilotVX=(s.pilotVX||0)+(vx-(s.pilotVX||0))*a;s.pilotVY=(s.pilotVY||0)+(vy-(s.pilotVY||0))*a;
  let ox=(s.pilotX||0)+s.pilotVX*dt,oy=(s.pilotY||0)+s.pilotVY*dt;
  if(!s.chasingC&&!s.chasingFuel&&!s.evadingElectric){ox*=Math.exp(-.9*dt);oy*=Math.exp(-.9*dt);}const baseX=p.x-(s.pilotX||0),baseY=p.y-(s.pilotY||0),pad=40;
  if(!docking&&!(s.gravityScale<.8)){ox=clamp(ox,view.left+pad-baseX,view.right-pad-baseX);oy=clamp(oy,view.top+pad-baseY,view.bottom-pad-baseY);}s.pilotX=ox;s.pilotY=oy;
 }
}
