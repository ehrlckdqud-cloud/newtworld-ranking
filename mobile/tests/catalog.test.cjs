const {test}=require('node:test');const assert=require('node:assert/strict');
const {merge}=require('../shared/catalog.js');
const original=[{id:'a',title:'Original',audio:'assets/music/a.mp3',syncedLyrics:[{text:'hello',time:0}]},{id:'b',audio:'assets/music/b.mp3'}];
test('administrator edits, order, deletion and sync survive native catalog merge',()=>{
 const result=merge(original,{tracks:[{id:'a',title:'Edited'},{id:'c',audioFile:'file1',coverFile:'cover1'}],state:{order:['c','a'],deleted:['b']}},{tracks:{c:{audioFile:'file1',audio:'assets/music/c.mp3',coverFile:'cover1',cover:'assets/music/c.jpg'}}},{a:[2.5]});
 assert.deepEqual(result.map(t=>t.id),['c','a']);assert.equal(result[1].title,'Edited');assert.equal(result[1].syncedLyrics[0].time,2.5);assert.match(result[0].audio,/^https:/);
});
test('unpublished changed uploads are not played using stale files',()=>{
 assert.equal(merge([],{tracks:[{id:'c',audioFile:'new'}]},{tracks:{c:{audioFile:'old',audio:'assets/music/old.mp3'}}}).length,0);
});
test('external audio URLs cannot enter native queue',()=>{
 assert.equal(merge([{id:'a',audio:'https://other.example/audio.mp3'}],{},{}).length,0);
});
