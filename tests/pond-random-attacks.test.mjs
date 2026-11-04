import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const source=readFileSync(new URL('../draw/pondApp.e4104cc4.js',import.meta.url),'utf8');
const begin=source.indexOf('let n=[{kind:"wave"}');
const end=source.indexOf('}),i("c9l5F"',begin);
// Run the production engine, excluding its Parcel registration wrapper.
const Engine=vm.runInNewContext(source.slice(begin,end)+';h',{crypto:webcrypto});
const names=Array.from({length:80},(_,i)=>'member-'+i);
function engine(attack,combined=false){const e=new Engine(()=>0,attack);e.setAdminCheck(()=>true);e.reset(names,3,60,combined);return e;}
test('all nine attacks can open a game, independent of the round number',()=>{
 const found=new Set();
 for(let choice=0;choice<9;choice++){
  const e=engine(()=>choice);e.start();found.add(e.event.actor||e.event.kind);
  e.next();assert.equal(e.event.actor||e.event.kind,[...found].at(-1));
 }
 assert.deepEqual([...found].sort(),['wave','vortex','roughskin','treefrog','pacman','axolotl','emperor','marbled','tiger'].sort());
});
test('combined attack can occur in round one, or stay absent in all rounds',()=>{
 let calls=0;const e=engine(()=>[6,0,1][calls++],true);e.start();
 assert.equal(e.events.length,2);assert.equal(e.events[0].actor,'emperor');assert.equal(e.events[1].kind,'vortex');
 for(const choice of [0,1]){
  let k=0;const e=engine(()=>[choice,0,0][k++],true);e.start();
  assert.notEqual(e.events[0].kind,e.events[1].kind);
 }
 const quiet=engine(()=>1,true);quiet.start();for(let i=0;i<11;i++){assert.equal(quiet.events.length,1);quiet.next();}
});
test('attack selection preserves winners and unique eliminations through completed games',()=>{
 for(const combined of [false,true])for(const choice of [0,2,6,8]){
  const e=engine(n=>choice%n,combined), eliminated=[];e.onEliminate=leaves=>eliminated.push(...leaves.map(x=>x.id));e.start();
  for(let t=0;t<1300&&e.state==='running';t++)e.update(.05);
  assert.equal(e.state,'finished');assert.equal(e.winners.length,3);
  assert.equal(eliminated.length,77);assert.equal(new Set(eliminated).size,77);
  assert.deepEqual(Array.from(e.winners,x=>x.id),[77,78,79]);
 }
});
test('invalid injected attack randomness fails explicitly',()=>{
 for(const n of [-1,9,NaN,0.5])assert.throws(()=>engine(()=>n).start(),/공격 난수 오류/);
});
