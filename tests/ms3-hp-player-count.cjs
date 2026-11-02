// Real WASM boot, coin, shared character selection and original door; no forced spawn.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');function loadCJS(file){const Module=require('node:module'),m=new Module(file,module);m.filename=file;m.paths=module.paths;m._compile(fs.readFileSync(file,'utf8'),file);return m.exports;}global.JSZip=loadCJS(root+'/coop/jszip.js');loadCJS(root+'/coop/engine.js');
(async()=>{const profile=JSON.parse(fs.readFileSync(root+'/coop/native/profile.json')),m=await loadCJS(process.env.MS3_CORE_JS)({print:()=>{},printErr:()=>{}});await(await import('../coop/native/prepare-coop.mjs')).prepareCoopROM(m,fs.readFileSync(process.env.MS3_ROM_ZIP),profile);assert(m._nw_load());const {FiveSession}=await import('../coop/native/five-session.mjs');const boot=new FiveSession(m,profile,{sharedSelection:true});for(let f=0;f<1100;f++)boot.step([0,0,0,0,0]);const size=m._nw_snapshot(),snapshot=m.HEAPU8.slice(m._nw_snapshot_ptr(),m._nw_snapshot_ptr()+size),base=boot.checkpoint(),results=[];
for(let count=1;count<=5;count++){
 m.HEAPU8.set(snapshot,m._nw_snapshot_buffer(size));assert(m._nw_restore());const e=new FiveSession(m,profile,{playerCount:count,characters:Array(count).fill(0),sharedSelection:true});const initial=e.checkpoint();e.restore({...base,playerCount:count,players:initial.players});
 e.coin();for(let f=1100;f<3100;f++){if(f===1620)e.start();e.step(f>=1680&&f<1686?[16,0,0,0,0]:[0,0,0,0,0]);}
 assert(e.selection);assert.equal(e.phase,'attract');
 for(let i=0;i<count;i++){const input=[0,0,0,0,0];input[i]=16;e.step(input);e.step([0,0,0,0,0]);}
 for(let f=0;f<1500&&e.phase!=='playing';f++)e.step([0,0,0,0,0]);assert.equal(e.phase,'playing',`${count}P selector blocked`);
 for(let f=0;f<180;f++)e.step([0,0,0,0,0]);const state=e.state();assert.equal(state.activeMask,(1<<count)-1,`${count}P active mask`);
 assert.equal(e.players.filter(p=>p.state==='active').length,count);for(let i=count;i<5;i++){assert.equal(e.players[i].lives,0);assert.equal(e.players[i].state,'spectator');assert.equal(e.byte(e.status[i]+0x82),0);if(i>=2)assert.equal(e.byte(0x1053e0-(i-2)*0x210),0);}
 const sn=m._nw_snapshot(),start=m.HEAPU8.slice(m._nw_snapshot_ptr(),m._nw_snapshot_ptr()+sn),host=e.checkpoint(),entries=[];
 for(let mission=0;mission<5;mission++){
  m.HEAPU8.set(start,m._nw_snapshot_buffer(sn));assert(m._nw_restore());e.restore(host);e.wb(0x10ed7a,mission);e.wb(0x10ed7b,0);e.wl(0x10039c,0xed0f6);let reached=false,entry=false;
  for(let f=0;f<900;f++){e.step([0,0,0,0,0]);assert.equal(e.byte(0x10ed86)&~((1<<count)-1),0,`ghost seat ${count}P mission ${mission+1}`);if(e.byte(0x10040c)===mission&&e.byte(0x10ed86)===(1<<count)-1)reached=true;if(mission!==2||e.byte(0x10040c)===2&&e.byte(0x10040d)===1)entry=true;}
  assert(reached&&entry,`${count}P mission ${mission+1} entry failed`);entries.push(mission+1);
 }
 results.push({count,normalBootAndSelection:true,activeMask:state.activeMask,noAbsentPlayers:true,controlledMissionEntries:entries});console.log(JSON.stringify(results.at(-1)));
}
fs.writeFileSync(path.join(process.env.MS3_TEST_OUTPUT||process.cwd(),'player-count-native.json'),JSON.stringify({passed:true,scope:'real native boot/coin/selection/door for 1–5 players, then controlled 900-frame mission entry fixtures for each count; not full route completions for each count',results},null,2));m._nw_close();})().catch(e=>{console.error(e);process.exitCode=1});
