// Local browser check: real clip loader/decoder/rendering, mocked membership only.
// NODE_PATH=/workspace/newtworld-tools/node_modules NW_TEST_BASE=http://127.0.0.1:8010 node tests/pond-emperor-quality.cjs
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 try {
  const context = await browser.newContext();
  await context.addInitScript(() => {localStorage.setItem('nwProfileToken','test-member');localStorage.setItem('nwProfileDevice','test-device');});
  await context.route('https://script.google.com/**', route => {
   const callback = new URL(route.request().url()).searchParams.get('callback');
   const data = {ok:true,auth:true,memberId:'test-member',kind:'member',avatars:[],images:[],profile:{nickname:'test',role:'일반'},config:{enabled:true,games:{pond:{price:200,public:true}}}};
   return route.fulfill({contentType:'text/javascript',body:callback ? `${callback}(${JSON.stringify(data)})` : '{}'});
  });
  for(const route of ['/draw/index.html','/draw/pond.html']) {
   for(const blocked of [false,true]) {
    const page=await context.newPage();
    await page.addInitScript(blocked=>{
     const original=HTMLMediaElement.prototype.play;
     window.__musicAttempts=0;window.__musicPlayers=[];
     HTMLMediaElement.prototype.play=function(){
      if(this.src.includes('/game-defaults/media/')){
       window.__musicAttempts++;if(!window.__musicPlayers.includes(this))window.__musicPlayers.push(this);
       if(blocked&&window.__musicAttempts===1)return Promise.reject(new DOMException('Test blocked autoplay','NotAllowedError'));
      }
      return original.call(this);
     };
    },blocked);
    await page.goto((process.env.NW_TEST_BASE||'http://127.0.0.1:8010')+route);
    await page.waitForFunction(()=>window.__musicAttempts>0,null,{timeout:60000});
    if(blocked){await page.waitForFunction(()=>document.querySelector('#musicPower').getAttribute('aria-pressed')==='false');await page.mouse.click(10,10);}
    await page.waitForFunction(()=>window.__musicPlayers.some(p=>!p.paused&&p.currentTime>0),null,{timeout:20000});
    assert.equal(await page.locator('#musicPower').getAttribute('aria-pressed'),'true');
    await page.locator('#musicPower').click();
    await page.locator('body').click({position:{x:5,y:5}});
    assert.equal(await page.locator('#musicPower').getAttribute('aria-pressed'),'false');
    assert.equal(await page.evaluate(()=>window.__musicPlayers.every(p=>p.paused)),true);
    if(route.includes('index'))assert.match(await page.title(),/생존핀볼/);
    await page.close();
   }
  }
  console.log('PASS: pinball/pond audible entry autoplay, blocked-autoplay gesture recovery, manual off preserved, pinball title');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
