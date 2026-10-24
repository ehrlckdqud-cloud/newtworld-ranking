const assert=require('node:assert/strict');
(async()=>{
 const {SpaceEnemyFire}=await import('../draw/space-enemy-fire.js');
 const fire=new SpaceEnemyFire({},{}),fleet={entities:new Map},battle={entities:[],view:()=>({left:0,top:0,right:800,bottom:600}),boss:{stage:'first',port:()=>({x:400,y:100}),escortFleet:fleet}},target={x:400,y:500};
 assert.equal(fire.source(battle,target,20),null,'Closed/empty mother must not invent an escort attack source');
 const e={id:'escort',x:400,y:200,visible:true,pose:{actor:{}},attached:true};fleet.entities.set(e.id,e);
 assert.equal(fire.source(battle,target,20),null,'Attached launch animation cannot shoot');
 e.attached=false;assert.equal(fire.source(battle,target,20).owner,e.id);
 for(const field of ['dead','exited']){e[field]=true;assert.equal(fire.source(battle,target,20),null);e[field]=false;}
 e.visible=false;assert.equal(fire.source(battle,target,20),null);
 fleet.entities.clear();battle.boss.stage='second';assert.equal(fire.source(battle,target,20),null);
 console.log('Visible detached escort sources only; no invisible boss-port fallback');
})().catch(e=>{console.error(e);process.exit(1)});
