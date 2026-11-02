import assert from 'node:assert/strict';
import {createFrameBudget} from '../coop/frame-budget.mjs';
import {FrameQueue} from '../coop/lockstep.mjs';
let time=0;
const budget=createFrameBudget({now:()=>time});
const queue=new FrameQueue();
for(let frame=0;frame<20;frame++)queue.receive({type:'frame',frame,inputs:[frame%128,0,0,0,0],commands:frame===7?[{commandId:42}]:[]});
const executed=[],commands=[],batches=[];
while(queue.pending.size){budget.begin();let count=0;while(budget.take()){const p=queue.take();if(!p)break;executed.push(p.frame);commands.push(...p.commands);time+=12;count++;}batches.push(count);time+=1;}
assert.deepEqual(executed,Array.from({length:20},(_,i)=>i));
assert.deepEqual(commands,[{commandId:42}]);
assert.ok(batches.every(n=>n===1),'12ms frames must yield instead of blocking for five frames (60ms)');
budget.begin();let fast=0;while(budget.take()){time+=1;fast++;}assert.equal(fast,5);
budget.begin();assert.equal(budget.take(),true);time+=100;assert.equal(budget.take(),false);
budget.begin();assert.equal(budget.take(),true,'a slow previous batch cannot starve the next frame');
console.log('PASS: slow catch-up yields; fast catch-up bounded; all frames and paid commands preserved exactly once');
