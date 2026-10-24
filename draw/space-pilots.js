import {personality,pilotIntent,assignVanguard} from './space-personality.js?v=62.0';
import {FIRST_ATTACK_AT} from './space-branding.js?v=62.0';
import {ordinaryThreats,ordinaryEvasion} from './space-evasion.js?v=62.0';
import {finalSelectionOpen,electricSurvivorReserve,survivorReserve} from './space-selection.js?v=62.0';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// Steering changes flight offsets only; shuffled finalists and survival timing stay authoritative.
export function steerPilots(time,dt,ships,position,bounds,cWeapon,boss,fuel,battle){
 assignVanguard(ships);
 const live=ships.filter(s=>!s.dead),view=bounds.view||{left:0,top:0,right:bounds.W,bottom:bounds.H},docking=boss?.ceasefire,threats=docking?[]:boss?.electricThreats?.(.38)||[],snapshots=new Map(live.map(s=>[s.id,position(s,time)]));
 const target=ships.filter(s=>s.finalist).length,duration=boss?.duration??120,finalOpen=finalSelectionOpen(time,duration,boss),reserve=finalOpen?0:electricSurvivorReserve(time,duration,boss,ships.length,target),protectedIds=new Set(live.filter(s=>!s.finalist).slice(-reserve||live.length).map(s=>s.id));
 const hazards=docking?[]:ordinaryThreats(battle,time,dt),radius=2*(ships.length>150?10:ships.length>100?13:ships.length>50?16:ships.length>25?21:28),normalReserve=survivorReserve(time,duration,boss,ships.length,target);
 const aiTargets=!docking&&time>=FIRST_ATTACK_AT?(battle?.hulls?.(time)||[]):[];
 const finalHull=boss?.stage==='second'?aiTargets.find(h=>h.boss):null;
 for(const s of live){s.electricProtected=!!s.finalist||(!finalOpen&&protectedIds.has(s.id));if(threats.some(ray=>!ray.warning))s.electricSeenAt??=time;else delete s.electricSeenAt;s.motionStart=position(s,time-dt);const p=snapshots.get(s.id);let vx=0,vy=0;delete s.chasingC;delete s.chasingFuel;delete s.evadingElectric;delete s.evadingAttack;s.combatProtected=!!s.finalist||(!finalOpen&&live.length<=target+normalReserve);
  const profile=personality(s);if(finalHull)s.aiThinkAt=0;if(!docking&&time>=FIRST_ATTACK_AT&&(!finalOpen||s.finalist)){
   const intent=pilotIntent(s,p,time,view,battle,cWeapon,fuel,aiTargets);vx=intent.vx;vy=intent.vy;s.aiFlying=true;
   if(s.aiGoal?.kind==='C')s.chasingC=s.aiGoal.id;if(s.aiGoal?.kind==='GAS')s.chasingFuel=s.aiGoal.id;
  }else{s.aiFlying=false;s.aiAction=docking?'귀환':'대기';}
  if(!docking&&(!finalOpen||s.finalist)){
   const critical=(s.hp??4)<=1;let dodge=null;
   if(finalHull||critical||time>=(s.nextThreatThink||0)){const tactics=finalHull?{left:finalHull.x-finalHull.r*.65,right:finalHull.x+finalHull.r*.65,returnVX:vx,returnVY:vy}:null;dodge=ordinaryEvasion(s,p,hazards,view,radius,critical&&s.combatProtected,tactics);s.nextThreatThink=time+.1+profile.reaction*.2;}
if(finalHull&&!dodge)s.dodgeUntil=0;
if(dodge){s.dodgeVX=dodge.vx;s.dodgeVY=dodge.vy;s.dodgeUntil=time+(finalHull?0:.22);}if(dodge||time<(s.dodgeUntil||0)){vx=s.dodgeVX||0;vy=s.dodgeVY||0;s.evadingAttack=true;s.aiAction="회피";delete s.chasingC;delete s.chasingFuel;}}
  for(const ray of threats){if(!s.electricProtected)continue;const dx=ray.toX-ray.x,dy=ray.toY-ray.y,l2=dx*dx+dy*dy,u=clamp(((p.x-ray.x)*dx+(p.y-ray.y)*dy)/(l2||1),0,1),nx=p.x-ray.x-u*dx,ny=p.y-ray.y-u*dy,d=Math.hypot(nx,ny),safe=ray.r+95;if(d<safe){const side=(s.id%2?1:-1),len=Math.sqrt(l2)||1,ex=d>2?nx/d:-dy/len*side,ey=d>2?ny/d:dx/len*side;vx=ex*(270+120*(1-d/safe));vy=ey*(270+120*(1-d/safe));s.evadingElectric=true;s.aiAction="전기 회피";}}
  // Inertia gives continuous flight when a pickup is taken or a warning ends.
  const a=1-Math.exp(-(s.evadingAttack?24:5+profile.pace*4)*dt);s.pilotVX=(s.pilotVX||0)+(vx-(s.pilotVX||0))*a;s.pilotVY=(s.pilotVY||0)+(vy-(s.pilotVY||0))*a;
  let ox=(s.pilotX||0)+s.pilotVX*dt,oy=(s.pilotY||0)+s.pilotVY*dt;
  if(!docking&&!s.aiFlying&&!s.chasingC&&!s.chasingFuel&&!s.evadingElectric&&!s.evadingAttack){ox*=Math.exp(-.9*dt);oy*=Math.exp(-.9*dt);}const baseX=p.x-(s.pilotX||0),baseY=p.y-(s.pilotY||0),pad=40;
  if(!docking&&!(s.gravityScale<.8)){ox=clamp(ox,view.left+pad-baseX,view.right-pad-baseX);oy=clamp(oy,view.top+pad-baseY,view.bottom-pad-baseY);}s.pilotX=ox;s.pilotY=oy;
 }
}
