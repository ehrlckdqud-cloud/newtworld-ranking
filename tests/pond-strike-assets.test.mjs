import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';

const source = readFileSync(new URL('../draw/pondApp.e4104cc4.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../draw/pond.html', import.meta.url), 'utf8');
const start = source.indexOf('const pondStrikes = ');
const end = source.indexOf('\nfunction strikePoint(', start);
assert.ok(start >= 0 && end > start, 'new strike configuration must exist');
const strikes = JSON.parse(source.slice(start + 'const pondStrikes = '.length, end).trim().replace(/;$/, ''));

const species = {
  tomatofrog: '양서류',
  snappingturtle2: '파충류',
  otter: '포유류',
  platypus: '포유류',
};

test('new strike species categories and legacy snapping turtle stay separate', () => {
  assert.deepEqual(Object.keys(strikes).sort(), Object.keys(species).sort());
  for (const [key, category] of Object.entries(species)) {
    assert.equal(strikes[key].category, category, key);
    assert.ok(strikes[key].mouth.every(v => v >= 0 && v <= 1), key);
  }
  assert.match(source, /snappingturtle:new URL\("\.\/snapping-turtle-v3\.webp"/);
  assert.match(source, /"snappingturtle","tomatofrog","snappingturtle2","otter","platypus"/);
  assert.match(source, /key==="snappingturtle"\?"파충류":"양서류"/);
  assert.match(html, /동물 12종/);
  assert.match(html, /12종 동물 영상/);
});

test('all four sprite-page bundles, preview images and original audio files are consistent', () => {
  for (const key of Object.keys(species)) {
    const clip = strikes[key];
    const data = readFileSync(new URL(`../draw/${key}-strike.bin`, import.meta.url));
    const preview = readFileSync(new URL(`../draw/${key}-strike.webp`, import.meta.url));
    const audio = readFileSync(new URL(`../draw/${key}-strike.wav`, import.meta.url));
    assert.ok(clip.frames > 0 && clip.contact >= 0 && clip.contact < clip.frames, key);
    assert.equal(clip.ranges.length, Math.ceil(clip.frames / 8), key);
    let pos = 0;
    for (const [offset, length] of clip.ranges) {
      assert.equal(offset, pos, `${key} page offsets must be contiguous`);
      assert.ok(length >= 12, key);
      assert.equal(data.toString('ascii', offset, offset + 4), 'RIFF', key);
      assert.equal(data.toString('ascii', offset + 8, offset + 12), 'WEBP', key);
      pos += length;
    }
    assert.equal(pos, data.length, `${key} page sizes must match actual binary`);
    assert.ok(preview.length > 12, key);
    assert.equal(preview.toString('ascii', 0, 4), 'RIFF', key);
    assert.equal(preview.toString('ascii', 8, 12), 'WEBP', key);
    assert.ok(audio.length > 44, key);
    assert.equal(audio.toString('ascii', 0, 4), 'RIFF', key);
    assert.equal(audio.toString('ascii', 8, 12), 'WAVE', key);
  }
});

test('otter supports separate mouth and paw contacts and an unbiased two-choice roll', () => {
  assert.ok(strikes.otter.paw.every(v => v >= 0 && v <= 1));
  assert.ok(strikes.otter.pawContact >= 0 && strikes.otter.pawContact < strikes.otter.frames);
  assert.match(source, /this\.attackIndex\(2\)===0\?"mouth":"paw"/);
  assert.match(source, /route==="paw"\?strike\.pawContact:strike\.contact/);
});

test('new creatures keep full-size contact poses even for edge targets', async () => {
 const vm=await import('node:vm');
 const start=source.indexOf('function d(e,t,i,n,r,route,event){',source.indexOf('i("aJ7wK"'));
 const end=source.indexOf('function c(e,event){',start);
 assert.ok(start>=0&&end>start);
 const smooth=(a,b,t)=>{const n=Math.max(0,Math.min(1,(t-a)/(b-a)));return n*n*(3-2*n)};
 const strikePoint=(key,route)=>route==='paw'&&strikes[key]?.paw?strikes[key].paw:strikes[key]?.mouth;
 const pose=vm.runInNewContext(source.slice(start,end)+';d',{pondStrikes:strikes,strikePoint,a:{smooth},o:{POND_CONTACT_PHASE:.72},s:{}});
 const margins=0.00001;
 for(const [width,height] of [[1600,850],[1600,1200],[720,900],[720,1300]]){
  for(const [key,clip] of Object.entries(strikes)){
   for(const route of key==='otter'?['mouth','paw']:[undefined]){
    const contact=((route==='paw'&&clip.pawContact!=null?clip.pawContact:clip.contact)+.5)/clip.frames;
    for(const nx of [.06,.15,.3,.5,.7,.85,.94]){
     for(const ny of [.1,.35,.5,.65,.9]){
      const target={x:70+nx*(width-140),y:200+ny*(height-365)};
      const p=pose(key,contact,width,height,target,route);
      assert.ok(p.x>=-margins&&p.y>=-margins&&p.x+p.width<=width+margins&&p.y+p.height<=height+margins,key+' contact in bounds');
      assert.ok(p.mouth.x>=0&&p.mouth.x<=width&&p.mouth.y>=0&&p.mouth.y<=height,key+' safe mouth');
      assert.ok(p.width>0&&p.height>0,key+' visible');
      const inLeft={...target,lane:0},inRight={...target,lane:1};
      const q=pose(key,contact,width,height,inLeft,route);
      const z=pose(key,contact,width,height,inRight,route);
      assert.ok(Math.abs(p.width-q.width)<margins&&Math.abs(p.width-z.width)<margins,key+' paired cannot shrink');
      assert.ok(q.x>=-margins&&q.x+q.width<=width+margins&&z.x>=-margins&&z.x+z.width<=width+margins,key+' pair in bounds');
     }
    }
   }
  }
 }
});

test('new strikes play at native 24fps and contain complete original WAV audio', async () => {
 const vm=await import('node:vm');
 const from=source.indexOf('function pondStrikeWindow('),to=source.indexOf('function pondGrid(',from);
 assert.ok(from>=0&&to>from);
 const clipWindow=vm.runInNewContext(source.slice(from,to)+';pondStrikeWindow',{pondStrikes:strikes});
 for(const duration of [45,60,90,120]){
  const rounds=duration===90?18:duration===120?24:12,roundSeconds=duration/rounds;
  for(const [key,clip] of Object.entries(strikes)){
   for(const route of key==='otter'?['mouth','paw']:[undefined]){
    const window=clipWindow(key,route,roundSeconds);
    const nativeLength=clip.frames/24;
    assert.ok(window.start>=0&&window.end<=1+1e-9,key);
    assert.equal(window.start,0,key);assert.equal(window.end,1,key);
    assert.ok(Math.abs((window.videoEnd-window.videoStart)*roundSeconds*Math.max(1,nativeLength/roundSeconds)-nativeLength)<1e-8,key);
    const strikeFrame=(route==='paw'&&clip.pawContact!=null?clip.pawContact:clip.contact)+.5;
    assert.ok(Math.abs((window.contact-window.videoStart)*roundSeconds*Math.max(1,nativeLength/roundSeconds)-strikeFrame/24)<1e-8,key);
    assert.ok(window.contact<=window.end,key);
   }
  }
 }
 for(const key of Object.keys(species)){
  const wave=readFileSync(new URL(`../draw/${key}-strike.wav`,import.meta.url));
  let offset=12,byteRate=0,dataLength=0;
  while(offset+8<=wave.length){
   const kind=wave.toString('ascii',offset,offset+4),bytes=wave.readUInt32LE(offset+4);
   if(kind==='fmt ')byteRate=wave.readUInt32LE(offset+16);
   if(kind==='data')dataLength=bytes;
   offset+=8+bytes+(bytes%2);
  }
  assert.ok(byteRate>0&&dataLength>0,key);
  assert.ok(Math.abs(dataLength/byteRate-strikes[key].frames/24)<.025,key+' original WAV length matches video');
 }
 assert.match(source,/n\.playbackRate=e\.native\?Math\.max\(1,Math\.min\(4,5\/t\)\):/);
 assert.match(source,/e\.native\?Math\.max\(0,e\.audioSeconds\)/);
 assert.match(source,/e\.strikeWindow=pondStrikeWindow\(e\.actor,e\.route,this\.duration\/this\.rounds\)/);
});

test('all creatures use the red-eye treefrog visual baseline in single and paired attacks', async () => {
 const vm=await import('node:vm');
 const from=source.indexOf('function d(e,t,i,n,r,route,event){',source.indexOf('i("aJ7wK"'));
 const to=source.indexOf('function c(e,event){',from);
 assert.ok(from>=0&&to>from);
 const smooth=(a,b,t)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x)};
 const strikePoint=(key,route)=>route==='paw'&&strikes[key]?.paw?strikes[key].paw:strikes[key]?.mouth;
 const mouths={treefrog:[.55,.34],pacman:[.55,.37],axolotl:[.66,.53],emperor:[.918,.50],marbled:[.89,.47],tiger:[.898,.52],snappingturtle:[.872,.448]};
 const pose=vm.runInNewContext(source.slice(from,to)+';d',{pondStrikes:strikes,strikePoint,a:{smooth},o:{POND_CONTACT_PHASE:.72},s:mouths});
 const keys=[...Object.keys(mouths),...Object.keys(strikes)];
 const factors={otter:1.34,tomatofrog:1.28,platypus:1.26,snappingturtle2:1.12};
 for(const [width,height] of [[1600,900],[720,900],[1600,1400]]){
  const baseline=pose('treefrog',.72,width,height,{x:width*.5,y:height*.55});
  for(const key of keys){
   const clip=strikes[key];
   const route=key==='otter'?'paw':undefined;
   const contact=clip?((route==='paw'&&clip.pawContact!=null?clip.pawContact:clip.contact)+.5)/clip.frames:.72;
   const target={x:width*.5,y:height*.55};
   const solo=pose(key,contact,width,height,target,route);
   for(const lane of [0,1]){
    const pair=pose(key,contact,width,height,{...target,lane},route);
    assert.ok(Math.abs(pair.width-solo.width)<1e-7,key+' paired same body width as solo');
    assert.ok(Math.abs(pair.height-solo.height)<1e-7,key+' paired same body height as solo');
    const start=pose(key,0,width,height,{...target,lane},route);
    assert.ok(lane===0?start.x< pair.x-1:start.x>pair.x+1,key+' enter from assigned '+(lane===0?'left':'right'));
   }
   const factor=factors[key]||1;
   assert.ok(Math.abs(solo.width/baseline.width-factor)<.02,key+' calibrated to frog reference');
  }
 }
 // Rough-skinned newt (poison event) also uses this same reference footprint.
 const pa=source.indexOf('function p(e,t,lane,anchor,phase=1){',source.indexOf('i("aJ7wK"'));
 const pb=source.indexOf('function u(e,t,i,n){',pa);
 assert.ok(pa>=0&&pb>pa);
 const poison=vm.runInNewContext(source.slice(pa,pb)+';p',{a:{smooth}});
 for(const [width,height] of [[1600,900],[720,900]]){
  const anchor={x:width*.5,y:height*.55},single=poison(width,height,null,anchor,1);
  const reference=pose('treefrog',.72,width,height,anchor);
  assert.ok(Math.abs(single.width-reference.width)<1e-7,'poison is also frog-sized');
  for(const lane of [0,1]){
   const paired=poison(width,height,lane,anchor,1);
   assert.equal(paired.width,single.width,'poison does not shrink in simultaneous attack');
   const start=poison(width,height,lane,anchor,0);
   assert.ok(lane===0?start.x<paired.x:start.x>paired.x,'poison enters from correct side');
  }
 }
});

test('ultrawide desktop and compact mobile use full canvas width without green side bars', () => {
 const start=source.indexOf('get logical(){'),end=source.indexOf('update(e){',start);
 assert.ok(start>=0&&end>start);
 const code=source.slice(start,end).replace(/^get logical\(\)\{/,'function view(){').replace(/\}$/,'}');
 for(const [width,height] of [[2560,1080],[3440,1440],[1920,1080],[1366,768],[360,800],[390,844],[720,900]]){
  const view=Function('innerWidth','innerHeight',code+';return view()')(width,height);
  assert.ok(Math.abs(view.width/view.height-width/height)<1e-9,'full-view aspect '+width+'x'+height);
 }
});
test('new actors remain drawable from announcement through departure, including otter frame fallback', async () => {
 const from=source.indexOf('actor(e,t,i,n,o=!1){'),to=source.indexOf('poisonActor(',from);
 assert.ok(from>=0&&to>from);
 const actor=source.slice(from,to);
 assert.ok(!actor.includes('if(native&&(phase<0||phase>=1))return'));
 assert.match(actor,/preview=this\.art\.get\(a\.key\)/);
 assert.match(actor,/visible=this\.clips\.draw/);
 assert.match(source,/!pondStrikes\[t\]&&this\.art\.images\.delete\(t\)/);
 const vm=await import('node:vm');
 const start=source.indexOf('function pondStrikeWindow('),end=source.indexOf('function pondGrid(',start);
 const timeline=vm.runInNewContext(source.slice(start,end)+';pondStrikeWindow',{pondStrikes:strikes});
 const sourcePhaseStart=source.indexOf('function h(e,t,route,event){',source.indexOf('i("aJ7wK"'));
 const sourcePhaseEnd=source.indexOf('function l(e,t,route){',sourcePhaseStart);
 assert.ok(sourcePhaseStart>=0&&sourcePhaseEnd>sourcePhaseStart);
 const phase=vm.runInNewContext(source.slice(sourcePhaseStart,sourcePhaseEnd)+';h',{
  o:{POND_CONTACT_PHASE:.72,POND_POISON_CONTACT_PHASE:.32},a:{clamp:x=>Math.min(1,Math.max(0,x))},r:()=>.5
 });
 for(const duration of [45,60,90,120]){
  const seconds=duration===45?45/12:5;
  for(const key of Object.keys(strikes)){
   const route=key==='otter'?'paw':undefined;
   const window=timeline(key,route,seconds),event={strikeWindow:window};
   assert.ok(window.videoStart>=0&&window.videoEnd<=1,key);
   assert.equal(phase(window.videoStart-.00001,key,route,event),-1,key+' approach before video');
   assert.ok(phase((window.videoStart+window.videoEnd)/2,key,route,event)>.45);
   assert.equal(phase(window.videoEnd,key,route,event),1,key+' retreat after video');
  }
 }
});

test('otter is drawn before and after its short source clip, even when a sprite page is decoding', async()=>{
 const vm=await import('node:vm');
 const from=source.indexOf('actor(e,t,i,n,o=!1){');
 const to=source.indexOf('poisonActor(',from);
 assert.ok(from>=0&&to>from);
 const code='({'+source.slice(from,to)+'})';
 for(const phase of [.03,.23,.55,.92]){
  for(const route of ['mouth','paw']){
   let decoded=false,fallback=0;
   const pose={actor:{key:'otter'},presence:1,bite:0,size:400,x:100,y:100,mouth:{x:300,y:300}};
   const smooth=x=>x;
   const method=vm.runInNewContext(code,{
    l:{actorPose:()=>pose,pondPhase:()=>phase,smooth},
    h:{sampleAttackPhase:()=>phase<.25?-1:phase>.75?1:.5,attackPose:()=>({presence:1,flip:false,x:20,y:30,width:180,height:90})},
   }).actor;
   const canvas={globalAlpha:1,save(){},restore(){},drawImage(){fallback++}};
   const renderer={
    clips:{ready:true,draw(){return decoded}},
    art:{get:()=>({naturalWidth:960,naturalHeight:540})},
    anchor:()=>({x:400,y:400}),clock:0,actorOffset:0
   };
   const state={event:{route,strikeWindow:{videoStart:.25,videoEnd:.75}},events:[]};
   method.call(renderer,canvas,state,1600,900,false);
   assert.equal(fallback,1,'fallback for missing otter page at '+phase+' '+route);
   decoded=true;fallback=0;
   method.call(renderer,canvas,state,1600,900,false);
   assert.equal(fallback,0,'decoded video should not draw preview');
  }
 }
});
