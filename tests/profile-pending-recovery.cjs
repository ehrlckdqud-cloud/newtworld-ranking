const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../profile.html','utf8');
const start=html.indexOf('  async function loadProfile(){'),end=html.indexOf('  function renderProfileIdentity(',start);
assert(start>0&&end>start);
async function test(initial,recover,response){
 const state=new Map(Object.entries(initial)),calls=[],elements=new Map();
 const ctx={localStorage:{getItem:k=>state.get(k)||null,setItem:(k,v)=>state.set(k,v),removeItem:k=>state.delete(k)},coreCacheKey:'cache',avatarEditVersion:0,ownProfile:null,device:()=> 'same-device',
  $:id=>{if(!elements.has(id))elements.set(id,{textContent:'',classList:{remove(){}}});return elements.get(id);},
  recoverExisting:async()=>{calls.push('recover');if(recover){state.set('nwProfileToken','restored');state.delete('nwProfileRequestId');state.delete('nwProfileCode');}return recover;},
  jsonp:async()=>{calls.push('data');return response;},show:v=>calls.push(v),loadCandidates:()=>calls.push('candidates'),renderPending:()=>calls.push('pending'),check:()=>calls.push('check'),saveCoreCache(){},clearCoreCache(){},renderProfile:()=>calls.push('profile'),loadProfileExtras(){},loadEditableProfile(){}};
 vm.createContext(ctx);vm.runInContext(html.slice(start,end),ctx);await ctx.loadProfile();return {calls,state};
}
(async()=>{
 const pending={nwProfileRequestId:'new-pending',nwProfileCode:'new-code'};
 let r=await test(pending,true,{ok:true,auth:true,profile:{memberId:'NW0014'}});
 assert.deepEqual(r.calls,['recover','data','profile']);assert.equal(r.state.get('nwProfileToken'),'restored');assert(!r.state.has('nwProfileRequestId'));
 r=await test(pending,false,{});assert.deepEqual(r.calls,['recover','pending','check']);assert.equal(r.state.get('nwProfileRequestId'),'new-pending');
 r=await test({},false,{});assert.deepEqual(r.calls,['recover','authView','candidates']);
 r=await test({nwProfileToken:'keep'},false,{ok:false,error:'timeout'});assert.deepEqual(r.calls,['data']);assert.equal(r.state.get('nwProfileToken'),'keep');
 for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(script[1].trim())new vm.Script(script[1]);
 console.log('4 pending-request recovery cases and inline script syntax passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
