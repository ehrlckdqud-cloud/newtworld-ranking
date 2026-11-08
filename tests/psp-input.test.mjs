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
