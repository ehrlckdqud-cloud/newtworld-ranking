// Run against a local static server; all membership/payment APIs are test doubles.
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = process.env.NW_TEST_BASE || 'http://127.0.0.1:8000';
const config = {enabled:true,games:{marble:{price:100,public:true},factory:{price:200,public:true},pond:{price:200,public:true},space:{price:300,public:true}}};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
 const context=await browser.newContext();let authenticated=true, starts=[];
 await context.addInitScript(()=>{if(window!==top||!/^https?:$/.test(location.protocol))return;localStorage.setItem('nwProfileToken','test-member');localStorage.setItem('nwProfileDevice','test-device');const Original=window.Audio;window.__audio=[];window.Audio=function(...args){const a=new Original(...args);window.__audio.push(a);return a;};window.Audio.prototype=Original.prototype;});
 await context.route('https://script.google.com/**',async route=>{
  const request=route.request(),url=new URL(request.url()),callback=url.searchParams.get('callback');
  const result=authenticated?{ok:true,auth:true,memberId:'member:one',kind:'member',config,avatars:[],images:[],profile:{nickname:'테스트 회원',role:'일반'}}:{ok:false,auth:false,error:'회원식별을 완료해주세요.'};
  if(request.method()==='POST'){
   const payload=JSON.parse(new URLSearchParams(request.postData()).get('payload'));starts.push(payload);
   return route.fulfill({contentType:'text/html',body:`<script>parent.postMessage(${JSON.stringify({channel:'nw-content',nonce:payload.nonce,result:{ok:true}})},'*')</script>`});
  }
  await route.fulfill({contentType:'text/javascript',body:callback?`${callback}(${JSON.stringify(result)})`:'{}'});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(25000);
 console.log('CHECK marble entry');
 await page.goto(base+'/draw/index.html');
 await page.waitForFunction(()=>document.querySelector('#map').options.length===5,null,{timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#waitingTrack').options.length===9);
 assert.equal(await page.locator('#start .nw-start-cost').innerText(),'100');
 await page.selectOption('#map','4');await page.waitForFunction(()=>document.querySelector('#start .nw-start-cost')?.textContent==='200');
 assert.equal(await page.locator('dialog[open]').count(),0);
 assert.equal(await page.locator('#map').inputValue(),'4');
 assert.equal((await page.locator('body').innerText()).includes('개발중'),false);
 console.log('CHECK defaults loaded');
 const stored=await page.evaluate(async()=>{
  async function read(name,store){return new Promise((resolve,reject)=>{const r=indexedDB.open(name);r.onsuccess=()=>{const q=r.result.transaction(store).objectStore(store).getAll();q.onsuccess=()=>{resolve(q.result);r.result.close();};};r.onerror=()=>reject(r.error);});}
  return {tracks:(await read('nw-draw-music-v1','tracks')).length,photos:(await read('nw-draw-visuals-v1','photos')).length,placements:(await read('nw-draw-stickers-v1','settings'))[0].length};
 });assert.deepEqual(stored,{tracks:19,photos:2,placements:11});
 console.log('CHECK factory start');
 // The real engine start button reaches the normal paid confirmation, not admin login.
 await page.click('#sample');await page.uncheck('#record');await page.click('#start');
 await page.locator('.nw-dialog[open]').waitFor();assert.equal(await page.locator('.nw-dialog .nw-gem-amount').innerText(),'200');
 await page.locator('.nw-dialog button').filter({hasText:'취소'}).click();assert.equal(starts.length,0);
 await page.click('#start');await page.locator('.nw-dialog[open]').waitFor();
 await page.locator('.nw-dialog [type=submit]').click();
 await page.waitForFunction(()=>document.documentElement.classList.contains('game-running')&&document.querySelector('#countdown').hidden);
 assert.equal(starts.at(-1).game,'factory');assert.equal(starts.at(-1).expectedCost,200);
 page.once('dialog',dialog=>dialog.accept());await page.click('#reset');
 console.log('CHECK confirmations');
 for(const [game,cost] of [['marble',100],['factory',200],['pond',200],['space',300]]){
  await page.evaluate(game=>{window.__startResult=NWContent.start(game);},game);
  await page.locator('.nw-dialog[open]').waitFor();assert.equal(await page.locator('.nw-dialog .nw-gem-amount').innerText(),String(cost));
  assert.equal(await page.locator('.nw-dialog .nw-gem-icon').getAttribute('alt'),'뉴트젬');
  await page.locator('.nw-dialog [type=submit]').click();assert.equal(await page.evaluate(()=>window.__startResult),true);
  assert.equal(starts.at(-1).expectedCost,cost);assert.equal(starts.at(-1).adminToken,'');
 }
 console.log('CHECK audio');
 await page.click('#musicPower');await page.waitForFunction(()=>__audio.some(a=>a.src.includes('/assets/game-defaults/')&&!a.paused));
 await page.click('#musicPower');const other=await context.newPage();await other.goto('about:blank');await other.bringToFront();await page.bringToFront();await page.click('#musicPower');
 await page.waitForFunction(()=>__audio.some(a=>a.src.includes('/assets/game-defaults/')&&!a.paused));
 // Reproduce a suspended waiting player plus an interrupted recording context.
 assert.deepEqual(await page.evaluate(async()=>{
  const {DrawMusic}=parcelRequirea0e5('fJyhw');let resumed=0;
  const player=()=>({paused:true,volume:1,currentTime:0,readyState:1,addEventListener(){},pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}});
  const m=new DrawMusic(player);m.setLibrary([{id:'a',name:'song',url:'/song.mp3'}],{waiting:['a'],game:['a'],starts:{},volume:1,enabled:true});
  m.capture={context:{resume:async()=>{resumed++;}},volume(p,v){p.volume=v;}};
  m.suspend();m.enable();await Promise.resolve();const waiting=!m.players.waiting.paused;
  m.phase='game';m.pauseGame(true);m.enable();await Promise.resolve();const pausedRound=m.players.game.paused;
  return {waiting,pausedRound,resumed};
 }),{waiting:true,pausedRound:true,resumed:2});
 console.log('CHECK personal settings');
 // Retrying setup preserves saved edits and deliberately cleared playlists.
 await page.evaluate(async()=>{await new Promise(resolve=>{const r=indexedDB.open('nw-draw-music-v1');r.onsuccess=()=>{const db=r.result,tx=db.transaction('settings','readwrite');tx.objectStore('settings').put({waiting:[],game:[],starts:{},volume:.2,enabled:false},'config');tx.oncomplete=()=>{db.close();resolve();};};});await(await import('/assets/game-defaults.mjs')).installGameDefaults();});
 await page.reload();await page.waitForFunction(()=>document.querySelector('#map').options.length===5);
 await page.waitForFunction(()=>document.querySelector('#waitingTrack').options[0].value==='');
 assert.equal(await page.locator('#musicVolume').inputValue(),'20');
 console.log('CHECK pond');
 // Pond entry accepts a member, and has the same priced confirmation badge.
 await page.goto(base+'/draw/pond.html');await page.waitForFunction(()=>!document.querySelector('#pondRoot').hidden,null,{timeout:60000});await page.locator('#pondCanvas').waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('#pondStart .nw-start-cost')?.textContent==='200');assert.equal(await page.locator('dialog[open]').count(),0);
 assert.equal((await page.locator('body').innerText()).includes('개발중'),false);
 console.log('CHECK space');
 // Space entry loads the actual game assets without an administrator gate.
 await page.goto(base+'/draw/space.html');await page.locator('#nwspace').waitFor({state:'visible',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#spstart .nw-start-cost')?.textContent==='300');assert.equal(await page.locator('#adminLogin').count(),0);
 console.log('CHECK coins');
 // Returning from another tab must not leave idle space music permanently paused.
 await page.waitForFunction(()=>!document.querySelector('#musicPower').disabled&&__audio.some(a=>a.src.startsWith('blob:')&&a.readyState>=2));
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});
 if((await page.locator('#musicPower').innerText()).includes('끄기'))await page.click('#musicPower');
 await page.click('#musicPower');try{await page.waitForFunction(()=>__audio.some(a=>a.src.startsWith('blob:')&&!a.paused));}catch(error){console.log('SPACE AUDIO STATE',await page.evaluate(()=>({hidden:document.hidden,power:document.querySelector('#musicPower').outerHTML,audio:__audio.map(a=>({src:a.src,paused:a.paused,error:a.error?.message,time:a.currentTime}))})));throw error;}
 // Quantity selection is itself the explicit gem-cost confirmation.
 await page.evaluate(async()=>{const {chooseCoinQuantity}=await import('/coop/coin-purchase.mjs');window.__coins=chooseCoinQuantity({getBalance:async()=>5000});});
 await page.locator('.coin-purchase[open]').waitFor();await page.fill('#coinQuantity','3');
 assert.equal(await page.locator('.coin-total .nw-gem-amount').innerText(),'600');await page.click('[data-cancel]');assert.equal(await page.evaluate(()=>__coins),null);
 console.log('CHECK anonymous');
 // Unauthenticated members stay outside the games.
 authenticated=false;await page.goto(base+'/draw/index.html');await page.waitForFunction(()=>document.querySelector('#memberGateStatus').textContent.includes('회원식별을 완료'));
 assert.equal(await page.locator('#memberGate').isVisible(),true);
 assert.deepEqual(errors,[]);await context.close();
 console.log('PASS browser: member entry, factory start, 100/200/200/300 confirmations, cancel/no charge, streamed music restart, 19 tracks/2 photos/11 placements, personal settings preserved, pond/space entry, coin icon total, anonymous denial.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
