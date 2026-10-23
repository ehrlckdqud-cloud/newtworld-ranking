const assert=require('node:assert/strict');
(async()=>{
 const {populationSpawnPlan}=await import('../draw/space-spawn-plan.js'),{scaledEnemyHp}=await import('../draw/space-enemy-stats.js');
 const generate=(n,target,duration)=>{const ships=Array.from({length:n},(_,id)=>({id,finalist:id>=n-target})),events=[];const losing=n-target;
 for(let i=0;i<losing;i++){const end=18+(duration-21)*(i+1)/losing;for(let j=0;j<4;j++)events.push({s:ships[i],at:7+(end-7)*(j+1)/4,type:(i+j)%6,side:(i+j)%3,lethal:j===3});}
 for(let i=0;i<target;i++)for(let j=0;j<3;j++)events.push({s:ships[n-target+i],at:10+(duration*.65-10)*(j+1)/3+i*.13,type:(i+j+3)%6,side:(i+j)%3,lethal:false});events.sort((a,b)=>a.at-b.at);return {ships,events};};
 const shape=events=>events.map(({at,type,side})=>({at,type,side}));
 for(const duration of [90,120,180])for(const target of [1,3,10])for(const n of [2,10,20,49,50,100,300]){if(target>n)continue;const {ships,events}=generate(n,target,duration),before=JSON.stringify(events),plan=populationSpawnPlan(events,ships,duration);assert.equal(JSON.stringify(events),before,'real damage/elimination schedule is untouched');if(n<50){const baseline=generate(50,target,duration);assert.deepEqual(shape(plan),shape(baseline.events));assert(plan.every(e=>ships.includes(e.s)));assert.equal(new Set(plan.map(e=>e.key)).size,plan.length);}else assert.equal(plan,events,'50+ original schedule identity preserved');}
 assert.equal(scaledEnemyHp(270,10),54);assert.equal(scaledEnemyHp(270,50),270);assert.equal(scaledEnemyHp(270,100),540);
 console.log('v35: under-50 spawn schedules match the 50-person baseline; 50+ unchanged; real HP and damage schedules preserved across durations/winner counts');
})().catch(e=>{console.error(e);process.exitCode=1});
