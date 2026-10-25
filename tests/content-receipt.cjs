const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const source=fs.readFileSync(__dirname+'/../assets/content-access.js','utf8');
async function run(owner){
 let ready,posted=[],urls=[],button={hidden:true,setAttribute(){},textContent:''},window;
 const storage={getItem:k=>k==='nwProfileToken'?'owner':k==='nwProfileDevice'?'device':k==='nwAdminToken'?'global-admin':'',setItem(){},removeItem(){}};
 const doc={currentScript:{src:'https://example.test/assets/content-access.js'},addEventListener:(type,f)=>ready=f,getElementById:()=>button,createElement:tag=>({style:{},remove(){}}),head:{append(s){urls.push(s.src);const u=new URL(s.src),nonce=u.searchParams.get('nonce'),p=posted.find(p=>p.nonce===nonce);assert(p);assert.equal(u.searchParams.get('token'),null);queueMicrotask(()=>window[u.searchParams.get('callback')]({done:true,result:{ok:true,kind:'member',memberId:'member:NW0001',canUseGameAdmin:owner,config:{games:{marble:{public:true,price:20}},enabled:true}}}));}},body:{append(){throw Error('iframe should not be used when fetch exists')}}};
 window={NW_CONFIG:{appScriptUrl:'https://script.google.com/macros/s/test/exec'},addEventListener(){},removeEventListener(){}};
 const ctx={window,document:doc,location:{origin:'https://example.test',pathname:'/draw/index.html'},localStorage:storage,sessionStorage:storage,URL,URLSearchParams,crypto,fetch:async(url,opt)=>{assert.equal(opt.mode,'no-cors');posted.push(JSON.parse(opt.body.get('payload')));},setTimeout:(f,ms)=>setTimeout(f,ms===1000?0:ms),clearTimeout};
 vm.runInNewContext(source,ctx);ready();await new Promise(r=>setTimeout(r,30));
 assert.equal(button.hidden,!owner);assert.equal(button.textContent,'관리자모드');
 assert(posted.length>0);assert(posted.every(p=>p.adminToken===''));assert(urls.every(u=>u.includes('contentReceipt')));
}
(async()=>{await run(true);await run(false);console.log('PASS POST receipt polling without iframe, no credential query strings, owner-only button, global admin ignored');})().catch(e=>{console.error(e);process.exitCode=1});
