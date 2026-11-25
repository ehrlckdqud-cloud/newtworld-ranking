const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const source=html.slice(html.indexOf('  // Owner-only entry:'),html.indexOf('  // End owner-only entry.'));
const values=new Map([['nwProfileToken','owner'],['nwProfileDevice','device']]);
const approved={ok:true,auth:true,profile:{role:'방장'}};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function tab(){
 const calls=[],events={},button={hidden:true,addEventListener:(name,fn)=>button[name]=fn};
 const hub={classList:{remove(){}},setAttribute(){}};
 const crypto={subtle:{digest:async(_,bytes)=>createHash('sha256').update(bytes).digest()}};
 const window={crypto,addEventListener:(name,fn)=>events[name]=fn,dispatchEvent(){}};
 let expire;
 const context={window,crypto,TextEncoder,Event:class{},
  document:{getElementById:id=>id==='nwAdminLoginBtn'?button:hub},
  localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},
  NWJsonp:(action,params,cb)=>{assert.equal(action,'profileCore');calls.push(cb);},
  setTimeout:fn=>(expire=fn,1),clearTimeout(){}};
 vm.runInNewContext(source,context);
 return {button,calls,verify:window.NWVerifyOwnerEntry,expire:()=>expire(),bind:window.NWBindAdminEntry};
}
(async()=>{
 const first=tab();await flush();assert(first.button.hidden);
 const live=first.verify();assert.equal(first.verify(),live);first.calls[0](approved);assert(await live);
 assert(!first.button.hidden);assert.match(values.get('nwOwnerEntryHintV1'),/^[0-9a-f]{64}$/);
 const revisit=tab();await flush();assert(!revisit.button.hidden);assert.equal(revisit.calls.length,0);
 let opened=false;const waitingClick=revisit.button.click();
 revisit.bind(async()=>{opened=await revisit.verify();});await flush();
 revisit.expire();await waitingClick;assert(!opened);assert(!revisit.button.hidden);
 const revoked=revisit.verify();revisit.calls.at(-1)({ok:true,auth:true,profile:{role:'부방장'}});assert.equal(await revoked,false);
 assert(revisit.button.hidden);assert(!values.has('nwOwnerEntryHintV1'));
 const again=revisit.verify();revisit.calls.at(-1)(approved);await again;
 const stale=revisit.verify(),reply=revisit.calls.at(-1);values.set('nwProfileDevice','other');
 const changed=revisit.verify();assert(revisit.button.hidden);reply(approved);assert.equal(await stale,false);
 await flush();assert(revisit.button.hidden);revisit.calls.at(-1)({ok:false,auth:false});assert.equal(await changed,false);
 values.delete('nwProfileToken');const loggedOut=tab();await flush();assert(loggedOut.button.hidden);assert.equal(await loggedOut.verify(),false);
 console.log('PASS first visit, immediate display on revisit, fresh gate on click, timeout, revocation, changed device and logout.');
})().catch(error=>{console.error(error);process.exitCode=1;});
