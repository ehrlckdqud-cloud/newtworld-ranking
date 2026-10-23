const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {NativeEncounters}=await import('../draw/space-encounters.js'),{NativeMedia}=await import('../draw/space-media.js');
 const read=n=>JSON.parse(fs.readFileSync('draw/space-assets/'+n)),media={data:read('assets.json'),shaftData:read('shaft-enemies-native.json')},cues=[],audio={add:e=>cues.push(e)},ship={id:1,hReady:true,seed:0},pos=()=>({x:400,y:500}),bounds={W:800,H:610},battle=new NativeEncounters(media,audio,[{key:'early-ring',type:3,at:5,side:2,s:ship}]);
 for(let t=0;t<9.5;t+=.05){battle.step(t,.05,[ship],pos,bounds);assert.equal(battle.entities.length,0);assert.equal(battle.shaft.entities.length,0);assert.equal(battle.firstShotAt,null);}
 battle.step(9.5,.06,[ship],pos,bounds);assert.equal(battle.firstShotAt,9.5);assert(battle.bullets.length);assert.equal(battle.entities.length,0);assert.equal(battle.shaft.entities.length,0);
 battle.step(9.55,.05,[ship],pos,bounds);assert.equal(battle.entities.length,10,'Deferred early wave is retained');assert.equal(battle.shaft.wallCount,1);
 battle.destroyRemaining(20);assert(battle.entities.every(e=>e.dead&&e.death===20));assert(battle.shaft.entities.every(e=>e.dead&&e.death===20));assert.equal(battle.enemyShots.length,0);assert.equal(battle.shaft.shots.length,0);const n=cues.length;battle.destroyRemaining(21);assert.equal(cues.length,n,'Explosion cues happen once');assert(cues.some(e=>e.clip==='ring-death'));assert(cues.some(e=>e.clip==='shaft-wall-death'));battle.step(21,.05,[ship],pos,bounds);assert(battle.entities.every(e=>e.dead));
 const d=read('rocket-slug-v21.json');assert.equal(d.clips['thrust-left'].streams[0],'0x39b1a2');assert.equal(d.clips['thrust-right'].streams[0],'0x39b05e');assert(d.clips['thrust-left'].frames.every(f=>f.left>0));assert(d.clips['thrust-right'].frames.every(f=>f.left<0));
 const layers=[],m={rocketData:d,drawRocketLayer:(...a)=>layers.push(a[1])},ctx=new Proxy({},{get:()=>()=>{}});
 for(const dir of [-1,0,1]){layers.length=0;NativeMedia.prototype.drawRocketCraft.call(m,ctx,{hReady:true,launchedAt:0,cruiseAt:1,lateralThrust:dir},12,24);assert.equal(layers.includes('thrust-left'),dir<0);assert.equal(layers.includes('thrust-right'),dir>0);}
 layers.length=0;NativeMedia.prototype.drawRocketCraft.call(m,ctx,{hReady:true,launchedAt:0,dead:true,lateralThrust:1},12,24);assert(!layers.includes('thrust-right'));
 console.log('v21: actual-first-shot spawn gate, deferred waves, final explosions, native left/right flame rendering passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
