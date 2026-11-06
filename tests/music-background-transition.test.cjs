const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('assets/music/music-ui-v241.js','utf8');
const nodes=new Map(),states=[],pending={};let emptyLoads=0,pauses=0,plays=0;
const ctx={tracks:[{id:'local',audio:'blob:local'},{id:'base',audio:'base.mp3'},{id:'new',audioFile:'v1'}],index:0,bgmOn:true,trackTransitionPlaying:false,userStarted:false,navigator:{mediaSession:{set playbackState(v){states.push(v)},setPositionState(){}}},localStorage:{setItem(){}},audio:{paused:false,ended:false,duration:60,currentTime:0,src:'blob:local',pause(){this.paused=true;pauses++},load(){emptyLoads++},removeAttribute(){this.src=''},play(){this.paused=false;plays++;return Promise.resolve()}},$:id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){},remove(){}},value:0});return nodes.get(id)},setRangeFill(){},fmt:()=>'',populateSelect(){},paint(){ctx.updateMediaSession(true)},window:{NWResolveMusicAudio:t=>new Promise((resolve,reject)=>pending[t.id]={resolve,reject})}};
ctx.current=()=>ctx.tracks[ctx.index];vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('  function updateMediaSession('),source.indexOf('  function initMediaSession')),ctx);
vm.runInContext(source.slice(source.indexOf('  let trackLoadSerial'),source.indexOf('  function syncPlayIcon')),ctx);
(async()=>{
ctx.setTrack(1,true);await Promise.resolve();assert.equal(ctx.audio.src,'base.mp3');assert.equal(pauses,0);assert.equal(emptyLoads,0);assert(states.every(x=>x==='playing'),'direct transition must not announce paused');
ctx.audio.ended=true;ctx.setTrack(2,true);assert.equal(ctx.audio.src,'','pending song must clear old audio');assert.equal(ctx.audio.paused,true);ctx.updateMediaSession(true);assert.equal(states.at(-1),'playing','pending resolution keeps playback intent');pending.new.resolve('new.mp3');await Promise.resolve();ctx.audio.ended=false;await Promise.resolve();assert.equal(ctx.audio.src,'new.mp3');
ctx.setTrack(1,true);await Promise.resolve();ctx.setTrack(2,true);assert.equal(ctx.audio.src,'new.mp3','known URLs switch synchronously');await Promise.resolve();
ctx.tracks.push({id:'slow',audioFile:'v2'});ctx.setTrack(3,true);ctx.pausePlayback();const before=plays;pending.slow.resolve('slow.mp3');await Promise.resolve();assert.equal(plays,before,'manual pause cancels deferred autoplay');assert.equal(states.at(-1),'paused');
ctx.tracks.push({id:'broken',audioFile:'v3'});ctx.setTrack(4,true);pending.broken.reject(Error('network'));await Promise.resolve();await Promise.resolve();assert.equal(states.at(-1),'paused','failed resolution releases transition intent');
console.log('Background transitions: direct continuity, safe pending source clearing, session continuity, synchronous cached URLs, manual pause and error handling passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
