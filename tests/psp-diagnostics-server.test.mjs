import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {makePspDiagnosticsServer} from '../tools/psp-diagnostics-server.mjs';

test('PSP diagnostics host isolates threads and exposes no ROM/payment API',async t=>{
  const server=makePspDiagnosticsServer();
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const page=await fetch(base+'/psp/');
  assert.equal(page.status,200);
  assert.equal(page.headers.get('cross-origin-opener-policy'),'same-origin');
  assert.equal(page.headers.get('cross-origin-embedder-policy'),'require-corp');
  assert.equal(page.headers.get('cross-origin-resource-policy'),'same-origin');
  assert.match(await page.text(),/뉴트젬 차감/);
  for(const target of ['/psp/psp-diagnostics.mjs','/psp/psp-contract.mjs']){
    const response=await fetch(base+target);
    assert.equal(response.status,200);
    assert.match(response.headers.get('content-type'),/javascript/);
  }
  for(const target of ['/api/arcade-entry','/api/psp-package','/etc/passwd','/psp/../coop/lobby.mjs']){
    const response=await fetch(base+target);
    assert.equal(response.status,404);
  }
  const post=await fetch(base+'/psp/',{method:'POST',body:'test'});
  assert.equal(post.status,405);
});
