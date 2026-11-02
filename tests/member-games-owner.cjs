const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const source=html.slice(html.indexOf('  // Owner-only entry:'),html.indexOf('  // End owner-only entry.'));
(async()=>{
 let response={ok:true,auth:true,profile:{role:'방장'}},callback,timer;
 const values=new Map([['nwProfileToken','owner'],['nwProfileDevice','device']]);
 const adminBtn={hidden:true},adminHub={classList:{remove(){}},setAttribute(){}};
 const context=vm.createContext({adminBtn,adminHub,localStorage:{getItem:k=>values.get(k)||null},NWJsonp:(_a,_p,cb)=>{callback=cb;},setTimeout:fn=>(timer=fn,1),clearTimeout(){},window:{addEventListener(){},dispatchEvent(){}},document:{addEventListener(){}},Event:class{}});
 vm.runInContext(source,context);callback(response);await Promise.resolve();await Promise.resolve();assert.equal(adminBtn.hidden,false);
 const refresh=context.verifyOwnerEntry();assert.equal(adminBtn.hidden,false);timer();assert.equal(await refresh,false);assert.equal(adminBtn.hidden,false);
 const denied=context.verifyOwnerEntry();callback({ok:true,auth:true,profile:{role:'일반'}});assert.equal(await denied,false);assert.equal(adminBtn.hidden,true);
 const owner=context.verifyOwnerEntry();callback(response);assert.equal(await owner,true);assert.equal(adminBtn.hidden,false);
 values.set('nwProfileToken','another-member');const changed=context.verifyOwnerEntry();assert.equal(adminBtn.hidden,true);callback({ok:false,auth:false});assert.equal(await changed,false);
 console.log('PASS owner entry persists during refresh/timeout, while role rejection and changed credentials revoke it.');
})().catch(e=>{console.error(e);process.exit(1);});
