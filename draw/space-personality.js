import {bossFlightFloor} from './space-ai-motion.js?v=62.0';
// Local game AI only. Profiles never read or write winner selection or health.
export const STYLES=['돌격형','신중형','보급형','기동형','집중형','유격형','모선헌터','균형형'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function personality(s){
 if(s.personality)return s.personality;
 let state=((s.id+1)*2654435761^Math.floor((s.seed||0)*104729))>>>0;
 const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};
 const type=Math.floor(random()*8),r=()=>random();
 return s.personality={type,label:STYLES[type],pace:.75+r()*.5,reaction:.08+r()*.18,commit:.55+r()*1.2,phase:r()*Math.PI*2,side:r()<.5?-1:1,
  range:[140,300,250,190,280,220,170,230][type]+r()*65,greed:[.8,.65,1.65,1,.7,1.2,.6,1][type],caution:[.3,1,.7,.6,.7,.5,.4,.65][type],orbit:[30,18,25,100,12,75,25,45][type],bossBias:type===6?2.5:type===0?1.5:.7+r()*.5};
}
// Assign once from the initial roster, independent of shuffled winner flags.
export function assignVanguard(ships){
 if(ships.every(s=>typeof s.aiVanguard==='boolean'))return;
 const ranked=ships.map(s=>({s,score:Math.sin((s.id+1)*127.1+(s.seed||0)*311.7)*43758.5453})).sort((a,b)=>(a.score-Math.floor(a.score))-(b.score-Math.floor(b.score))||a.s.id-b.s.id);
 const selected=new Set(ranked.slice(0,Math.round(ships.length*.2)).map(x=>x.s));for(const s of ships)s.aiVanguard=selected.has(s);
}
export function choosePilotTarget(s,p,targets,time,boss,forceBoss=false){
 const a=personality(s),bossTarget=targets.filter(h=>h.boss&&!h.entity?.dead).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
 if(bossTarget&&(['first','second'].includes(boss?.stage)||forceBoss)){s.aiTarget=bossTarget.key;s.aiTargetUntil=time+a.commit;return bossTarget;}
 const current=targets.find(h=>h.key===s.aiTarget);
 if(current&&time<(s.aiTargetUntil||0))return current;
 let best=null,cost=Infinity;
 for(const h of targets){const distance=Math.hypot(h.x-p.x,h.y-p.y);let score=distance+100;
  if(h.boss)score/=a.bossBias;
  if(a.type===4)score*=.5+.5*(h.entity?.hp??1)/(h.entity?.maxHp??1);
  if(a.type===5&&h.x<p.x)score*=.8;
  if(score<cost){cost=score;best=h;}}
 if(best){s.aiTarget=best.key;s.aiTargetUntil=time+a.commit;}return best;
}
export function pilotIntent(s,p,time,view,battle,cWeapon,fuel,targets=[]){
 const a=personality(s);if(s.aiStage===battle?.boss?.stage&&time<(s.aiThinkAt||0)&&s.aiGoal){return velocity(s,p,a);}
 s.aiStage=battle?.boss?.stage;s.aiThinkAt=time+a.reaction;const deficit=1-(s.hp??4)/(s.maxHp??4),candidates=[],finishing=battle?.boss?.stage==='second'&&battle.boss.finaleAt!==undefined,bossActive=targets.some(h=>h.boss);
 if(!finishing&&!bossActive&&s.hReady!==false&&!(s.cUntil>time))for(const d of cWeapon?.drops||[])candidates.push({kind:'C',id:d.id,x:d.x+d.vx*.22,y:d.y+d.vy*.22,value:230*a.greed});
 if(!finishing&&deficit>0&&(!bossActive||s.hp===1))for(const d of fuel?.drops||[])candidates.push({kind:'GAS',id:d.id,x:d.x+d.vx*.15,y:d.y+d.vy*.15,value:180+650*deficit*(.6+a.caution)});
 let best=null,bestScore=.3;
 for(const d of candidates){const score=d.value/(100+Math.hypot(d.x-p.x,d.y-p.y))*(s.aiGoal?.kind===d.kind&&s.aiGoal?.id===d.id?1.25:1);if(score>bestScore){bestScore=score;best=d;}}
 if(best){best.y=Math.max(best.y,battle?.boss?.stage==='approach'?view.top+(view.bottom-view.top)*(s.aiVanguard?1/3:.5):view.top+65,bossFlightFloor(battle?.boss,56));s.aiGoal=best;s.aiAction=best.kind==='GAS'?'회복':'보급';return velocity(s,p,a);}
 const h=choosePilotTarget(s,p,targets,time,battle?.boss,finishing||time>=(battle?.boss?.duration??Infinity));
 const width=view.right-view.left,height=view.bottom-view.top;
 const travel=h?Math.max(0,p.y-h.y)/1050:0,targetVX=h?.entity?.aim?.vx??(h?.entity?.previous?(h.x-h.entity.previous.x)/Math.max(.01,battle?.dt||.05):0);
 const x=h?(h.boss?clamp(p.x,h.x-h.r*.45,h.x+h.r*.45):h.x+clamp(targetVX,-500,500)*Math.min(.4,travel)):view.left+width*(.2+.6*((s.id*0.61803398875)%1))+Math.sin(time*.45+a.phase)*a.orbit;
 const y=h?h.y+Math.max(a.range,(h.r||0)+110)+(s.hp<=1?65:0):view.top+height*(.45+.3*((s.id*.41421356)%1));
 s.aiGoal={kind:'combat',x:clamp(x,view.left+65,view.right-65),y:Math.max(bossFlightFloor(battle?.boss,56),clamp(y,battle?.boss?.stage==='approach'?view.top+height*(s.aiVanguard?1/3:.5):view.top+65,view.bottom-65))};s.aiAction=h?'교전':'탐색';return velocity(s,p,a);
}
function velocity(s,p,a){const dx=s.aiGoal.x-p.x,dy=s.aiGoal.y-p.y,len=Math.hypot(dx,dy)||1,speed=Math.min(260*a.pace,len*1.4);return{vx:dx/len*speed,vy:dy/len*speed};}
