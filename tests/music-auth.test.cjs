const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
let saved='stale',prompts=0,cancel=false,failNetwork=false;const calls=[];
const win={NW_CONFIG:{appScriptUrl:'https://script.google.com/test'},NWUI:{password:async()=>{prompts++;return cancel?null:'test-password';}},addEventListener(){}};
const ctx={window:win,crypto,TextEncoder,URLSearchParams,Map,sessionStorage:{getItem:()=>saved,setItem:(k,v)=>saved=v,removeItem:()=>saved=''},setTimeout:()=>1,clearTimeout(){},document:{getElementById:()=>null,createElement:()=>({remove(){}}),head:{appendChild(script){const p=new URL(script.src).searchParams;calls.push(p.get('action'));queueMicrotask(()=>win[p.get('callback')](failNetwork?{ok:false,error:'network'}:p.get('action')==='adminLogin'?{ok:true,token:'fresh'}:p.get('token')==='fresh'?{ok:true}:{ok:false,code:'ADMIN_EXPIRED'}));}}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('assets/music/music-library.js','utf8'),ctx);
(async()=>{
 const [a,b]=await Promise.all([win.NWEnsureMusicAdmin(),win.NWEnsureMusicAdmin()]);assert.equal(a,'fresh');assert.equal(b,'fresh');assert.equal(prompts,1);assert.equal(saved,'fresh');
 await win.NWEnsureMusicAdmin();assert.equal(prompts,1,'valid tokens do not reprompt');
 saved='stale';cancel=true;await assert.rejects(win.NWEnsureMusicAdmin(),/입력한 곡 정보는 유지/);assert.equal(saved,'');
 saved='fresh';failNetwork=true;await assert.rejects(win.NWEnsureMusicAdmin(),/network/);assert.equal(saved,'fresh','network errors do not discard valid sessions');assert.equal(prompts,2);
 console.log('Expired-session renewal, cancellation, request deduplication and network-failure behavior passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
