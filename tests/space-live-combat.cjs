const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const file=n=>pathToFileURL(path.resolve(__dirname,'../draw/'+n));
 const {NativeMedia}=await import(file('space-media.js')),{SpaceBoss}=await import(file('space-boss.js')),{NativeEncounters}=await import(file('space-encounters.js')),{markHit,hitFeedback}=await import(file('space-hit.js'));
 const data=JSON.parse(fs.readFileSync(file('space-assets/assets.json'))),bossData=JSON.parse(fs.readFileSync(file('space-assets/native-boss.json'))),audioEvents=[];
 const media=Object.assign(new NativeMedia,{data,bossData,nativeImage:{},draw(){}}),audio={add:e=>audioEvents.push(e)};
 // A nonfatal hit must be painted, even if simulation advances 150 ms between paints.
 for(const speed of [1,3]){const e={hp:5};for(let i=0;i<4;i++){markHit(e);e.hp--;const now=10+i*.2;assert(hitFeedback(e,now).flash);assert(!hitFeedback(e,now+.02).flash);assert(!hitFeedback(e,now+.11).flash);}assert.equal(e.hp,1);}
 const boss=new SpaceBoss(60,2,audio,media),bounds={W:800,H:610};boss.step(30,.01,2,bounds,false);boss.step(32,.01,2,bounds,false,[{x:400,y:500}]);assert.equal(boss.escorts.size,3);assert.equal(boss.hulls().length,4);
 const battle=new NativeEncounters(media,audio,[]);battle.boss=boss;battle.bounds=bounds;battle.position=()=>({x:400,y:500});const ships=[...boss.escorts.values()],target=ships[0];
 battle.bullets=[{x:target.x,y:target.y,vx:0,vy:0,life:1}];battle.step(32,.01,[],()=>({x:400,y:500}),bounds);assert.equal(target.hp,4);assert.equal(battle.bullets.length,0);assert(ships.slice(1).every(e=>e.hp===5));
 for(let i=0;i<4;i++)assert(battle.hurt('space-escort-'+target.id,32));assert(target.dead);assert.equal(boss.escortKills,1);assert.equal(battle.hurt('space-escort-'+target.id,32),false);assert(ships.slice(1).every(e=>e.hp===5));assert.equal(audioEvents.filter(e=>e.clip==='alien-death').length,1);
 boss.step(34,2,2,bounds,false,[{x:400,y:500}]);assert.equal(boss.shots.length,2);assert(boss.shots.every(s=>s.owner!==target.id));assert.equal(boss.hulls().length,3);
 const ctx={save(){},restore(){},translate(){},scale(){},drawImage(...args){this.calls.push(args);},clip(){throw Error('Original viewport clip must not be used');},calls:[]};
 assert(bossData.world_parts);
 for(const [name,seconds]of [['first',2.5],['second',2.6]]){
  const f=media.nativeFrame(name,seconds),all=new Map(f.escorts.map(e=>[e.id,{dead:false,flash:false}]));
  ctx.calls=[];media.drawNative(ctx,name,seconds,0,0,1,{escorts:all});assert.equal(ctx.calls.length,f.parts.length);assert(ctx.calls.some(a=>a[5]<0||a[5]+a[7]>320||a[6]<0||a[6]+a[8]>224),'Full offscreen parts must survive extraction and rendering');
  const dead=f.escorts[0].id;all.get(dead).dead=true;ctx.calls=[];media.drawNative(ctx,name,seconds,0,0,1,{escorts:all});assert.equal(ctx.calls.length,f.parts.filter(p=>p[6]!==dead).length);
 }
 boss.transition('fusion',34);boss.step(35,.01,2,bounds,false);assert(boss.escorts.get(target.id).dead,'Destroyed escort cannot reappear during fusion');boss.step(41,.01,2,bounds,false,[{x:400,y:500}]);assert.equal(boss.stage,'second');assert(boss.escorts.get(target.id).dead);assert.equal(boss.hulls().length,3);
 const entering=new NativeEncounters(media,audio,[]);entering.spawn({key:'entry-hit',type:2,at:10,side:0,s:{}},0);assert(entering.hurt(entering.entities[0].id,7.1),'Visible entering enemies must accept hits immediately');assert.equal(entering.hulls(7.1).length,1);
 const late=new SpaceBoss(60,2,audio,media);late.transition('second',30);late.step(32.6,.01,2,bounds,false);assert.equal(late.escorts.size,4);assert.equal(bossData.hit.palette_pairs['0x184'],'0x186');assert(media.nativeFrame('second',2.6).parts.some(p=>p[6]===56&&p[0]!==p[5]));late.step(30.01,.01,2,bounds,false);assert.equal(late.hulls().filter(h=>h.entity).length,3,'Absent escort must not leave an invisible hitbox');
 for(const [type,index]of [[0,0],[2,0],[3,0],[4,0]]){const ev={key:'nonfatal-'+type,type,at:10,side:2,s:{}},e=new NativeEncounters(media,audio,[]);e.bounds=bounds;e.spawn(ev,index);const victim=e.entities[0];victim.x=400;victim.y=300;assert(e.hurt(victim.id,10));let flash=false;e.media={...media,draw(...a){if(a[1].endsWith('-move'))flash ||= a[6]?.flash===true;}};e.draw(new Proxy({},{get:()=>()=>{}}),10);assert(flash,'Nonfatal contact must render a native hit palette for type '+type);assert(!victim.dead);}
 console.log(JSON.stringify({nonfatalHitEveryContact:true,feedbackAt1xAnd3x:true,firstAndFinalBossUnclipped:true,sweptEscortContact:true,independentEscortHealthAndDeath:true,liveEscortProjectiles:true,noEscortResurrection:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
