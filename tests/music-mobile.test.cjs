const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('assets/music/music-ui-v241.js','utf8'),start=src.indexOf('  const mobilePlayer=');
const listeners={},nodes={},saved={};const $=id=>nodes[id]??=( {classList:{toggle(){},remove(){},contains(){return false}},setAttribute(){}} );
const stack=[{nwPage:'#profile'}];let pos=0;
const history={get state(){return stack[pos]},pushState(s){stack.splice(++pos);stack.push(s)},back(){if(pos){pos--;listeners.popstate()}}};
const ctx={prepareTrackSources(){},$ ,window:{matchMedia:()=>({matches:true,addEventListener(){}}),addEventListener:(n,f)=>listeners[n]=f},localStorage:{getItem:k=>saved[k]??null,setItem:(k,v)=>saved[k]=v},history,location:{href:'https://example.com/#profile'},coverModal:$('cover'),closeCoverModal(){},closeTrackMenu(){},paint(){},syncLyrics(){},lastLyricIndex:-1};
vm.runInNewContext(src.slice(start,src.indexOf('\n  populateSelect();',start)),ctx);
for(let i=0;i<3;i++){$('nwCollapseBtn').onclick();assert.equal(history.state.nwMusicPlayer,true);assert.equal(history.state.nwPage,'#profile');history.back();assert.equal(saved.nwMusicCollapsed,'1');assert.equal(pos,0)}
$('nwCollapseBtn').onclick();$('nwCollapseBtn').onclick();assert.equal(pos,0);assert.equal(saved.nwMusicCollapsed,'1');console.log('Mobile history repeated open/Back, close button, and existing route preservation passed.');
