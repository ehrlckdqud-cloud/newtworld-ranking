import test from 'node:test';
import assert from 'node:assert/strict';
import {createFramePresentation} from '../coop/frame-presentation.mjs';
test('catch-up preserves transition observations while presenting only the final frame',()=>{
 const observed=[],visible=[];let latest;
 const renderer=createFramePresentation(frame=>{observed.push(frame);latest=frame;},()=>visible.push(latest));
 renderer.begin();for(const frame of ['playing','results-intro','results','results','results'])renderer.video(frame);renderer.end();
 assert.equal(observed.length,5);assert.deepEqual(visible,['results']);
 renderer.video('credits');assert.deepEqual(visible,['results','credits']);
 renderer.begin();renderer.end();assert.equal(visible.length,2);
});
test('nested batches flush once after unwinding, including a failed simulation step',()=>{
 let presents=0;const renderer=createFramePresentation(()=>{},()=>presents++);
 renderer.begin();try{renderer.begin();try{renderer.video();throw Error('simulation');}finally{renderer.end();}}catch{}finally{renderer.end();}
 assert.equal(presents,1);renderer.video();assert.equal(presents,2);
});
