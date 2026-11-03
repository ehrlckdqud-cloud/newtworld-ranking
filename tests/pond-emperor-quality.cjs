// Local browser check: real clip loader/decoder/rendering, mocked membership only.
// NODE_PATH=/workspace/newtworld-tools/node_modules NW_TEST_BASE=http://127.0.0.1:8010 node tests/pond-emperor-quality.cjs
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
 try {
  const context = await browser.newContext();
  await context.addInitScript(() => {localStorage.setItem('nwProfileToken','test-member');localStorage.setItem('nwProfileDevice','test-device');});
  await context.route('https://script.google.com/**', route => {
   const callback = new URL(route.request().url()).searchParams.get('callback');
   const data = {ok:true,auth:true,memberId:'test-member',kind:'member',avatars:[],images:[],profile:{nickname:'test',role:'일반'},config:{enabled:true,games:{pond:{price:200,public:true}}}};
   return route.fulfill({contentType:'text/javascript',body:callback ? `${callback}(${JSON.stringify(data)})` : '{}'});
  });
  const page = await context.newPage(), errors=[];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto((process.env.NW_TEST_BASE || 'http://127.0.0.1:8010')+'/draw/pond.html');
  await page.waitForFunction(() => globalThis.parcelRequirea0e5 && !document.querySelector('#pondRoot').hidden, null, {timeout:60000});
  const result = await page.evaluate(async () => {
   const {POND_CLIPS} = parcelRequirea0e5('dnmKA');
   const {PondClips} = parcelRequirea0e5('hUH9V');
   const clips = new PondClips();
   await clips.prepare();
   const canvas = document.createElement('canvas');canvas.width=960;canvas.height=540;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});
   const spec=POND_CLIPS.emperor;
   let drawn=0, maxDecoded=0, minOpaque=Infinity;
   for(let frame=0;frame<spec.frames;frame++) {
    const phase=frame/spec.frames;
    clips.setActive([{key:'emperor',phase}]);
    await clips.warm('emperor',Math.floor(frame/8));
    const bitmap=clips.decoded.get(spec.pages[Math.floor(frame/8)]).image;
    if(bitmap.width!==spec.width*4 || bitmap.height!==spec.height*2)throw Error('Incorrect atlas dimensions');
    ctx.clearRect(0,0,960,540);
    if(!clips.draw(ctx,'emperor',phase,0,0,960,540))throw Error('Missing frame '+frame);
    const data=ctx.getImageData(0,0,960,540).data;
    if(data[3]!==0)throw Error('Background not transparent');
    let opaque=0;for(let i=3;i<data.length;i+=4)if(data[i]>200)opaque++;
    minOpaque=Math.min(minOpaque,opaque);
    maxDecoded=Math.max(maxDecoded,clips.decoded.size);drawn++;
   }
   // Switching back to another attack must still decode and draw correctly.
   clips.setActive([{key:'marbled',phase:0}]);await clips.warm('marbled');
   const other=clips.draw(ctx,'marbled',0,0,0,960,540);
   for(const entry of clips.decoded.values())entry.image.close();
   return {drawn,maxDecoded,minOpaque,other,width:spec.width,height:spec.height,bytes:spec.bytes};
  });
  assert.equal(result.drawn,120);assert.equal(result.width,960);assert.equal(result.height,540);
  assert.ok(result.maxDecoded<=6);assert.ok(result.minOpaque>10000);assert.equal(result.other,true);
  assert.deepEqual(errors,[]);
  console.log('PASS: all 120 emperor frames decode/draw, transparent background, bounded cache, other attack switching',result);
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
