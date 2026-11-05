const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('assets/music/music-ui-v241.js','utf8');
const code=source.slice(source.indexOf('  let trackLoadSerial'),source.indexOf('  async function tryPlay'));
const nodes=new Map(),pending={};let played=0;
const ctx={tracks:[{id:'a',audioFile:'a'},{id:'b',audioFile:'b'},{id:'c',audio:'https://example.com/c.mp3'}],index:0,bgmOn:true,localStorage:{setItem(){}},audio:{src:'',pause(){},load(){},removeAttribute(){this.src=''}},$:id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){},remove(){}},value:0});return nodes.get(id)},setRangeFill(){},fmt:()=>'',populateSelect(){},paint(){},updateMediaSession(){},tryPlay:()=>played++,window:{NWResolveMusicAudio:t=>new Promise(resolve=>pending[t.id]=resolve)}};
ctx.current=()=>ctx.tracks[ctx.index];vm.createContext(ctx);vm.runInContext(code,ctx);
(async()=>{ctx.setTrack(0,true);ctx.setTrack(1,true);pending.b('blob:b');await Promise.resolve();assert.equal(ctx.audio.src,'blob:b');pending.a('blob:a');await Promise.resolve();assert.equal(ctx.audio.src,'blob:b','late responses cannot replace selected song');assert.equal(played,1);ctx.setTrack(2,true);assert.equal(ctx.audio.src,'https://example.com/c.mp3');assert.equal(played,2);console.log('Player async selection and existing URL playback passed.');})();
