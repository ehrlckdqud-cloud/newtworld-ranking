import test from 'node:test';import assert from 'node:assert/strict';import {drawFiveContinue} from '../coop/native-selection.mjs';
test('five continue prompts use native two-row palette-4 tiles only in the top HUD',()=>{
 const calls=[],rects=[],ctx={save(){},restore(){},fillRect(...a){rects.push(a);}},module={HEAPU8:new Uint8Array(256).fill(255),_nw_glyph(t,p){calls.push([t,p]);return 0;},_nw_fps:()=>60};
 const engine={phase:'playing',frame:100,playerCount:5,players:Array.from({length:5},()=>({state:'continue',deadline:700}))};drawFiveContinue(ctx,module,engine,[]);
 assert.equal(calls.filter(([t,p])=>t===0xa83&&p===4).length,5);assert.equal(calls.filter(([t,p])=>t===0xa69&&p===4).length,5);assert.equal(calls.filter(([t,p])=>t===0xa79&&p===4).length,5);
 assert.ok(rects.every(([x,y,w,h])=>x>=0&&x+w<=300&&y>=0&&y+h<=20));
 calls.length=0;engine.frame=640;drawFiveContinue(ctx,module,engine,[]);assert.equal(calls.filter(([t,p])=>t===0xa60&&p===4).length,5);
 calls.length=0;engine.nativeContinue=true;drawFiveContinue(ctx,module,engine,[]);assert.equal(calls.length,0);
});
