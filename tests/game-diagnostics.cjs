const assert=require('node:assert/strict');
(async()=>{
 const {createGameDiagnostics}=await import('../coop/game-diagnostics.mjs');
 const ram=new Uint8Array(65536),ww=(a,v)=>{ram[a&65535]=v&255;ram[(a+1)&65535]=v>>>8&255},wl=(a,v)=>{ww(a,v>>>16);ww(a+2,v)},wb=(a,v)=>ram[(a&65535)^1]=v;
 const a=0x1004fc;wl(a,0x123456);wl(a+4,a);wl(a+8,a);wl(a+0x38,0x10065c);ww(a+0x28,65520);ww(a+0x3c,120);ww(a+0x40,250);wb(0x10040c,2);wb(0x10040d,4);wb(0x10ed86,3);
 let now=0;const d=createGameDiagnostics({now:()=>now}),e={phase:'playing',frame:100,playerCount:2,x:{actors:[a,0x1005ac,0x1051fc,0x104fec,0x104ddc]},players:[{state:'active',participating:true,lives:3}],ram:()=>ram};
 const before=ram.slice();d.capture(e);let r=d.report();assert.equal(r.samples.length,1);assert.equal(r.samples[0].mission,2);assert.equal(r.samples[0].objects.length,1);assert.equal(r.samples[0].players[0].localX,-16);assert.equal(r.samples[0].players[0].screenX,120);assert.equal(r.samples[0].players[0].parent,0x10065c);assert.deepEqual(ram,before);
 now=1000;d.capture(e);assert.equal(d.report().samples.length,1);d.capture(e,{force:true});assert.equal(d.report().samples.length,2);
 r.samples[0].players[0].screenX=999;assert.equal(d.report().samples[0].players[0].screenX,120);
 for(let i=0;i<40;i++){now+=2000;e.frame++;d.capture(e);}assert.equal(d.report().samples.length,30);
 e.frame=1;d.capture(e);assert.equal(d.report().samples.length,1);
 d.capture({...e,ram:()=>{throw Error('unavailable')}});assert.equal(d.report().error,'native-state-unavailable');
 d.capture(null);assert.deepEqual(ram,before);
 const {createDiagnostics}=await import('../coop/diagnostics.mjs');
 const perf=createDiagnostics();perf.sample({frame:10,token:'secret',name:'private'});assert.equal(perf.report().version,89);assert.equal(perf.report().samples[0].token,undefined);assert.equal(perf.report().samples[0].name,undefined);
 console.log('PASS native positions/parent/state, no RAM writes, sampling limit, forced capture, isolated copies, reset, error containment, diagnostic privacy');
})().catch(e=>{console.error(e);process.exitCode=1});
