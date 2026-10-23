const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {NativeMedia}=await import('../draw/space-media.js'),m=new NativeMedia;m.deathData=JSON.parse(fs.readFileSync('draw/space-assets/rocket-death-v30.json'));m.deathImage={};m.drawRocketCraft=()=>{};
 let draws=[],positions=[];const c={save(){},restore(){},scale(){},rotate(){},translate(...x){positions.push(x)},drawImage(...x){draws.push(x)}};
 m.drawExplorerDeath(c,{death:0,dx:100,dy:200},.15,24);assert.deepEqual(positions,[[100,200]]);assert(draws.length>20,'native four-ray chain creates larger explosion');assert(draws.some(x=>x[5]>80));assert(draws.some(x=>x[5]<-80));
 assert.equal(m.deathData.proof.sound,'0x1034 at 0x7a87a');assert.equal(m.deathData.clips['rocket-explosion'].length,29);assert.equal(m.deathData.clips['rocket-flare'].length,15);
 const {SpaceMusicUI}=await import('../draw/space-music.js');const gains=[],links=[];global.AudioContext=class{constructor(){this.destination={}}createMediaStreamDestination(){return {stream:{}}}async resume(){}createMediaElementSource(p){return {connect(n){links.push([p,n])}}}createGain(){const g={gain:{},connect(){}};gains.push(g);return g}};
 const music=Object.create(SpaceMusicUI.prototype),start={spaceEffectGain:2},complete={spaceEffectGain:2},bgm={};music.players={bgm};await music.prepareRecordingAudio(start,complete);assert.deepEqual(gains.map(g=>g.gain.value),[1,2,2]);await music.prepareRecordingAudio(start,complete);assert.equal(gains.length,3,'recording must not duplicate audible routes');music.effectVolume(start,0);assert.equal(start.volume,0);music.effectVolume(start,.55);assert.equal(start.volume,.55);
 console.log('v30: native Rocket Slug explosion rays and sound, 2x announcements with mute/master and single recording route passed');
})().catch(e=>{console.error(e);process.exitCode=1});
