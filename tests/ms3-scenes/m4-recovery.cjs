const fs=require('fs'),assert=require('assert/strict'),harness=require('./harness.cjs');
(async()=>{const h=await harness.create(5),{e}=h;h.scene(3,7);for(let f=0;f<600;f++)e.step(h.zero);const base=h.save(),repair=e.repairActiveOwners.bind(e),rows=[];
for(const mode of ['healthy','broken','repaired']){h.restore(base);if(mode!=='healthy')e.ww(e.x.actors[1]+0x6c,0);e.repairActiveOwners=mode==='broken'?()=>{}:repair;const start=e.x.actors.map(a=>e.word(a+0x28));for(let f=0;f<120;f++){for(let i=0;i<5;i++)e.ww(e.x.actors[i]+0x84,120);e.step([8,4,0,0,0]);}rows.push({mode,start,x:e.x.actors.map(a=>e.word(a+0x28)),owners:e.x.actors.map(a=>e.word(a+0x6c)),state:h.save().data});}
assert.notDeepEqual(rows[0].x,rows[1].x);assert.deepEqual(rows[0].x,rows[2].x);assert.deepEqual(rows[2].owners,[0,1,2,3,4]);
for(let slot=0;slot<5;slot++){h.restore(base);e.ww(e.x.actors[slot]+0x6c,(slot+1)%5);e.step(h.zero);assert.equal(e.word(e.x.actors[slot]+0x6c),slot);}
const result=rows.map(({state,...row})=>row);console.log(result);fs.writeFileSync('evidence/m4-recovery.json',JSON.stringify(result));h.m._nw_close();})().catch(e=>{console.error(e);process.exitCode=1});
