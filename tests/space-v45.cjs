const assert=require('node:assert/strict');
(async()=>{
 const {steerPilots}=await import('../draw/space-pilots.js'),{SpaceEnemyFire}=await import('../draw/space-enemy-fire.js'),{sweptHit}=await import('../draw/space-encounters.js');
 function run({avoid=true,final=false}={}){
 const ship={id:0,hp:1,hReady:false,finalist:!final},winner={id:1,hp:4,hReady:false,finalist:true},ships=final?[ship,winner]:[ship],boss={duration:120,stage:'second',hp:final?1:100,maxHp:100,finaleAt:final?100:undefined,electricThreats:()=>[]},fire=new SpaceEnemyFire({}, {add(){}}),event={s:ship,lethal:true,inFlight:true};
 fire.shots.push({id:1,event,x:400,y:0,at:116,speed:500,angle:Math.PI/2,source:{type:'alien',owner:'test'}});
 const battle={hostileFire:fire,boss,shaft:{shots:[],entities:[]},enemyShots:[],sweptContact:sweptHit};const pos=s=>s===ship?{x:400+(s.pilotX||0),y:300+(s.pilotY||0)}:{x:700,y:300};let hits=0,maxOffset=0;
 for(let i=0;i<200;i++){const t=116+i*.01;if(avoid)steerPilots(t,.01,ships,pos,{W:800,H:600},{drops:[]},boss,{drops:[]},battle);fire.step(t,.01,[],ships,pos,56,battle,()=>hits++,()=>true);maxOffset=Math.max(maxOffset,Math.abs(ship.pilotX||0));}
 return {hits,maxOffset};}
 assert.equal(run({avoid:false}).hits,1,'Stationary red craft is hit');const escaped=run();assert.equal(escaped.hits,0,'Red protected craft visibly dodges the real incoming shot');assert(escaped.maxOffset>50,'Evasion changes actual position');assert.equal(run({final:true}).hits,1,'Final nonwinner no longer dodges the finishing attack');
 console.log(JSON.stringify({ordinaryProjectileEvasion:escaped,finalWindowStillAllowsContact:true}));
})().catch(e=>{console.error(e);process.exit(1)});
