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

test('new strike frames stay on-screen while the contact point stays on the actual target', async () => {
  const vm = await import('node:vm');
  const from = source.indexOf('function d(e,t,i,n,r,route){', source.indexOf('i("aJ7wK"'));
  const to = source.indexOf('function c(e,', from);
  assert.ok(from >= 0 && to > from);
  const smooth = (a, b, t) => {
    const n = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return n * n * (3 - 2 * n);
  };
  const strikePoint = (key, route) => route === 'paw' && strikes[key]?.paw ? strikes[key].paw : strikes[key]?.mouth;
  const pose = vm.runInNewContext(source.slice(from, to) + ';d', {
    pondStrikes: strikes, strikePoint, a: {smooth}, o: {POND_CONTACT_PHASE: .72}, s: {},
  });
  for (const [width, height] of [[1600, 850], [1600, 1200], [720, 900], [720, 1300]]) {
    for (const key of Object.keys(species)) {
      for (const nx of [.06, .15, .3, .5, .7, .85, .94]) {
        for (const ny of [.1, .35, .5, .65, .9]) {
          const target = {x: 70 + nx * (width - 140), y: 200 + ny * (height - 365)};
          for (const phase of [0, .25, .72, 1]) {
            const p = pose(key, phase, width, height, target, key === 'otter' ? 'paw' : undefined);
            const epsilon = 0.00001;
            assert.ok(p.x >= -epsilon && p.y >= -epsilon && p.x + p.width <= width + epsilon && p.y + p.height <= height + epsilon,
              `${key} clip bounds ${width}x${height} phase=${phase}`);
            if (phase === .72) {
              assert.ok(Math.abs(p.mouth.x - target.x) < epsilon, key);
              assert.ok(Math.abs(p.mouth.y - target.y) < epsilon, key);
            }
          }
        }
      }
      for (const lane of [0, 1]) {
        for (const nx of lane === 0 ? [.1, .25, .4] : [.6, .75, .9]) {
          const target = {x: 70 + nx * (width - 140), y: 200 + .7 * (height - 365), lane};
          const p = pose(key, .72, width, height, target, key === 'otter' ? 'paw' : undefined);
          assert.ok(p.x >= -0.001 && p.y >= -0.001 && p.x + p.width <= width + .001 && p.y + p.height <= height + .001, key);
          assert.ok(Math.abs(p.mouth.x - target.x) < .001 && Math.abs(p.mouth.y - target.y) < .001, key);
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
    assert.ok(Math.abs((window.end-window.start)*roundSeconds-nativeLength)<1e-8,key);
    const strikeFrame=(route==='paw'&&clip.pawContact!=null?clip.pawContact:clip.contact)+.5;
    assert.ok(Math.abs((window.contact-window.start)*roundSeconds-strikeFrame/24)<1e-8,key);
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
 assert.match(source,/n\.playbackRate=e\.native\?1:/);
 assert.match(source,/e\.native\?Math\.max\(0,e\.audioSeconds\)/);
 assert.match(source,/e\.strikeWindow=pondStrikeWindow\(e\.actor,e\.route,this\.duration\/this\.rounds\)/);
});

test('new species approach from left or right before contact, including two-creature attacks', async () => {
 const vm=await import('node:vm');
 const start=source.indexOf('function d(e,t,i,n,r,route){',source.indexOf('i("aJ7wK"')),end=source.indexOf('function c(e',start);
 assert.ok(start>=0&&end>start);
 const smooth=(a,b,t)=>{const p=Math.max(0,Math.min(1,(t-a)/(b-a)));return p*p*(3-2*p)};
 const strikePoint=(key,route)=>route==='paw'&&strikes[key]?.paw?strikes[key].paw:strikes[key]?.mouth;
 const pose=vm.runInNewContext(source.slice(start,end)+';d',{pondStrikes:strikes,strikePoint,a:{smooth},o:{POND_CONTACT_PHASE:.72},s:{}});
 for(const [width,height] of [[1600,900],[720,1000]]){
  for(const [key,clip] of Object.entries(strikes)){
   for(const route of key==='otter'?['mouth','paw']:[undefined]){
    const at=((route==='paw'&&clip.pawContact!=null?clip.pawContact:clip.contact)+.5)/clip.frames;
    for(const targetX of [.2,.5,.8]){
     const target={x:70+targetX*(width-140),y:200+.6*(height-365)};
     const entrance=pose(key,0,width,height,target,route),impact=pose(key,at,width,height,target,route);
     assert.ok(Math.abs(entrance.x-impact.x)>5,`${key} must approach target, not pop into place`);
     assert.ok(Math.abs(impact.mouth.x-target.x)<.001&&Math.abs(impact.mouth.y-target.y)<.001,key);
     for(const p of [entrance,impact]){
      assert.ok(p.x>=-1e-5&&p.x+p.width<=width+1e-5&&p.y>=-1e-5&&p.y+p.height<=height+1e-5,key);
     }
    }
    for(const lane of [0,1]){
     const target={x:width*(lane===0?.25:.75),y:height*.6,lane};
     const enter=pose(key,0,width,height,target,route),hit=pose(key,at,width,height,target,route);
     assert.ok(Math.abs(enter.x-hit.x)>1,`${key} paired side entrance`);
     assert.ok(hit.x>=-1e-5&&hit.x+hit.width<=width+1e-5,key);
    }
   }
  }
 }
});
