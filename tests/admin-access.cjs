const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const source=fs.readFileSync('assets/admin-access.js','utf8');
async function scenario({token='',password='test-password',result={ok:true,token:'fresh'},failure='',network=false}={}){
 const storage=new Map(token?[['nwAdminToken',token]]:[]),stats={prompts:0,loads:0,requests:[],removed:0};
 const status={},body={hidden:true},retry={},context={URL,URLSearchParams,TextEncoder,crypto:webcrypto,setTimeout,clearTimeout,
  sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  document:{createElement:()=>({remove(){stats.removed++}}),head:{append(script){
   const url=new URL(script.src);stats.requests.push(url);
   assert.equal(url.searchParams.has('password'),false);
   assert.equal(url.searchParams.get('hash'),require('node:crypto').createHash('sha256').update('test-password').digest('hex'));
   queueMicrotask(()=>network?script.onerror():context[url.searchParams.get('callback')](result));
  }}},
  NW_CONFIG:{appScriptUrl:'https://script.google.com/macros/s/example/exec'},
  NWUI:{async password(){stats.prompts++;return password}}
 };context.window=context;vm.createContext(context);vm.runInContext(source,context);
 const load=async()=>{stats.loads++;if(failure)throw Error(failure);if(storage.get('nwAdminToken')==='expired')throw Error('관리자 인증이 필요합니다.');body.hidden=false;};
 await context.NWAdminAccess.initialize({load,status,body,retry});
 return {stats,status,body,retry,storage,context};
}
(async()=>{
 let r=await scenario();assert.equal(r.stats.prompts,1);assert.equal(r.stats.loads,1);assert.equal(r.body.hidden,false);assert.equal(r.storage.get('nwAdminToken'),'fresh');assert.equal(r.stats.removed,1);assert.equal(Object.keys(r.context).some(k=>k.startsWith('nwAdminLogin_')),false);
 r=await scenario({token:'valid'});assert.equal(r.stats.prompts,0);assert.equal(r.stats.requests.length,0);assert.equal(r.stats.loads,1);assert.equal(r.body.hidden,false);
 r=await scenario({token:'expired'});assert.equal(r.stats.prompts,1);assert.equal(r.stats.loads,2);assert.equal(r.body.hidden,false);
 r=await scenario({password:null});assert.equal(r.body.hidden,true);assert.equal(r.retry.hidden,false);assert.equal(r.stats.requests.length,0);
 r=await scenario({result:{ok:false,error:'비밀번호가 일치하지 않습니다.'}});assert.equal(r.body.hidden,true);assert.equal(r.stats.loads,0);assert.equal(r.retry.hidden,false);assert.equal(r.storage.has('nwAdminToken'),false);await r.retry.onclick();assert.equal(r.stats.prompts,2);
 r=await scenario({network:true});assert.equal(r.body.hidden,true);assert.equal(r.retry.hidden,false);assert.equal(r.stats.removed,1);
 r=await scenario({token:'valid',failure:'서버 연결 오류'});assert.equal(r.stats.prompts,0);assert.equal(r.storage.get('nwAdminToken'),'valid');assert.equal(r.retry.hidden,false);
 console.log('PASS missing/valid/expired token, cancel, incorrect password retry, network failure, server failure, hash and callback cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
