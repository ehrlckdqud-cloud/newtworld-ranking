import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {InputSequencer,FrameQueue,INPUT_DELAY,stateHash} from '../coop/lockstep.mjs';
const source=readFileSync(new URL('../coop/play.mjs',import.meta.url),'utf8');
const loop=source.slice(source.indexOf('function applyCommand('),source.indexOf('\nrequestAnimationFrame(tick);'));
const legacy=readFileSync(new URL('./browser-fixtures/v85-frame-loop.js',import.meta.url),'utf8');
function simulate(count,old=false){
 let now=1;const events=[],clients=[],wireLast=new Map();
 function send(from,to,packet){const key=from+':'+to;const spike=from===count-1&&to===0&&now%2000>=700&&now%2000<810?110:0;const at=Math.max(now+12+spike,wireLast.get(key)||0);wireLast.set(key,at);events.push({at,to,from,packet});}
 for(let i=0;i<count;i++){
  const applied=[],records=[];const c={session:{slot:i+1},hostSlot:1,viewer:false,away:false,document:{hidden:false},performance:{now:()=>now},requestAnimationFrame(){},continueInputPending:false,bits:i+1,synced:true,syncFault:false,migrationBusy:false,playing:true,lastTick:0,clock:0,lastProgress:0,waitingNotice:false,frameQueue:new FrameQueue(),sequencer:null,peers:new Map(),hashes:new Map(),stateHash,INPUT_DELAY,module:{_nw_fps:()=>60},engine:{step(inputs){applied.push(Array.from(inputs));},ram:()=>new Uint8Array(),checkpoint:()=>({})},framePresentation:{begin(){},end(){}},diagnostics:{record:(type,data)=>records.push({type,...data})},note(){},recoverPeer(){throw Error('unexpected recovery');},stop(m){throw Error(m);},broadcastSync:m=>{for(let j=1;j<count;j++)send(0,j,m);},sendControl:m=>send(i,0,m)};
  vm.createContext(c);vm.runInContext(old?legacy:loop,c);clients.push({...c,context:c,applied,records});
 }
 const host=clients[0].context;
 host.sequencer=new InputSequencer({slots:clients.map((_,i)=>i+1),onFrame:p=>{host.frameQueue.receive(p);host.broadcastSync(p);}});
 for(let i=1;i<count;i++)host.peers.set(i+1,{synced:true,lastInputAt:1});
 for(now=1;now<=15000;now++){
  for(let k=0;k<events.length;){const e=events[k];if(e.at>now){k++;continue;}events.splice(k,1);if(e.packet.type==='input'){host.sequencer.submit(e.from+1,e.packet.frame,e.packet.bits);host.peers.get(e.from+1).lastInputAt=now;if(!old)host.sequencer.drain();}else if(e.packet.type==='frame')clients[e.to].context.frameQueue.receive(e.packet);}
  for(let i=0;i<count;i++)if((now-i*3)%17===0)clients[i].context.advanceGame(now);
 }
 const min=Math.min(...clients.map(c=>c.applied.length));for(const c of clients)assert.deepEqual(c.applied.slice(0,min),clients[0].applied.slice(0,min));
 return {frames:min,records:clients.flatMap(c=>c.records),clients};
}
for(let count=2;count<=5;count++)test(`${count} clients recover more elapsed frames under repeated ordered 110ms jitter without divergent inputs`,()=>{
 const old=simulate(count,true),current=simulate(count);assert(current.frames>old.frames+10,`${current.frames} vs ${old.frames}`);assert(current.records.some(e=>e.type==='input-missing'&&e.slot===count));assert(current.records.some(e=>e.type==='input-resumed'&&e.duration>=20));console.log(JSON.stringify({players:count,oldFrames:old.frames,newFrames:current.frames}));
});
test('a long outage never produces unbounded catch-up or guessed input',()=>{
 const {clients}=simulate(2);const c=clients[0].context,before=c.frameQueue.frame;c.frameQueue.pending.clear();c.sequencer.pending.clear();c.advanceGame(c.lastTick+10000);assert.equal(c.frameQueue.frame,before);assert(c.clock<=5*1000/60+.001);
});
test('actual data-channel handler releases a ready frame before the next animation callback',async()=>{
 const output=[],record={synced:true},sequencer=new InputSequencer({slots:[1,2],onFrame:p=>output.push(p)});sequencer.drain();sequencer.submit(1,INPUT_DELAY,0);
 const c={hostEpoch:0,hostSlot:1,session:{slot:1},peers:new Map([[2,record]]),sequencer,performance:{now:()=>100},diagnostics:{record(){}},note(){},recoverPeer(){throw Error('unexpected recovery');}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function bindControl('),source.indexOf('function broadcastChat(')),c);
 const channel={};c.bindControl(record,channel,2);await channel.onmessage({data:JSON.stringify({type:'input',frame:INPUT_DELAY,bits:16})});assert.equal(sequencer.frame,INPUT_DELAY+1);assert.equal(output.at(-1).inputs[1],16);
});
test('worker and animation callbacks cannot move the game clock backwards',()=>{
 const {clients}=simulate(2);const c=clients[0].context,last=c.lastTick;c.advanceGame(last-5);assert.equal(c.lastTick,last);
});
