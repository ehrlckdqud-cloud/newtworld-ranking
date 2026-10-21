const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const from=html.indexOf('  async function verifyMemberHubConnection(){'),to=html.indexOf('  let memberHubChecking=',from);
assert(from>0&&to>from);
async function run(initial,replies){
 const state=new Map(Object.entries(initial)),calls=[];
 const ctx={localStorage:{getItem:k=>state.get(k)||null,setItem:(k,v)=>state.set(k,v),removeItem:k=>state.delete(k)},NWJsonp:(a,p,cb)=>{calls.push(a);cb(replies.shift());}};
 vm.createContext(ctx);vm.runInContext(html.slice(from,to),ctx);
 let result,error;try{result=await ctx.verifyMemberHubConnection();}catch(e){error=e;}
 return {state,calls,result,error};
}
(async()=>{
 const device='device-123456789';
 let r=await run({nwProfileDevice:device,nwProfileToken:'valid'},[{ok:true,auth:true}]);
 assert.equal(r.result,true);assert.deepEqual(r.calls,['profileData']);
 r=await run({nwProfileDevice:device,nwProfileRequestId:'pending',nwProfileCode:'code'},[{ok:true,auth:true,token:'restored'}]);
 assert.equal(r.result,true);assert.equal(r.state.get('nwProfileToken'),'restored');assert(!r.state.has('nwProfileRequestId'));
 r=await run({nwProfileDevice:device,nwProfileToken:'revoked'},[{ok:false,auth:false},{ok:true,auth:true,token:'restored'}]);
 assert.equal(r.result,true);assert.deepEqual(r.calls,['profileData','profileRecover']);
 r=await run({nwProfileDevice:device,nwProfileToken:'keep'},[{ok:false,error:'timeout'}]);
 assert(r.error);assert.equal(r.state.get('nwProfileToken'),'keep');assert.deepEqual(r.calls,['profileData']);
 r=await run({nwProfileDevice:device,nwProfileToken:'keep'},[{ok:false,auth:false},{ok:false,error:'timeout'}]);
 assert(r.error);assert.equal(r.state.get('nwProfileToken'),'keep');
 r=await run({nwProfileDevice:device,nwProfileToken:'invalid'},[{ok:false,auth:false},{ok:true,auth:false,status:'none'}]);
 assert.equal(r.result,false);assert(!r.state.has('nwProfileToken'));
 r=await run({},[]);assert.equal(r.result,false);assert.equal(r.calls.length,0);
 for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(script[1].trim())new vm.Script(script[1]);
 console.log('7 member-hub recovery cases and inline script syntax passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
