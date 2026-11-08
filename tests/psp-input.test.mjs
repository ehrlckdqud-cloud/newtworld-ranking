import assert from 'node:assert/strict';
import test from 'node:test';
import {insertCredit} from '../public/arcade-runtime/mslug6/game.mjs';
test('credit key updates the guest balance and refuses an unknown executable',()=>{
 const heap=new Uint8Array(0xa6e608+8);
 const text=new TextEncoder().encode('CPlayerProfile::setCreditMode invalid value specified');
 heap.set(text,0x9f53c0);
 const view=new DataView(heap.buffer);
 view.setUint32(0xa6e608,15,true);
 assert.equal(insertCredit(heap),false);
 heap.set([0x08,0xe6,0x63,0x8c,0x08,0x00,0xe0,0x03,0x2a,0x10,0x03,0x00],0x806ff8);
 for(let expected=16;expected<=99;expected++){assert.equal(insertCredit(heap),true);assert.equal(view.getUint32(0xa6e608,true),expected);}
 assert.equal(insertCredit(heap),true);assert.equal(view.getUint32(0xa6e608,true),99);
});
import {createKeyboard} from '../public/arcade-runtime/mslug6/keyboard.mjs';
test('rapid taps survive a stalled guest frame while either direction alias remains held',()=>{
 let frame=0,tick;
 const events=[];
 const keyboard=createKeyboard({frame:()=>frame,send:(id,value)=>events.push([frame,id,value]),schedule:fn=>{tick=fn;return 1;},cancel:()=>{tick=undefined;}});
 keyboard.change('KeyD',7,true);
 keyboard.change('ArrowRight',7,true);
 keyboard.change('KeyD',7,false);
 for(let i=0;i<2;i++){keyboard.change('KeyJ',1,true);keyboard.change('KeyJ',1,false);}
 tick();
 assert.deepEqual(events,[[0,7,1],[0,1,1]]);
 for(frame=1;frame<=6;frame++)tick();
 assert.deepEqual(events.slice(2),[[2,1,0],[4,1,1],[6,1,0]]);
 keyboard.reset();
 assert.ok(events.some(([,id,value])=>id===7&&value===0));
});
