const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 try{
 const context=await browser.newContext({viewport:{width:1280,height:900}});let starts=[],supported=true,requests=[];
 await context.addInitScript(()=>{if(location.origin!=='http://127.0.0.1:8010')return;localStorage.setItem('nwProfileToken','test-member');localStorage.setItem('nwProfileDevice','test-device')});
 await context.route('**/pondApp.e4104cc4.js*',async route=>{const r=await route.fetch();let body=await r.text();body=body.replace('P=new(0,h.PondEngine)','P=window.__pondEngine=new(0,h.PondEngine)').replace('M=new(0,l.PondRenderer)(y)','M=window.__pondRenderer=new(0,l.PondRenderer)(y)');await route.fulfill({response:r,body})});
 await context.route('https://script.google.com/**',async route=>{
  const req=route.request(),u=new URL(req.url()),callback=u.searchParams.get('callback');
  if(req.method()==='POST'){
   const p=JSON.parse(new URLSearchParams(req.postData()).get('payload'));starts.push(p);
   return route.fulfill({contentType:'text/html; charset=utf-8',body:`<script>parent.postMessage(${JSON.stringify({channel:'nw-content',nonce:p.nonce,result:{ok:true,run:{game:p.game,course:p.course,cost:p.expectedCost}}})},'*')</script>`});
  }
  const result={ok:true,auth:true,memberId:'member:one',kind:'member',avatars:[],images:[],profile:{nickname:'테스트',role:'일반'},config:{enabled:true,games:{pond:{price:200,public:true}},courses:{'pond:default':200,...(supported?{'pond:90':300,'pond:120':300}:{})}}};
  await route.fulfill({contentType:'text/javascript',body:callback?`${callback}(${JSON.stringify(result)})`:'{}'});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('[pond]'))errors.push(m.text())});page.on('request',r=>requests.push(r.url()));
 await page.goto('http://127.0.0.1:8010/draw/pond.html');await page.waitForFunction(()=>window.__pondEngine&&!document.querySelector('#pondRoot').hidden,null,{timeout:60000});
 await page.fill('#pondNames',Array.from({length:20},(_,i)=>'회원'+i).join('\n'));await page.fill('#pondKeep','1');await page.uncheck('#pondRecord');
 assert.equal(await page.locator('#pondReviveRow').isVisible(),false);assert.equal(await page.locator('#pondStart .nw-start-cost').textContent(),'200');assert.equal(requests.some(u=>u.includes('/revival/')),false);
 await page.selectOption('#pondDuration','90');await page.fill('#pondRevive','3');await page.waitForFunction(()=>document.querySelector('#pondStart .nw-start-cost').textContent==='300');
 assert.equal(await page.locator('#pondReviveRow').isVisible(),true);await page.reload();await page.waitForFunction(()=>window.__pondEngine&&!document.querySelector('#pondRoot').hidden);assert.equal(await page.inputValue('#pondDuration'),'90');assert.equal(await page.inputValue('#pondRevive'),'3');await page.uncheck('#pondRecord');
 await page.click('#pondStart');await page.locator('.nw-dialog[open]').waitFor({timeout:60000});assert.equal(await page.locator('.nw-dialog .nw-gem-amount').innerText(),'300');await page.locator('.nw-dialog button').filter({hasText:'취소'}).click();assert.equal(starts.length,0);await page.waitForFunction(()=>!document.querySelector('#pondStart').disabled);
 await page.click('#pondStart');await page.locator('.nw-dialog[open] [type=submit]').click();await page.waitForFunction(()=>__pondEngine.state==='running',null,{timeout:30000});assert.equal(starts.length,1);assert.equal(starts[0].course,'90');assert.equal(starts[0].expectedCost,300);assert.equal(await page.locator('#pondRevive').isDisabled(),true);
 await page.evaluate(()=>{let e=__pondEngine;while(e.event.kind!=='revival')e.update(.05)});
 await page.keyboard.press('Space');await page.waitForFunction(()=>document.body.classList.contains('pond-paused'));const paused=await page.evaluate(()=>__pondEngine.elapsed);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>__pondEngine.elapsed),paused);await page.keyboard.press('Space');await page.waitForFunction(()=>!document.body.classList.contains('pond-paused'));
 const selected=await page.evaluate(()=>__pondEngine.event.reviveIds.length);assert.equal(selected,3);
 await page.evaluate(async()=>{const e=__pondEngine;e.elapsed=e.event.start+1.8;await __pondRenderer.revival.load(5);await __pondRenderer.revival.load(6)});
 await page.locator('#pondCanvas').screenshot({path:'/tmp/pond-revival-carry.png'});
 await page.evaluate(()=>{const e=__pondEngine;while(!e.event.applied)e.update(.05)});assert.equal(await page.evaluate(()=>__pondEngine.revivedCount),3);
 await page.locator('#pondCanvas').screenshot({path:'/tmp/pond-revival-land.png'});
 await page.evaluate(()=>{while(__pondEngine.state==='running')__pondEngine.update(.1)});assert.equal(await page.evaluate(()=>__pondEngine.winners.length),1);
 await page.click('#pondReset');await page.selectOption('#pondDuration','120');assert.equal(await page.evaluate(()=>__pondEngine.rounds),24);await page.waitForFunction(()=>document.querySelector('#pondStart .nw-start-cost').textContent==='300');
 supported=false;let message='';page.once('dialog',d=>{message=d.message();d.accept()});const result=await page.evaluate(()=>NWContent.start('pond','','120'));assert.equal(result,false);assert.match(message,/준비 중/);assert.equal(starts.length,1);
 await page.selectOption('#pondDuration','45');assert.equal(await page.evaluate(()=>__pondEngine.revivalCount),0);assert.equal(await page.evaluate(()=>__pondEngine.rounds),12);await page.waitForFunction(()=>document.querySelector('#pondStart .nw-start-cost').textContent==='200');assert.equal(await page.locator('#pondReviveRow').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('PASS real UI: 45/60 isolation; 90/120 pricing, persistence, cancellation, one charge, 3 revivals, pause, winner count, unavailable backend fail-closed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
