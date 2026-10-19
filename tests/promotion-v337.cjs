const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('assets/badges/promotion-v337.js','utf8'),grades=fs.readFileSync('assets/badges/grades-v335.js','utf8').split('/* Shared entry point')[0];
async function harness({auth=true,event=true,audioBlocked=false,store,response,hidden=false,busy=false,now=100000,reducedMotion=false,delayedStyles=false,delayedDecode=false,manualPaint=false}={}){
 const state={audioPlays:0,audioBlocked,calls:0,now,shown:0,motions:0,frames:[],timers:[],store:store||new Map(auth?[['nwProfileToken','t'],['nwProfileDevice','d']]:[])};
 function node(){return{events:{},attrs:{},style:{setProperty(){},overflow:''},dataset:{},className:'',childNodes:[],append(...n){this.childNodes.push(...n)},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},addEventListener(k,f){this.events[k]=f},remove(){},focus(){},getBoundingClientRect(){return{}},offsetWidth:400};}
 const dialog=node(),image=node(),stage=node(),note=node(),title=node(),name=node(),threshold=node(),replay=node(),confirm=node();
 image.getAnimations=()=>[];image.animate=()=>{state.motions++;};image.decode=()=>delayedDecode?new Promise(resolve=>{state.decodeReady=resolve}):Promise.resolve();
 const children={'img':image,'.nw-promo-stage':stage,'.nw-promo-audio-note':note,'h2':title,'.nw-promo-name':name,'.nw-promo-threshold':threshold,'.nw-promo-replay':replay,'.nw-promo-confirm':confirm};
 dialog.querySelector=s=>children[s];dialog.showModal=()=>{dialog.open=true;state.shown++};dialog.close=()=>{dialog.open=false;dialog.events.close()};
 const document=node();document.hidden=hidden;document.documentElement=node();document.activeElement={isConnected:true,focus(){}};document.body=node();document.head=node();document.querySelector=()=>dialog.open||busy?dialog:null;
 document.createElement=t=>t==='dialog'?dialog:node();
 const context={document,URLSearchParams,Math,Promise,Set,Date:class extends Date{static now(){return state.now}},navigator:{},localStorage:{getItem:k=>state.store.get(k)||null,setItem:(k,v)=>state.store.set(k,v),removeItem:k=>state.store.delete(k)},setTimeout:(f,ms)=>{state.timers.push({f,ms});return state.timers.length},clearTimeout(){}};
 context.Audio=function(url){state.audioSource=url;this.pause=()=>{};this.play=()=>{state.audioPlays++;return state.audioBlocked?Promise.reject(new Error('blocked')):Promise.resolve();};};
 context.requestAnimationFrame=f=>manualPaint?state.frames.push(f):queueMicrotask(()=>f());context.matchMedia=()=>({matches:reducedMotion});
 context.window=context;context.addEventListener=(k,f)=>{state[k]=f};context.NW_CONFIG={appScriptUrl:'https://test.invalid/exec'};context.NWConfigReady=Promise.resolve();
 document.head.append=n=>{if(n.rel==='stylesheet'){state.stylesheet=n;if(!delayedStyles)queueMicrotask(()=>n.onload());}if(n.src?.includes('action=gradePromotion')){state.calls++;const cb=new URL(n.src).searchParams.get('callback');queueMicrotask(()=>context[cb](response||{ok:true,auth:true,memberId:'a',nickname:'tester',event:event?{id:'a:1',level:1,score:1000}:null}));}};
 vm.createContext(context);vm.runInContext(grades,context);vm.runInContext(source,context);await new Promise(r=>setImmediate(r));
 return{state,dialog,image,context,title,confirm,document,replay,note};
}
async function run(){
 let h=await harness({auth:false});assert.equal(h.state.calls,0);assert.equal(h.state.shown,0);
 h=await harness({event:false});assert.equal(h.state.calls,1);assert.equal(h.state.shown,0);
 h=await harness();assert.equal(h.state.shown,1);assert(h.title.textContent.includes('입문자 달성'));assert(h.image.src.endsWith('rank-1.webp'));assert.equal(h.document.documentElement.style.overflow,'hidden');h.image.onload();await new Promise(r=>setImmediate(r));assert('data-celebrate' in h.dialog.attrs);assert.equal(h.state.audioPlays,1);assert(h.state.audioSource.endsWith('promotion-fanfare-v339.mp3'));h.image.onload();await new Promise(r=>setImmediate(r));assert.equal(h.state.audioPlays,1);h.replay.events.click();assert.equal(h.state.audioPlays,2);
 h.confirm.events.click();assert.equal(h.state.store.get('nwPromotionSeen337:a:a%3A1'),'1');assert.equal(h.document.documentElement.style.overflow,'');h.state.now+=60001;h.state.focus();await new Promise(r=>setImmediate(r));assert.equal(h.state.shown,1);
 h=await harness();h.state.store.set('nwProfileToken','different');h.state.storage({key:'nwProfileToken'});assert(!h.dialog.open);assert.equal(h.state.store.get('nwPromotionSeen337:a:a%3A1'),'1');
 h=await harness({audioBlocked:true});h.image.onload();await new Promise(r=>setImmediate(r));assert(h.note.textContent.includes('재생'));h.state.audioBlocked=false;h.replay.events.click();await new Promise(r=>setImmediate(r));assert.equal(h.note.textContent,'');assert.equal(h.state.audioPlays,2);
 // Persist the same browser storage across full reloads, even before confirmation.
 h=await harness();const persistent=h.state.store;
 assert.equal(persistent.get('nwPromotionSeen337:a:a%3A1'),'1');
 let reload=await harness({store:persistent});assert.equal(reload.state.shown,0);
 reload=await harness({store:persistent,now:700001});assert.equal(reload.state.shown,0);
 // A second linked device/browser has its own once-only record.
 let second=await harness();assert.equal(second.state.shown,1);
 second=await harness({store:second.state.store});assert.equal(second.state.shown,0);
 // A subsequent earned grade still announces once for each device.
 const next={ok:true,auth:true,memberId:'a',nickname:'tester',event:{id:'a:2',level:2,score:3000}};
 reload=await harness({store:persistent,response:next});assert.equal(reload.state.shown,1);
 reload=await harness({store:persistent,response:next});assert.equal(reload.state.shown,0);
 // Hidden tabs and another open dialog must not consume the event.
 let blocked=await harness({hidden:true});assert.equal(blocked.state.shown,0);assert(!blocked.state.store.has('nwPromotionSeen337:a:a%3A1'));
 blocked.document.hidden=false;blocked.state.focus();await new Promise(r=>setImmediate(r));assert.equal(blocked.state.shown,1);
 blocked=await harness({busy:true});assert.equal(blocked.state.shown,0);assert(!blocked.state.store.has('nwPromotionSeen337:a:a%3A1'));
 // Automatic animation must wait for CSS, decoded image, and actual paint frames.
 let ready=await harness({delayedStyles:true,reducedMotion:true,delayedDecode:true,manualPaint:true});
 assert.equal(ready.state.shown,0);ready.state.stylesheet.onload();await new Promise(r=>setImmediate(r));assert.equal(ready.state.shown,1);
 ready.image.onload();assert.equal(ready.state.motions,0);assert.equal(ready.state.audioPlays,0);
 ready.state.decodeReady();await new Promise(r=>setImmediate(r));assert.equal(ready.state.motions,0);
 ready.state.frames.shift()();assert.equal(ready.state.motions,0);ready.state.frames.shift()();await new Promise(r=>setImmediate(r));
 assert.equal(ready.state.motions,1);assert.equal(ready.state.audioPlays,1);
 ready.image.onload();await new Promise(r=>setImmediate(r));assert.equal(ready.state.motions,1);
 // Closing while decoding prevents delayed automatic animation or audio.
 ready=await harness({delayedDecode:true});ready.image.onload();ready.confirm.events.click();ready.state.decodeReady();await new Promise(r=>setImmediate(r));assert.equal(ready.state.motions,0);assert.equal(ready.state.audioPlays,0);
 console.log('Automatic motion waits for stylesheet, image decode and two paint frames; reduced-motion first play and close cancellation passed');
 console.log('Reload before confirmation, lease expiry, second device, next grade: one display each passed');
 console.log('Automatic sound attempts once; original attachment URL; replay and blocked-autoplay fallback passed');
 console.log('Frontend: unauthenticated suppression, no historical event, earned first badge, animation, acknowledgement, no repeat, logout cancellation passed');
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1});
module.exports={harness};
// Both automatic entrance and replay must animate under the requested motion setting.
{
 const src=fs.readFileSync('assets/badges/promotion-v337.js','utf8'),start=src.indexOf(' function animateBadge338('),end=src.indexOf(' function celebrate(',start);let count=0,options;
 const panel={toggleAttribute(){},querySelector:()=>({getAnimations:()=>[],animate:(frames,opt)=>{count++;options=opt;assert.equal(frames[1].transform,'translateY(-8px) scale(1.38) rotate(4deg)')}}),querySelectorAll:()=>[]};
 const c={window:{matchMedia:()=>({matches:true})}};vm.createContext(c);vm.runInContext(src.slice(start,end),c);c.animateBadge338(panel,false);assert.equal(count,1);c.animateBadge338(panel,true);assert.equal(count,2);assert.equal(options.duration,1800);
 console.log('Automatic entrance and replay use the requested 1.8-second bounce, including reduced-motion environments');
}
