const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const source=html.slice(html.indexOf('  // Owner-only entry:'),html.indexOf('  // End owner-only entry.'));
(async()=>{
 let response={ok:true,auth:true,profile:{role:'방장'}},callback,timer,calls=0;
 const values=new Map([['nwProfileToken','owner'],['nwProfileDevice','device']]);
 const adminBtn={hidden:true},adminHub={classList:{remove(){}},setAttribute(){}};
 const context=vm.createContext({adminBtn,adminHub,localStorage:{getItem:k=>values.get(k)||null},NWJsonp:(action,_p,cb)=>{assert.equal(action,'profileCore');calls++;callback=cb;},setTimeout:fn=>(timer=fn,1),clearTimeout(){},window:{addEventListener(){},dispatchEvent(){}},document:{addEventListener(){}},Event:class{}});
 vm.runInContext(source,context);const first=context.verifyOwnerEntry();assert.equal(context.verifyOwnerEntry(),first);assert.equal(calls,1);callback(response);await Promise.resolve();await Promise.resolve();assert.equal(adminBtn.hidden,false);
 const refresh=context.verifyOwnerEntry();assert.equal(adminBtn.hidden,false);timer();assert.equal(await refresh,false);assert.equal(adminBtn.hidden,false);
 const denied=context.verifyOwnerEntry();callback({ok:true,auth:true,profile:{role:'일반'}});assert.equal(await denied,false);assert.equal(adminBtn.hidden,true);
 const owner=context.verifyOwnerEntry();callback(response);assert.equal(await owner,true);assert.equal(adminBtn.hidden,false);
 values.set('nwProfileToken','another-member');const changed=context.verifyOwnerEntry();assert.equal(adminBtn.hidden,true);callback({ok:false,auth:false});assert.equal(await changed,false);
 const old=context.verifyOwnerEntry(),oldCallback=callback;
 values.set('nwProfileToken','replacement');const latest=context.verifyOwnerEntry();oldCallback(response);assert.equal(await old,false);assert.equal(adminBtn.hidden,true);
 callback({ok:true,auth:true,profile:{role:'부방장'}});assert.equal(await latest,false);assert.equal(adminBtn.hidden,true);
 console.log('PASS owner entry persists during refresh/timeout, while role rejection and changed credentials revoke it.');
})().catch(e=>{console.error(e);process.exit(1);});
