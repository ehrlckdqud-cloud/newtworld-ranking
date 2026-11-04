import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
function load(source){const start=source.indexOf('let n=[{kind:"wave"}'),end=source.indexOf('}),i("c9l5F"',start);return vm.runInNewContext(source.slice(start,end)+';h',{crypto:webcrypto})}
const Engine=load(readFileSync(new URL('../draw/pondApp.e4104cc4.js',import.meta.url),'utf8'));
const Old=vm.runInNewContext(readFileSync(new URL('./browser-fixtures/pond-engine-before-revival.txt',import.meta.url),'utf8')+';h',{crypto:webcrypto});
function random(seed=1){return n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n}}
function run(Type,duration,count,keep,revive,seed=1){const engine=new Type(random(seed),random(seed+99)),names=Array.from({length:count},(_,i)=>'P'+i),events=[],revivals=[];engine.setAdminCheck(()=>true);engine.onEvent=e=>events.push({kind:e.kind,actor:e.actor,targets:Array.from(e.targets),round:e.round,ids:Array.from(e.reviveIds||[])});engine.onRevive=leaves=>revivals.push(...leaves.map(l=>l.id));engine.reset(names,keep,duration,true,revive);engine.start();for(let i=0;i<3000&&engine.state==='running';i++)engine.update(.05);return {engine,events,revivals,winners:Array.from(engine.winners,l=>l.id)}}
test('45/60 modes retain exact legacy attacks, draws and timing even with requested revival',()=>{
 for(const duration of [45,60])for(const seed of [1,9,123]){const a=run(Old,duration,80,3,299,seed),b=run(Engine,duration,80,3,299,seed);assert.deepEqual(b.events,a.events);assert.deepEqual(b.winners,a.winners);assert.equal(b.engine.elapsed,a.engine.elapsed);assert.equal(b.engine.rounds,12);assert.equal(b.revivals.length,0);assert.equal(b.engine.revivalCount,0)}
});
test('long modes revive only once and finish with the exact requested winners',()=>{
 for(const duration of [90,120])for(const count of [2,3,10,100,300])for(const keep of [1,count-1,count])for(const amount of [0,1,3,299]){
  const r=run(Engine,duration,count,keep,amount);assert.equal(r.engine.state,'finished');assert.equal(r.winners.length,keep);assert.equal(new Set(r.winners).size,keep);assert.equal(r.engine.rounds,duration===90?18:24);assert.ok(r.revivals.length<=amount);assert.equal(new Set(r.revivals).size,r.revivals.length);assert.ok(r.events.filter(e=>e.kind==='revival').length<=1);
  if(amount===0||keep===count)assert.equal(r.revivals.length,0);
  for(const event of r.events.filter(e=>e.kind==='revival')){assert.equal(event.targets.length,0);assert.equal(event.round,Math.floor(r.engine.rounds/2));assert.deepEqual(r.revivals,event.ids)}
 }
});
test('a resurrected member can win, and has no special protection or forced elimination',()=>{
 for(const duration of [90,120]){
  let delivered=false;const engine=new Engine(n=>delivered?n-1:0,()=>0);engine.setAdminCheck(()=>true);engine.reset(Array.from({length:20},(_,i)=>'P'+i),1,duration,false,1);
  let revived;engine.onRevive=leaves=>{delivered=true;revived=leaves[0];assert.equal(revived.shield,false)};engine.start();while(engine.state==='running')engine.update(.1);
  assert.equal(engine.winners[0].id,revived.id);
  const other=run(Engine,duration,30,1,3,12);assert.ok(other.revivals.length>0); // ordinary later rounds still select from all alive IDs.
 }
});
test('clear/reset and paused clock cannot repeat revival',()=>{
 const r=run(Engine,90,20,1,3);r.engine.clear();assert.equal(r.engine.revivalCount,0);r.engine.reset(['a','b'],1,60,true,100);assert.equal(r.engine.rounds,12);assert.equal(r.engine.revivedCount,0);assert.ok(r.engine.leaves.every(l=>!l.revived));
 const e=new Engine(()=>0,()=>0);e.setAdminCheck(()=>true);e.reset(Array.from({length:20},(_,i)=>''+i),1,90,false,3);e.start();while(e.event.kind!=='revival')e.update(.05);const before=e.elapsed;e.update(0);assert.equal(e.elapsed,before);assert.equal(e.revivedCount,0);while(!e.event.applied)e.update(.05);assert.equal(e.revivedCount,3);const ids=e.event.reviveIds.slice();e.update(.1);assert.equal(e.revivedCount,ids.length);
});
