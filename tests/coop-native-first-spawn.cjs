// Native emulator processes + cross-process snapshots. Does not simulate WAN or OS sleep.
const fs=require('fs'),path=require('path'),Module=require('module'),{fork}=require('child_process'),assert=require('assert/strict');const root=path.resolve(__dirname,'..');
if(!process.env.MS3_CORE||!process.env.MS3_ROM_ZIP)throw Error('MS3_CORE and MS3_ROM_ZIP required');
function load(file){const m=new Module(file,module);m.filename=file;m.paths=module.paths;m._compile(fs.readFileSync(file,'utf8'),file);return m.exports;}
async function worker(){global.JSZip=load(root+'/coop/jszip.js');load(root+'/coop/engine.js');const m=await load(process.env.MS3_CORE)({print:()=>{},printErr:()=>{}}),profile=JSON.parse(fs.readFileSync(root+'/coop/native/profile.json'));await(await import(root+'/coop/native/prepare-coop.mjs')).prepareCoopROM(m,fs.readFileSync(process.env.MS3_ROM_ZIP),profile);assert(m._nw_load());const {FiveSession}=await import(root+'/coop/native/five-session.mjs'),{stateHash}=await import(root+'/coop/lockstep.mjs'),{captureState,restoreState}=await import(root+'/coop/lockstep-snapshot.mjs');const e=new FiveSession(m,profile,{characters:[0,1,2,3,0],playerCount:5,sharedSelection:true,paid:true});for(let f=0;f<1400;f++)e.step([0,0,0,0,0]);e.playerCount=Number(process.env.MS3_PLAYERS||5);e.players.forEach((p,i)=>{p.participating=i<e.playerCount;p.state=p.participating?"waiting":"spectator";p.lives=p.participating?3:0;});e.start();

 let video; m.onVideo=(ptr,w,h,pitch)=>{video=Buffer.from(m.HEAPU8.slice(ptr,ptr+h*pitch));};
 for(let f=0;f<900&&e.phase!=='playing';f++)e.step(Array.from({length:5},(_,i)=>i<e.playerCount&&f%20===1?16:0));
 assert.equal(e.phase,'playing');
 const checkpoint=captureState(m,e,e.frame);
 for(let i=2;i<e.playerCount;i++){
  restoreState(m,e,checkpoint);assert.equal(e.players[i].lives,3);assert.equal(e.word(e.x.actors[i]+0x12),65535);
  for(let f=0;f<300;f++)e.step([0,0,0,0,0]);const visible=Buffer.from(video);
  restoreState(m,e,checkpoint);e.ww(e.x.actors[i]+0x12,0);for(let f=0;f<300;f++)e.step([0,0,0,0,0]);
  let changed=0;for(let j=0;j<video.length;j++)if(video[j]!==visible[j])changed++;
  assert(changed>100,`P${i+1} first-spawn sprite absent: ${changed}`);
  console.log(`PASS P${i+1} first-life rendering: ${changed} changed color bytes, 3 lives`);
 }
 restoreState(m,e,checkpoint);e.removePlayer(3);assert(e.players[2].departed);e.authorizeRejoin(3,'resume-test');e.selectCharacter(3,2);for(let f=0;f<20;f++)e.step([0,0,0,0,0]);assert(!e.players[2].departed);assert.equal(e.players[2].state,'active');assert.equal(e.players[2].lives,3);
 console.log('PASS departed P3 resumes in the existing native mission');m._nw_close();}
worker().catch(e=>{console.error(e);process.exitCode=1;});
