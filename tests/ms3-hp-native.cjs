const fs=require('fs'),Module=require('module'),assert=require('assert/strict');
const path=require('node:path'),root=path.resolve(__dirname,'..'),dir=process.env.MS3_TEST_OUTPUT||process.cwd();
function load(file){const mod=new Module(file,module);mod.filename=file;mod.paths=module.paths;mod._compile(fs.readFileSync(file,'utf8'),file);return mod.exports;}
(async()=>{
 global.JSZip=load(root+'/coop/jszip.js');load(root+'/coop/engine.js');
 const m=await load(process.env.MS3_CORE_JS)({print:()=>{},printErr:()=>{}}),profile=JSON.parse(fs.readFileSync(root+'/coop/native/profile.json'));
 await(await import(root+'/coop/native/prepare-coop.mjs')).prepareCoopROM(m,fs.readFileSync(process.env.MS3_ROM_ZIP),profile);

 function put(bytes,a,code){for(let i=0;i<code.length;i++)bytes[(a+i)^1]=code[i];}
 const biosPath='/system/fbneo/patched/neogeo.zip',bz=await JSZip.loadAsync(m.FS.readFile(biosPath));
 for(const name of ['sp-s2.sp1','sp-s3.sp1']){const bytes=await bz.file(name).async('uint8array');const before=bytes.reduce((a,b)=>a+b,0);put(bytes,0x1e000,Buffer.from('2f39001004fc2f39001005ac23fc00c1e080001004fc23f900104d80001005ac207900104d844eb900c1c80033c000104d8833c700104d9023df001005ac23df001004fc2cbc00c1e0804e75','hex'));put(bytes,0x1e080,Buffer.from('4e75','hex'));put(bytes,0x1d000,Buffer.from('40e7bdf900104d846606527900104d8846df4bf9001080004ef900005908','hex'));bytes[0x10fff]=(bytes[0x10fff]+before-bytes.reduce((a,b)=>a+b,0))&255;assert.equal(bytes.reduce((a,b)=>a+b,0)&255,before&255);bz.file(name,bytes);}
 m.FS.writeFile(biosPath,await bz.generateAsync({type:'uint8array',compression:'STORE'}));assert(m._nw_load());
 const {FiveSession}=await import(root+'/coop/native/five-session.mjs'),{captureState,restoreState}=await import(root+'/coop/lockstep-snapshot.mjs');
 const e=new FiveSession(m,profile,{characters:[0,0,0,0,0],playerCount:5,sharedSelection:true,paid:true}),zero=[0,0,0,0,0];
 let video; m.onVideo=(ptr,w,h,pitch,fmt)=>{video={ptr,w,h,pitch,fmt};};
 for(let f=0;f<1400;f++)e.step(zero);e.playerCount=1;e.players.forEach((p,i)=>{p.participating=i<1;p.state=i<1?"waiting":"spectator";p.lives=i<1?3:0;});e.start();for(let f=0;f<900&&e.phase!=='playing';f++)e.step([f%20===1?16:0,f%20===1?16:0,0,0,0]);if(e.phase!=='playing')console.log('BOOT_DEBUG',e.state(),e.long(0x10023c).toString(16),e.word(0x100016),e.byte(0x10fdb0));assert.equal(e.phase,'playing');for(let f=0;f<60;f++)e.step(zero);

 const parent=profile.experiment.actors[0],fixture=captureState(m,e,e.frame);let target;
 const data=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/ms3-hp-catalog.json'))),rows=[...data.photoRows,...data.unpictured],out=[];
 const rz=await JSZip.loadAsync(m.FS.readFile('/system/fbneo/patched/mslug3fd.zip')),p1=await rz.file('256-ph1.p1').async('uint8array');
 for(const c of data.constants){const at=parseInt(c.site,16),got=Array.from({length:6},(_,i)=>p1[(at+i)^1]);assert.deepEqual(got,[0x3d,0x7c,c.value>>8,c.value&255,0,0x4e],`constant HP changed at ${c.site}`);}
 for(const r of rows){for(let players=1;players<=5;players++){const mode=players>1?0:1; // Deliberately contradict legacy P1/P2 detection; use participant count.
{
  restoreState(m,e,fixture);e.players.forEach((p,i)=>{p.participating=i<players;p.departed=false;});
  target=e.long(0x10540c);const next=e.long(target+8),following=e.long(parent+8);
  e.wl(0x10540c,next);e.ww(0x105410,e.word(0x105410)-1);e.wl(target+0xc,parent);e.ww(target+0x10,e.word(parent+0x10)+1);
  e.wl(target+4,parent);e.wl(target+8,following);e.wl(following+4,target);e.wl(parent+8,target);
  e.wb(target+0x64,r.index);e.wl(0x104d84,parseInt(r.table,16));e.wl(0x104d80,mode?0xc1e080:0x567a);
  const values=[];for(let repeat=0;repeat<(Array.isArray(r.hpPools?.[mode])&&r.hpPools[mode].length>1?64:1);repeat++){
   e.wl(target,0xc1e000);e.ww(0x104d88,0xffff);e.ww(0x104d90,0xffff);for(let tick=0;tick<6&&e.word(0x104d88)===0xffff;tick++)e.step(zero);values.push(e.word(0x104d88));
  }
  const h1=Number(r.hp1),h2=Number(r.hp2);const expected=r.hpPools?.[mode]?.length>1?r.hpPools[mode]:[players===1?h1:h2<h1?h2:h1+(players-1)*(h2-h1)];assert(values.every(v=>expected.includes(v)),JSON.stringify({id:r.id,mode,expected,values}));
  out.push({id:r.id,table:r.table,index:r.index,players,expected,observed:[...new Set(values)].sort((a,b)=>a-b),samples:values.length});
 }}}
 fs.writeFileSync(dir+'/results.json',JSON.stringify({difficulty:3,gameMode:2,count:out.length,results:out},null,2));m._nw_close();console.log('PASS',out.length,'native table/index/player checks');
})().catch(e=>{console.error(e);process.exitCode=1});
