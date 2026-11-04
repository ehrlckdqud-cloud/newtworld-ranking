// Local browser check: real clip loader/decoder/rendering, mocked membership only.
// NODE_PATH=/workspace/newtworld-tools/node_modules NW_TEST_BASE=http://127.0.0.1:8010 node tests/pond-snapping-turtle.cjs
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
   const spec=POND_CLIPS.snappingturtle;
   let drawn=0, maxDecoded=0, minOpaque=Infinity;
   for(let frame=0;frame<spec.frames;frame++) {
    const phase=frame/spec.frames;
    clips.setActive([{key:'snappingturtle',phase}]);
    await clips.warm('snappingturtle',Math.floor(frame/8));
    const bitmap=clips.decoded.get(spec.pages[Math.floor(frame/8)]).image;
    if(bitmap.width!==spec.width*4 || bitmap.height!==spec.height*2)throw Error('Incorrect atlas dimensions');
    ctx.clearRect(0,0,960,540);
    if(!clips.draw(ctx,'snappingturtle',phase,0,0,960,540))throw Error('Missing frame '+frame);
    const data=ctx.getImageData(0,0,960,540).data;
    if(data[3]!==0)throw Error('Background not transparent');
    if(frame===79){
     if(data[(242*960+830)*4+3]!==0)throw Error('Blue gap inside jaws must be transparent');
     for(const [x,y] of [[830,256],[825,255],[840,259],[840,215]])if(data[(y*960+x)*4+3]!==255)throw Error('Tongue or jaw tissue was removed');
    }
    let opaque=0;for(let i=3;i<data.length;i+=4)if(data[i]>200){opaque++;if(data[i-1]>Math.max(data[i-2],data[i-3])+20)throw Error("Blue screen spill remains");}
    minOpaque=Math.min(minOpaque,opaque);
    maxDecoded=Math.max(maxDecoded,clips.decoded.size);drawn++;
   }
   // Switching back to another attack must still decode and draw correctly.
   clips.setActive([{key:'marbled',phase:0}]);await clips.warm('marbled');
   const other=clips.draw(ctx,'marbled',0,0,0,960,540);
   const {PondEngine}=parcelRequirea0e5('9jwWe');
   const {AMPHIBIANS}=parcelRequirea0e5('5IrmI');
   const {attackPose,sampleAttackPhase,attackPull}=parcelRequirea0e5('aJ7wK');
   if(AMPHIBIANS.find(a=>a.key==='snappingturtle')?.name!=='늑대거북')throw Error('Missing turtle identity');
   if(Math.abs(sampleAttackPhase(.72,'snappingturtle')-.66)>1e-9)throw Error('Incorrect bite timing');
   for(const x of [300,1000]){
    const pose=attackPose('snappingturtle',.72,1280,900,{x,y:450});
    if(Math.abs(pose.mouth.x-x)>1e-6||Math.abs(pose.mouth.y-450)>1e-6||attackPull(.72)!==1)throw Error('Mouth suction does not meet contact anchor');
   }
   const engine=new PondEngine(()=>0,()=>9);engine.setAdminCheck(()=>true);
   engine.reset(Array.from({length:20},(_,i)=>'Member '+i),2,60,false);engine.start();
   if(engine.event.actor!=='snappingturtle'||engine.event.kind!=='frog')throw Error('Turtle not in bite attack pool');
   const audio=new Audio(spec.audio);await new Promise((resolve,reject)=>{audio.onloadedmetadata=resolve;audio.onerror=reject;audio.load();});
   if(Math.abs(audio.duration-5)>.15)throw Error('Attack audio does not match 5-second normalized timeline');
   const {PondRenderer}=parcelRequirea0e5('4ILFo');
   const preview=document.createElement('canvas');preview.id='turtlePreview';preview.style.cssText='position:fixed;inset:0;z-index:99999;width:100vw;height:100vh';document.body.append(preview);
   const renderer=new PondRenderer(preview);await renderer.prepare();renderer.clips=clips;
   await clips.warm('snappingturtle',9);
   engine.elapsed=3.58;engine.animationTime=3.58;renderer.render(engine,performance.now());
   window.__turtlePreview={engine,renderer,clips};
   return {drawn,maxDecoded,minOpaque,other,width:spec.width,height:spec.height,bytes:spec.bytes};
  });
  assert.equal(result.drawn,120);assert.equal(result.width,960);assert.equal(result.height,540);
  assert.ok(result.maxDecoded<=6);assert.ok(result.minOpaque>10000);assert.equal(result.other,true);
  await page.locator('#turtlePreview').screenshot({path:process.env.NW_TURTLE_SCREENSHOT||'/tmp/pond-turtle-preview.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: all 120 snapping turtle frames decode/draw, transparent background, bounded cache, other attack switching',result);
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
