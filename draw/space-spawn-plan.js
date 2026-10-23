// Population controls enemy appearances independently of actual damage events.
// At 50+ explorers the original event list is used without any changes.
export function populationSpawnPlan(events,ships,duration){
 if(ships.length>=50||!ships.length||!events.length)return events;
 const winners=ships.filter(s=>s.finalist),target=winners.length;if(!target)return events;
 const plan=[],losing=50-target;
 for(let i=0;i<losing;i++){
  const end=18+(duration-21)*(i+1)/losing;
  for(let j=0;j<4;j++)plan.push({s:ships[i%ships.length],at:7+(end-7)*(j+1)/4,type:(i+j)%6,side:(i+j)%3});
 }
 for(let i=0;i<target;i++)for(let j=0;j<3;j++)plan.push({s:winners[i],at:10+(duration*.65-10)*(j+1)/3+i*.13,type:(i+j+3)%6,side:(i+j)%3});
 plan.sort((a,b)=>a.at-b.at);plan.forEach((event,i)=>event.key='population-spawn-'+i);return plan;
}
