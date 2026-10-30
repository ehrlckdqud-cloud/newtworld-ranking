import test from 'node:test';import assert from 'node:assert/strict';
import {requestContinue} from '../coop/continue-request.mjs';
import {InputSequencer} from '../coop/lockstep.mjs';
test('one J request survives a stale server lifecycle without another keypress',async()=>{
 let calls=0,charges=0;
 const result=await requestContinue(async()=>{if(++calls<3)throw Error('CONTINUE_NOT_AVAILABLE');charges++;return {event:{commandId:1}};},{sleep:async()=>{}});
 assert.equal(result.event.commandId,1);assert.equal(calls,3);assert.equal(charges,1);
});
test('uncertain payment, insufficient credit and room changes never repeat a charge',async()=>{
 for(const message of ['The operation timed out.','PAID_COIN_REQUIRED','CONTINUE_PENDING']){
  let calls=0;await assert.rejects(requestContinue(async()=>{calls++;throw Error(message);},{sleep:async()=>{}}));assert.equal(calls,1);
 }
 let valid=true,calls=0;await assert.rejects(requestContinue(async()=>{calls++;throw Error('CONTINUE_NOT_AVAILABLE');},{valid:()=>valid,sleep:async()=>{valid=false;}}),/ROOM_CHANGED/);assert.equal(calls,1);
});
test('a departed seat can resume without stale input or stopping surviving seats during setup',()=>{
 const packets=[],s=new InputSequencer({slots:[1,2,3],onFrame:p=>packets.push(p)});
 s.submit(3,6,16);s.enqueue({type:'native-presence',id:1,slot:3,departed:true});s.drain();
 assert.equal(s.frame,6);s.submit(1,6,8);s.submit(2,6,0);s.drain();assert.equal(s.frame,7);
 s.resume(3);for(let f=7;f<13;f++){s.submit(1,f,0);s.submit(2,f,0);}s.drain();
 assert.equal(s.frame,13);assert(packets.every(p=>p.inputs[2]===0));
});

test('payment awaiting its HTTP response does not block movement; an open dialog does',async()=>{
 const {readFileSync}=await import('node:fs'),vm=await import('node:vm');
 const source=readFileSync(new URL('../coop/play.mjs',import.meta.url),'utf8').split('\n').find(line=>line.startsWith("window.addEventListener('keydown'"));
 let handler,modal=false;const context={window:{addEventListener:(_,fn)=>handler=fn},session:{slot:1},document:{querySelector:()=>modal?{}:null},viewer:false,chatOpen:false,completed:false,away:false,purchaseBusy:true,playing:true,keymap:{KeyD:8},bits:0};
 vm.runInNewContext(source,context);handler({key:'d',code:'KeyD',target:{tagName:'DIV'},preventDefault(){}});assert.equal(context.bits,8);
 context.bits=0;modal=true;handler({key:'d',code:'KeyD',target:{tagName:'DIV'},preventDefault(){}});assert.equal(context.bits,0);
});
