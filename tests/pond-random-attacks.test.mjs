import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const source=readFileSync(new URL('../draw/pondApp.e4104cc4.js',import.meta.url),'utf8');
const begin=source.indexOf('let n=[{kind:"wave"}');
const end=source.indexOf('}),i("c9l5F"',begin);
// Run the production engine, excluding its Parcel registration wrapper.
const Engine=vm.runInNewContext(source.slice(source.indexOf('const pondStrikes = '),source.indexOf('function strikePoint('))+source.slice(source.indexOf('function pondStrikeWindow('),source.indexOf('function e(e,t,i,n)'))+source.slice(begin,end)+';h',{crypto:webcrypto});
const names=Array.from({length:80},(_,i)=>'member-'+i);
function engine(attack,combined=false){const e=new Engine(()=>0,attack);e.setAdminCheck(()=>true);e.reset(names,3,60,combined);return e;}
test('all fourteen attacks can open a game, independent of the round number',()=>{
 const found=new Set();
 for(let choice=0;choice<14;choice++){
  const e=engine(n=>choice%n);e.start();found.add(e.event.actor||e.event.kind);
  e.next();assert.equal(e.event.actor||e.event.kind,[...found].at(-1));
 }
 assert.deepEqual([...found].sort(),['wave','vortex','roughskin','treefrog','pacman','axolotl','emperor','marbled','tiger','snappingturtle','tomatofrog','snappingturtle2','otter','platypus'].sort());
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
 for(const combined of [false,true])for(const choice of [0,2,6,8,9,10,11,12,13]){
  const e=engine(n=>choice%n,combined), eliminated=[];e.onEliminate=leaves=>eliminated.push(...leaves.map(x=>x.id));e.start();
  for(let t=0;t<1300&&e.state==='running';t++)e.update(.05);
  assert.equal(e.state,'finished');assert.equal(e.winners.length,3);
  assert.equal(eliminated.length,77);assert.equal(new Set(eliminated).size,77);
  assert.ok(e.winners.every(leaf=>!eliminated.includes(leaf.id)));
 }
});
test('invalid injected attack randomness fails explicitly',()=>{
 for(const n of [-1,14,NaN,0.5])assert.throws(()=>engine(()=>n).start(),/공격 난수 오류/);
});

test('every creature strike targets nearby leaves on the mouth side, including paired strikes',()=>{
 let bites=0;
 for(const duration of [45,60,90,120])for(const count of [3,20,80,300]){
  const game=new Engine();game.setAdminCheck(()=>true);
  game.reset(Array.from({length:count},(_,i)=>'P'+i),2,duration,true,3);
  game.onEvent=event=>{
   if(!event.actor||!event.targets.length)return;
   const hit=event.contact;assert.ok(hit);bites++;
   if(event.lane!=null){assert.equal(event.lane,Number(hit.x>=.5))}
   for(const leaf of event.origins){
    assert.equal(leaf.x>=.5,hit.x>=.5);
    assert.ok(((leaf.x-hit.x)/.26)**2+((leaf.y-hit.y)/.34)**2<=1);
   }
  };
  game.start();while(game.state==='running')game.update(.2);
  assert.equal(game.winners.length,2);
 }
 assert.ok(bites>0);
 // Forced pairing is also covered by the deterministic paired-creatures test.
});

test('otter chooses one route per strike',()=>{
 for(const [roll,route] of [[0,'mouth'],[1,'paw']]){
  let rolls=0;
  const game=engine(count=>count===14?12:(rolls++,roll));
  game.start();
  const event=game.event;
  assert.equal(event.actor,'otter');
  assert.equal(event.route,route);
  for(let i=0;i<90;i++)game.update(.05);
  assert.equal(event.route,route);
  assert.equal(rolls,1);
 }
});
