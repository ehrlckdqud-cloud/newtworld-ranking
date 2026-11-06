const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('assets/music/music-library.js','utf8');
const fragment=source.slice(source.indexOf(' let publishedAudio=null;'),source.indexOf('\n function post('));
const id='music-1234567890123456',track={id,audioFile:'version1'},direct='assets/music/published/'+id+'-1234567890123456.mp3';
async function setup(manifest,fail=false){let reads=0,urls=0;const ctx={window:{},Map,Uint8Array,Blob,Error,atob,fetch:async()=>({ok:true,json:async()=>manifest}),cache:new Map(),URL:{createObjectURL:()=>`blob:audio-${++urls}`},read:async()=>{reads++;if(fail)throw Error('offline');return {base64:Buffer.from([73,68,51,0,0]).toString('base64')}}};vm.createContext(ctx);vm.runInContext(fragment,ctx);return {resolve:ctx.window.NWResolveMusicAudio,reads:()=>reads,ctx};}
(async()=>{
let a=await setup({tracks:{[id]:{audioFile:'version1',audio:direct}}});assert.equal(await a.resolve(track),direct);assert.equal(a.reads(),0);
a=await setup({tracks:{}});await assert.rejects(a.resolve(track,{prefetch:true}));assert.equal(a.reads(),0);
const values=await Promise.all([a.resolve(track),a.resolve(track)]);assert.equal(values[0],values[1]);assert.equal(a.reads(),1);await a.resolve(track);assert.equal(a.reads(),1);await a.resolve({...track,audioFile:'version2'});assert.equal(a.reads(),2);
a=await setup({tracks:{}},true);await assert.rejects(a.resolve(track));await assert.rejects(a.resolve(track));assert.equal(a.reads(),2);
a=await setup({tracks:{}});a.ctx.read=async()=>({base64:Buffer.from('not mp3').toString('base64')});await assert.rejects(a.resolve(track));
console.log('PASS direct URL, no prefetch downloads, fallback deduplication, version separation, retry after failure, invalid MP3 rejection');
})().catch(e=>{console.error(e);process.exitCode=1});
