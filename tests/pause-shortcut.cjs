const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const [id,file,continued] of [['pause','index.html','계속하기'],['pondPause','pond.html','계속하기'],['sppause','space.html','계속 비행']]){
   assert.ok(fs.readFileSync('draw/'+file,'utf8').includes('pause-shortcut.mjs?v=1'));
   const page=await browser.newPage();
   await page.route('**/shortcut-test',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<button id="${id}">일시정지</button><input id="names"><button id="other">Other</button><dialog id="modal">Confirm</dialog><script>window.clicks=0;document.getElementById('${id}').onclick=function(){this.textContent=++window.clicks%2?'${continued}':'일시정지'}</script><script type="module" src="/draw/pause-shortcut.mjs?v=1"></script>`}));
   await page.goto('http://127.0.0.1:8010/shortcut-test');
   const button=page.locator('#'+id);await button.filter({hasText:'일시정지 (Space)'}).waitFor();
   await page.keyboard.press('Space');await button.filter({hasText:'계속하기 (Space)'}).waitFor();
   await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>clicks),2);
   await page.keyboard.down('Space');await page.keyboard.down('Space');await page.keyboard.up('Space');assert.equal(await page.evaluate(()=>clicks),3);
   await button.focus();await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>clicks),4);
   await page.locator('#names').focus();await page.keyboard.press('Space');assert.equal(await page.locator('#names').inputValue(),' ');assert.equal(await page.evaluate(()=>clicks),4);
   await page.locator('#other').focus();await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>clicks),4);
   await page.evaluate(()=>{document.activeElement.blur();document.querySelector('dialog').showModal()});await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>clicks),4);
   await page.evaluate(()=>{document.querySelector('dialog').close();document.querySelector('button').disabled=true;document.activeElement.blur()});await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>clicks),4);
   await page.close();
  }
  console.log('PASS all three games: toggle, labels, held key, focused pause button, input, other controls, dialog, disabled state');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
