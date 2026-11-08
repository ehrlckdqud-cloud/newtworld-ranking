import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('PSP stereo stream absorbs irregular frame delivery without clipping or dropping a rendering quantum',()=>{
 let Processor;
 vm.runInNewContext(readFileSync(new URL('../public/arcade-runtime/mslug6/audio-worklet.mjs',import.meta.url),'utf8'),{
  AudioWorkletProcessor:class{},sampleRate:44100,registerProcessor:(_,ctor)=>{Processor=ctor;}
 });
 const capacity=32768,target=5645,shared=new SharedArrayBuffer(32+capacity*8);
 const state=new Int32Array(shared,0,8),pcm=new Float32Array(shared,32);
 const node=new Processor({processorOptions:{capacity,target,shared}});
 let written=0;
 function supply(n){
  for(let i=0;i<n;i++){const j=(written&(capacity-1))*2;pcm[j]=Math.sin(written*.063)*.6;pcm[j+1]=pcm[j]*.5;written++;}
  Atomics.store(state,0,written);
 }
 supply(target);let peak=0;
 for(let q=0;q<2000;q++){
  // Deliver 98% of real time in chunks every 4 render quanta.
  if(q%4===0)supply(502);
  const ch=[new Float32Array(128),new Float32Array(128)];node.process([], [ch]);
  for(let i=0;i<128;i++){peak=Math.max(peak,Math.abs(ch[0][i]));assert.ok(Math.abs(ch[0][i]/2-ch[1][i])<1e-6);}
 }
 assert.equal(state[2],0);assert.equal(state[3],256000);assert.ok(state[4]>0);
 assert.ok(peak>.55 && peak<.61);
 for(let i=0;i<160;i++)node.process([],[[new Float32Array(128),new Float32Array(128)]]);
 assert.equal(state[2],1);assert.equal(state[0],state[1]);
});
