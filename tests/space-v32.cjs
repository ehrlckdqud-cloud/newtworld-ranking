const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {NativeMedia,SpaceAudio}=await import('../draw/space-media.js'),m=new NativeMedia;m.deathData=JSON.parse(fs.readFileSync('draw/space-assets/rocket-death-v30.json'));m.warningData={seconds:1.6};m.deathImage={};
 function render(tick){const draws=[],ctx={save(){},restore(){},translate(){},scale(){},drawImage(...a){draws.push(a)}};m.drawExplorerDeath(ctx,{death:0,dx:0,dy:0},1.6+(tick+.01)/60,24);return draws.slice(1);}
 function centers(draws){return draws.map(a=>{const f=m.deathData.clips['rocket-flare'].find(f=>f.rect.every((n,i)=>n===a[i+1]));assert(f);return [a[5]-f.left,a[6]-f.top];});}
 const early=centers(render(1)),later=centers(render(5));assert.equal(early.length,8);assert.equal(later.length,24);for(const xy of early)assert(later.some(p=>p[0]===xy[0]&&p[1]===xy[1]),'earlier burst stays fixed while child bursts extend the chain');
 for(const [vx,vy,count]of m.deathData.rays)for(let g=0;g<=Math.min(count,5);g++)assert(later.some(p=>p[0]===g*vx&&p[1]===g*vy+2*g*(g-1)));
 const audio=new SpaceAudio({data:{sounds:{warning:{duration:1.6,latency:0}}}});audio.add({kind:'sound',id:'w',sound:'warning',at:2,gain:.5,fullPlayback:true});assert.equal(audio.events[0].gain,.5);assert.equal(audio.events[0].fullPlayback,true);
 const source=fs.readFileSync('draw/space-original.js','utf8');assert(source.includes("sound:'rocket-warning',at:time,gain:.5"));assert(source.includes("sound:'rocket-death',at:time+(media.warningData?.seconds??1.6),priority:true"));
 console.log('v32: stationary sequential bursts in all four directions; warning-only half gain; full playback and explosion gain preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
