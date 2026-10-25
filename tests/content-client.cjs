const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const store=()=>{const m=new Map;return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
let listeners=[],calls=[],next,alerts=[],confirmCount=0,approved=true,confirmOptions;const localStorage=store(),sessionStorage=store();localStorage.setItem('nwProfileToken','member');
const doc={currentScript:{src:'https://example.test/assets/content-access.js'},addEventListener(){},head:{append(){}},body:{append(){}},createElement(tag){return {tag,children:[],append(x){this.children.push(x);},remove(){},submit(){const p=JSON.parse(this.children[0].value);calls.push(p);queueMicrotask(()=>{const result=next(p);const event={origin:'https://script.googleusercontent.com',data:{channel:'nw-content',nonce:p.nonce,result}};for(const cb of [...listeners])cb(event);});}};}};
const window={NWUI:{confirm:async options=>{confirmOptions=options;confirmCount++;return approved;}},NW_CONFIG:{appScriptUrl:'https://script.google.com/macros/s/test/exec'},addEventListener:(t,f)=>{if(t==='message')listeners.push(f);},removeEventListener:(t,f)=>listeners=listeners.filter(x=>x!==f),dispatchEvent(){}};
const ctx={window,document:doc,location:{origin:'https://example.test'},URL,localStorage,sessionStorage,crypto,setTimeout,clearTimeout,queueMicrotask,Event:class{},CustomEvent:class{},confirm:()=>{confirmCount++;return true;},alert:s=>alerts.push(s)};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../assets/content-access.js','utf8'),ctx);const api=window.NWContent;
const status={ok:true,auth:true,memberId:'member:one',kind:'member',config:{enabled:true,games:{marble:{price:20,public:true},factory:{price:100,public:false}}}};
(async()=>{
 next=p=>p.action==='contentStatus'?status:{ok:true};assert.equal(await api.start('marble'),true);assert.equal(confirmCount,1);assert.equal(confirmOptions.cost,20);assert.equal(calls.filter(x=>x.action==='contentStart').length,1);const start=calls.find(x=>x.action==='contentStart');assert.equal(start.token,'member');assert.ok(start.requestId);assert.equal(start.price,undefined);
 calls=[];assert.equal(await api.start('factory'),false);assert.equal(calls.some(x=>x.action==='contentStart'),false);
 calls=[];const key='nwPendingRun:member:one:member:marble';sessionStorage.setItem(key,'pending-retry-123456');assert.equal(await api.start('marble'),true);assert.equal(calls.find(x=>x.action==='contentStart').requestId,'pending-retry-123456');assert.equal(sessionStorage.getItem(key),null);
 next=p=>p.action==='contentStatus'?status:{ok:false,error:'잔액 부족'};assert.equal(await api.start('marble'),false);assert.equal(sessionStorage.getItem(key),null);assert.equal(alerts.at(-1),'잔액 부족');
 approved=false;calls=[];assert.equal(await api.start('marble'),false);assert.equal(calls.some(p=>p.action==='contentStart'),false);assert.equal(sessionStorage.getItem(key),null);
 localStorage.setItem('nwCustomerToken','guest');assert.equal(api.credentials().guestToken,'guest');assert.equal(listeners.length,0);
 console.log('Client POST transport, numeric price confirmation, restricted map deny, retry request identity, failure cleanup and guest credentials passed.');
})().catch(e=>{console.error(e);process.exit(1);});
