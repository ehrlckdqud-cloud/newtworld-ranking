// Native emulator processes + cross-process snapshots. Does not simulate WAN or OS sleep.
const fs=require('fs'),path=require('path'),Module=require('module'),{fork}=require('child_process'),assert=require('assert/strict');const root=path.resolve(__dirname,'..');
if(!process.env.MS3_CORE||!process.env.MS3_ROM_ZIP)throw Error('MS3_CORE and MS3_ROM_ZIP required');
function load(file){const m=new Module(file,module);m.filename=file;m.paths=module.paths;m._compile(fs.readFileSync(file,'utf8'),file);return m.exports;}
async function worker(){global.JSZip=load(root+'/coop/jszip.js');load(root+'/coop/engine.js');const m=await load(process.env.MS3_CORE)({print:()=>{},printErr:()=>{}}),profile=JSON.parse(fs.readFileSync(root+'/coop/native/profile.json'));await(await import(root+'/coop/native/prepare-coop.mjs')).prepareCoopROM(m,fs.readFileSync(process.env.MS3_ROM_ZIP),profile);assert(m._nw_load());const {FiveSession}=await import(root+'/coop/native/five-session.mjs'),{stateHash}=await import(root+'/coop/lockstep.mjs'),{captureState,restoreState}=await import(root+'/coop/lockstep-snapshot.mjs');const e=new FiveSession(m,profile,{characters:[0,1,2,3,0],playerCount:5,sharedSelection:true,paid:true});for(let f=0;f<1400;f++)e.step([0,0,0,0,0]);e.playerCount=1;e.players.forEach((p,i)=>{p.participating=i<e.playerCount;p.state=p.participating?"waiting":"spectator";p.lives=p.participating?3:0;});e.start();

 let video; m.onVideo=(ptr,w,h,pitch)=>{video=Buffer.from(m.HEAPU8.slice(ptr,ptr+h*pitch));};
 for(let f=0;f<900&&e.phase!=='playing';f++)e.step(Array.from({length:5},(_,i)=>i<e.playerCount&&f%20===1?16:0));
 assert.equal(e.phase,'playing');
 const checkpoint=captureState(m,e,e.frame);

 for(let slot=2;slot<=5;slot++){
  e.addSeat(slot);e.quickContinue(slot,'late-'+slot,true);
  assert.equal(e.players[slot-1].state,'active');assert.equal(e.players[slot-1].lives,3);
  const joined=captureState(m,e,e.frame),visible=[];for(let f=0;f<80;f++){e.step([0,0,0,0,0]);visible.push(Buffer.from(video));}
  restoreState(m,e,joined);e.ww(e.x.actors[slot-1]+0x12,0);let changed=0;for(let f=0;f<80;f++){e.step([0,0,0,0,0]);for(let i=0;i<video.length;i++)if(video[i]!==visible[f][i])changed++;}
  assert(changed>100,`late P${slot} invisible`);
  restoreState(m,e,joined);for(let f=0;f<80;f++)e.step([0,0,0,0,0]);console.log('PASS fresh late seat',slot,'visible bytes',changed);
 }
 e.removePlayer(3);e.addSeat(3);e.quickContinue(3,'returned',true);assert.equal(e.players[2].state,'active');
 console.log('PASS departed P3 resumes in the existing native mission');m._nw_close();}
worker().catch(e=>{console.error(e);process.exitCode=1;});
