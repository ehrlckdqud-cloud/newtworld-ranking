const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
(async()=>{
 const {NativeMedia}=await import('../draw/space-media.js'),m=new NativeMedia;
 m.data=JSON.parse(fs.readFileSync('draw/space-assets/assets.json'));let moves=[],scales=[],craft=0,clips=[];
 m.drawRocketCraft=()=>craft++;m.draw=(...args)=>clips.push(args);
 const ctx={save(){},restore(){},translate(...a){moves.push(a)},scale(...a){scales.push(a)},rotate(){}};
 const ship={dead:true,death:10,dx:145,dy:260,deathScale:1,deathAngle:.04};
 for(const age of [0,.02,.1,.3,.47])m.drawExplorerDeath(ctx,ship,10+age,24);
 assert(moves.every(v=>v[0]===145&&v[1]===260));assert(scales.every(v=>v[0]===1&&v[1]===1));assert.equal(craft,2);assert.equal(clips.length,5);assert(clips.every(v=>v[1]==='ufo-death'));
 m.drawExplorerDeath(ctx,ship,10.5,24);assert.equal(clips.length,5);
 const proof=JSON.parse(fs.readFileSync('draw/space-assets/mission-explorer-v29.json')),wav=fs.readFileSync('draw/space-assets/'+proof.mission.asset);assert.equal(crypto.createHash('sha256').update(wav).digest('hex'),proof.mission.sha256);assert.equal(proof.mission.gain,2);assert(proof.mission.duration>2.2);assert.equal(proof.mission.command,'0x1137');
 assert.equal(m.data.clips['ufo-death'].sounds[0].sound_id,'ym-1021');
 const original=fs.readFileSync('draw/space-original.js','utf8');assert(original.includes("sound:'ym-1021',at:time,priority:true,fullPlayback:true"));assert(original.includes('if(s.dead&&!s.absorbedBy)'));assert(!original.includes('else burst(p.x,p.y,organic)'));
 console.log('v29: fixed-position original explosion, full native death sound, complete voice asset provenance passed');
})().catch(e=>{console.error(e);process.exitCode=1});
