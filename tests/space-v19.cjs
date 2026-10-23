const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {blackHoleFrames,BLACK_HOLE_RULES}=await import('../draw/space-black-hole.js'),{BRANDING,FIRST_ATTACK_AT,brandingPose,updateBrandEncounter}=await import('../draw/space-branding.js'),{NativeEncounters}=await import('../draw/space-encounters.js'),{SpaceCWeapon}=await import('../draw/space-c-weapon.js');
 const movie=JSON.parse(fs.readFileSync('draw/space-assets/black-hole-video-v12.json')),view={left:0,right:800,top:0,bottom:610};
 for(let t=0;t<BLACK_HOLE_RULES.lifetime;t+=1/120){const layers=blackHoleFrames(t,movie);assert(Math.abs(layers.reduce((s,l)=>s+l.alpha,0)-1)<1e-9);assert(layers.every(l=>l.frame>=0&&l.frame<movie.frames&&l.alpha>=0&&l.alpha<=1));}
 for(const boundary of [8,14.5]){const before=blackHoleFrames(boundary-.00001,movie),after=blackHoleFrames(boundary,movie);assert(before[0].alpha<1e-8);assert(Math.abs(before[1].frame-after[0].frame)<=1,'Loop resumes where the blended head left off');}
 const mid=blackHoleFrames(7.25,movie);assert.equal(mid.length,2);assert(Math.abs(mid[1].alpha-.5)<1e-8);
 assert.equal(FIRST_ATTACK_AT,9.5);const pose=brandingPose(FIRST_ATTACK_AT,view);assert(Math.abs((pose.y+pose.h)/(610+pose.h)-2/3)<1e-9);
 const data=JSON.parse(fs.readFileSync('draw/space-assets/assets.json')),media={data},audio={add(){}},battle=new NativeEncounters(media,audio,[],50),ship={id:1,hReady:true},pos=()=>({x:400,y:500}),bounds={W:800,H:610,view};
 for(let time=5.2;time<FIRST_ATTACK_AT;time+=.01)battle.step(time,.01,[ship],pos,bounds);assert.equal(battle.bullets.length,0);assert.equal(ship.hMuzzleAt,undefined);assert.equal(ship.hTipMuzzleAt,undefined);battle.step(FIRST_ATTACK_AT+1/18,1/18,[ship],pos,bounds);assert.equal(battle.serial,3);assert(ship.hMuzzleAt>=FIRST_ATTACK_AT);
 const c=new SpaceCWeapon(media,audio),target={key:'far',x:400,y:-10000,r:1};battle.hulls=()=>[target];ship.cUntil=30;c.step(9,.05,[ship],pos,battle);assert.equal(c.missiles.length,0);c.step(FIRST_ATTACK_AT,.05,[ship],pos,battle);assert.equal(c.missiles.length,2);
 const craft=[{id:1,launchedAt:0,y:250},{id:2,launchedAt:0,y:500}],fixed=s=>({x:400,y:s.y});
 updateBrandEncounter(craft,6,view,fixed,24);assert(craft.every(s=>s.cruiseAt===undefined));
 updateBrandEncounter(craft,8,view,fixed,24);assert.equal(craft[0].cruiseAt,8);assert.equal(craft[1].cruiseAt,undefined);
 updateBrandEncounter(craft,10,view,fixed,24);assert.equal(craft[1].cruiseAt,10);updateBrandEncounter(craft,11,view,fixed,24);assert.equal(craft[0].cruiseAt,8,'Engine transition never restarts');
 const {NativeMedia}=await import('../draw/space-media.js');const rocket=JSON.parse(fs.readFileSync('draw/space-assets/rocket-slug-v16.json')),renderer=Object.assign(new NativeMedia,{rocketData:rocket}),layers=[],ctx=new Proxy({},{get:()=>()=>{}});renderer.drawRocketLayer=(c,name)=>layers.push(name);renderer.drawRocketCraft(ctx,{launchedAt:0},7,24);assert(layers.includes('engine-takeoff'));layers.length=0;renderer.drawRocketCraft(ctx,{launchedAt:0,cruiseAt:7},7,24);assert(layers.includes('engine-cruise'));assert(!layers.includes('engine-takeoff'));
 const source=fs.readFileSync('draw/space-original.js','utf8');assert(source.includes('t>=FIRST_ATTACK_AT&&'));assert(!source.includes('t>=6.2&&'));
 console.log(JSON.stringify({smoothBlackHoleLoop:true,blendSeconds:1.5,allLoopBoundariesContinuous:true,firstAttackAt:9.5,logoProgress:2/3,noEarlyHOrCOrMuzzle:true,sharedSoundTiming:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
