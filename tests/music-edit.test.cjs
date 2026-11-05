const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('assets/music/music-library.js','utf8');
const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{value:'',style:{},files:[],hidden:false,disabled:false,handlers:{},after(){},querySelectorAll:()=>[],addEventListener(type,fn){this.handlers[type]=fn},removeAttribute(){},scrollIntoView(){}});return nodes.get(id)}
const track={id:'builtin-1',title:'Old',artist:'Selly',lyrics:'[Verse]\nA\nB',syncedLyrics:[{text:'A',time:1},{text:'B',time:5}],audio:'original.mp3',builtin:true};
const catalog=new Map([[track.id,track]]);let payload,accept=0,replaces=0,confirm=true;
node('nwSyncTrack').value='0';
const ctx={console,Map,JSON,Number,Event:class{},crypto:{randomUUID:()=>String(Math.random())},document:{createElement:()=>node('editor')},$:node,box:{style:{cssText:''}},api:{tracks:[track],acceptLyricsEdit:()=>accept++,replaceTracks:()=>replaces++},catalog,libraryState:{},ordered:()=>[track],dirty:false,renderOrder(){},load:async()=>{},prepareCover:async()=>'',window:{confirm:()=>confirm,addEventListener(){},NWEnsureMusicAdmin:async()=> 'admin',NWResolveMusicCover:async()=>''},post:async p=>{payload=p;return {ok:true,track:{...track,title:p.title,artist:p.artist,lyrics:p.lyrics,syncedLyrics:p.syncedLyrics,editRevision:1}}}};
vm.createContext(ctx);vm.runInContext(code.slice(code.indexOf('  const editor='),code.indexOf("  const retry=document.createElement('button');")),ctx);
(async()=>{
 assert.equal(node('nwMusicEditLyrics').value,'A\nB','edit actual synced lines, not divergent legacy raw lyrics');
 node('nwMusicEditTitle').value='New title';await node('nwMusicEditSave').onclick();
 assert.equal(payload.lyricsChanged,false);assert.equal(payload.resetSync,false);assert.equal(payload.syncedLyrics[1].time,5);assert.equal(payload.coverMode,'keep');assert.equal(track.audio,'original.mp3');assert.equal(accept,0);assert.equal(replaces,1);
 node('nwMusicEditLyrics').value='A\nChanged';await node('nwMusicEditSave').onclick();assert(payload.lyricsChanged);assert.equal(payload.resetSync,false);assert.equal(payload.syncedLyrics[1].time,5);assert.equal(accept,1);
 node('nwMusicEditLyrics').value='A\nChanged\nC';await node('nwMusicEditSave').onclick();assert(payload.resetSync);assert(payload.syncedLyrics.every(x=>x.time===0));
 node('nwMusicEditRemoveCover').onclick();await node('nwMusicEditSave').onclick();assert.equal(payload.coverMode,'remove');
 node('editor').handlers.input();confirm=false;let stopped=false;node('nwSyncTrack').value='9';node('nwSyncTrack').handlers.change({stopImmediatePropagation:()=>stopped=true});assert(stopped);assert.equal(node('nwSyncTrack').value,'0');
 console.log('Editor: existing synced lyrics, metadata-only timing preservation, line edits/reset, cover removal, unsaved switch protection passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
