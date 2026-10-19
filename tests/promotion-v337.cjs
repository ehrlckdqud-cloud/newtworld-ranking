const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('assets/badges/promotion-v337.js','utf8'),grades=fs.readFileSync('assets/badges/grades-v335.js','utf8').split('/* Shared entry point')[0];
async function harness({auth=true,event=true}={}){
 const state={calls:0,now:100000,shown:0,timers:[],store:new Map(auth?[['nwProfileToken','t'],['nwProfileDevice','d']]:[])};
 function node(){return{events:{},attrs:{},style:{setProperty(){},overflow:''},dataset:{},className:'',childNodes:[],append(...n){this.childNodes.push(...n)},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},addEventListener(k,f){this.events[k]=f},remove(){},focus(){},getBoundingClientRect(){return{}},offsetWidth:400};}
 const dialog=node(),image=node(),stage=node(),note=node(),title=node(),name=node(),threshold=node(),replay=node(),confirm=node();
 const children={'img':image,'.nw-promo-stage':stage,'.nw-promo-audio-note':note,'h2':title,'.nw-promo-name':name,'.nw-promo-threshold':threshold,'.nw-promo-replay':replay,'.nw-promo-confirm':confirm};
 dialog.querySelector=s=>children[s];dialog.showModal=()=>{dialog.open=true;state.shown++};dialog.close=()=>{dialog.open=false;dialog.events.close()};
 const document=node();document.hidden=false;document.documentElement=node();document.activeElement={isConnected:true,focus(){}};document.body=node();document.head=node();document.querySelector=()=>dialog.open?dialog:null;
 document.createElement=t=>t==='dialog'?dialog:node();
 const context={document,URLSearchParams,Math,Promise,Set,Date:class extends Date{static now(){return state.now}},navigator:{},localStorage:{getItem:k=>state.store.get(k)||null,setItem:(k,v)=>state.store.set(k,v),removeItem:k=>state.store.delete(k)},setTimeout:(f,ms)=>{state.timers.push({f,ms});return state.timers.length},clearTimeout(){}};
 context.window=context;context.addEventListener=(k,f)=>{state[k]=f};context.NW_CONFIG={appScriptUrl:'https://test.invalid/exec'};context.NWConfigReady=Promise.resolve();
 document.head.append=n=>{if(n.src?.includes('action=gradePromotion')){state.calls++;const cb=new URL(n.src).searchParams.get('callback');queueMicrotask(()=>context[cb]({ok:true,auth:true,memberId:'a',nickname:'tester',event:event?{id:'a:1',level:1,score:1000}:null}));}};
 vm.createContext(context);vm.runInContext(grades,context);vm.runInContext(source,context);await new Promise(r=>setImmediate(r));
 return{state,dialog,image,context,title,confirm,document};
}
(async()=>{
 let h=await harness({auth:false});assert.equal(h.state.calls,0);assert.equal(h.state.shown,0);
 h=await harness({event:false});assert.equal(h.state.calls,1);assert.equal(h.state.shown,0);
 h=await harness();assert.equal(h.state.shown,1);assert(h.title.textContent.includes('입문자 달성'));assert(h.image.src.endsWith('rank-1.webp'));assert.equal(h.document.documentElement.style.overflow,'hidden');h.image.onload();assert('data-celebrate' in h.dialog.attrs);
 h.confirm.events.click();assert.equal(h.state.store.get('nwPromotionSeen337:a:a%3A1'),'1');assert.equal(h.document.documentElement.style.overflow,'');h.state.now+=60001;h.state.focus();await new Promise(r=>setImmediate(r));assert.equal(h.state.shown,1);
 h=await harness();h.state.store.set('nwProfileToken','different');h.state.storage({key:'nwProfileToken'});assert(!h.dialog.open);assert(!h.state.store.has('nwPromotionSeen337:a:a%3A1'));
 console.log('Frontend: unauthenticated suppression, no historical event, earned first badge, animation, acknowledgement, no repeat, logout cancellation passed');
})().catch(e=>{console.error(e);process.exitCode=1});
// Explicit replay must animate once even under reduced automatic motion.
{
 const src=fs.readFileSync('assets/badges/promotion-v337.js','utf8'),start=src.indexOf(' function animateBadge338('),end=src.indexOf(' function celebrate(',start);let count=0,options;
 const panel={toggleAttribute(){},querySelector:()=>({getAnimations:()=>[],animate:(frames,opt)=>{count++;options=opt;assert.equal(frames[1].transform,'translateY(-8px) scale(1.38) rotate(4deg)')}}),querySelectorAll:()=>[]};
 const c={window:{matchMedia:()=>({matches:true})}};vm.createContext(c);vm.runInContext(src.slice(start,end),c);c.animateBadge338(panel,false);assert.equal(count,0);c.animateBadge338(panel,true);assert.equal(count,1);assert.equal(options.duration,1800);
 console.log('Explicit replay uses Web Animations for 1.8-second full bounce despite reduced automatic motion');
}
