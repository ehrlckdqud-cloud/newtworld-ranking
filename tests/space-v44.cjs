const assert=require('node:assert/strict');
(async()=>{
 const {steerPilots}=await import('../draw/space-pilots.js');
 const {SpaceBoss}=await import('../draw/space-boss.js');
 const ships=Array.from({length:13},(_,id)=>({id,finalist:id>=10,hReady:false}));
 let warning=true;const boss={duration:120,stage:'second',hp:20000,maxHp:20000,electricThreats:()=>[{x:100,y:0,toX:100,toY:500,r:20,warning}]};
 const step=t=>steerPilots(t,.01,ships,()=>({x:110,y:250}),{W:800,H:600},{drops:[]},boss,{drops:[]});
 step(80);const protectedShips=ships.filter(s=>s.electricProtected),vulnerable=ships.filter(s=>!s.electricProtected);assert.equal(protectedShips.length,4);assert.equal(vulnerable.length,9);assert(protectedShips.every(s=>s.evadingElectric));
 warning=false;step(81);step(82);assert(vulnerable.every(s=>!s.evadingElectric),'Unprotected ships do not regain electric evasion after a delay');
 const aim={seconds:0,stageAt:0,media:{bossData:{clips:{second:{frames:Array(605),hz:60}}}},transform:()=>({x:0,y:0,scale:1}),aimTargets:[{x:200,y:200,finalist:true,electricProtected:true},{x:100,y:200,finalist:false,electricProtected:false}]};
 assert(SpaceBoss.prototype.electricDirection.call(aim)<4,'Aim chooses the exposed left craft, not the protected right finalist');
 boss.hp=1;boss.finaleAt=100;step(116);assert(ships.filter(s=>!s.finalist).every(s=>!s.electricProtected&&!s.evadingElectric));assert(ships.filter(s=>s.finalist).every(s=>s.electricProtected));
 console.log('Mixed reserve, exposed nonfinalists, vulnerable targeting, and final-window release passed');
})().catch(e=>{console.error(e);process.exit(1)});
