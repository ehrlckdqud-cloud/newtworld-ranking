// Run with jsdom installed: node tests/event-photo-reuse.cjs
const {JSDOM}=require('jsdom');
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),code=fs.readFileSync('assets/eventbook/eventbook.js','utf8');
const tick=()=>new Promise(r=>setTimeout(r,15));
async function setup(){
 const dom=new JSDOM(html,{url:'https://ehrlckdqud-cloud.github.io/newtworld-ranking/',runScripts:'outside-only'}),w=dom.window,$=id=>w.document.getElementById(id);
 const months={'2026-10':{month:'2026-10',revision:'oct',images:[{id:'one',name:'사진1'},{id:'two',name:'사진2'}]},'2026-11':{month:'2026-11',revision:'nov',images:[{id:'three',name:'사진3'}]}};
 let seq=0,failSave=false,failReuse=false;const posts=[];
 w.NW_CONFIG={appScriptUrl:'https://script.google.com/macros/s/test/exec'};w.matchMedia=()=>({matches:false,addEventListener(){}});w.setInterval=()=>0;w.requestAnimationFrame=()=>0;w.sessionStorage.setItem('nwAdminToken','test-admin');
 const append=w.document.head.appendChild.bind(w.document.head);
 w.document.head.appendChild=node=>{const result=append(node);if(node.tagName==='SCRIPT'&&node.src.includes('callback=')){const u=new URL(node.src),m=u.searchParams.get('month'),cb=u.searchParams.get('callback');const data=u.searchParams.get('action')==='eventBookList'?{ok:true,...(months[m]||{month:m,revision:'',images:[]})}:{ok:true,images:[]};setTimeout(()=>w[cb]?.(JSON.parse(JSON.stringify(data))),0);}return result;};
 w.HTMLFormElement.prototype.submit=function(){const p=JSON.parse(this.querySelector('input').value);posts.push(p);let d;const old=months[p.month];
  if(p.token!=='test-admin')d={ok:false,auth:false,error:'관리자 로그인 만료'};
  else if(failSave&&p.mode==='save'||p.revision!==old.revision)d={ok:false,conflict:true,error:'목록 충돌'};
  else if(failReuse&&p.mode==='reuse')d={ok:false,conflict:true,error:'원본 충돌'};
  else{const by=Object.fromEntries(old.images.map(x=>[x.id,x]));let images=p.mode==='save'?p.ids.map(id=>by[id]):old.images.concat(months[p.sourceMonth].images.filter(x=>p.ids.includes(x.id)&&!by[x.id]));d=months[p.month]={ok:true,month:p.month,revision:'r'+(++seq),images};}
  setTimeout(()=>w.dispatchEvent(new w.MessageEvent('message',{origin:'https://script.google.com',data:{channel:'nw-eventbook',nonce:p.nonce,result:JSON.parse(JSON.stringify(d))}})),0);
 };
 w.eval(code);$('nwOpenEventBookAdmin').click();await tick();$('nwEventMonth').value='2026-11';await $('nwEventMonth').onchange();
 return {w,$,months,posts,close:()=>w.close(),failSave:()=>failSave=true,failReuse:()=>failReuse=true,load:async()=>{$('nwEventSourceMonth').value='2026-10';await $('nwEventSourceLoad').onclick();}};
}
(async()=>{
 let s=await setup();await s.load();assert.equal(s.$('nwEventSourceList').querySelectorAll('input').length,2);s.$('nwEventSourceList').querySelector('input[value="two"]').click();await s.$('nwEventReuse').onclick();assert.deepEqual(s.posts.map(x=>x.mode),['save','reuse']);assert.equal(s.posts[1].revision,'r1');assert.equal(s.posts[1].sourceRevision,'oct');assert.deepEqual(s.months['2026-11'].images.map(x=>x.id),['three','two']);assert.deepEqual(s.months['2026-10'].images.map(x=>x.id),['one','two']);assert.equal(s.$('nwEventSourceList').querySelector('input[value="two"]').disabled,true);assert.equal(JSON.parse(s.w.localStorage.getItem('nwEventBookList:2026-11')).images.length,2);await s.$('nwEventReload').onclick();assert.equal(s.$('nwEventAdminList').children.length,2);s.close();
 s=await setup();await s.load();s.$('nwEventSourceAll').click();s.failSave();await s.$('nwEventReuse').onclick();assert.equal(s.posts.length,1);assert.equal(s.months['2026-11'].images.length,1);assert.match(s.$('nwEventAdminStatus').textContent,/충돌/);s.close();
 s=await setup();await s.load();s.$('nwEventSourceAll').click();s.failReuse();await s.$('nwEventReuse').onclick();assert.equal(s.months['2026-11'].images.length,1);assert.match(s.$('nwEventAdminStatus').textContent,/원본 충돌/);s.close();
 s=await setup();s.months['2026-11'].images=Array.from({length:20},(_,i)=>({id:'target'+i,name:'사진'}));await s.$('nwEventReload').onclick();await s.load();s.$('nwEventSourceAll').click();await s.$('nwEventReuse').onclick();assert.equal(s.posts.length,0);assert.match(s.$('nwEventReuseStatus').textContent,/20장/);s.close();
 s=await setup();await s.load();s.$('nwEventSourceAll').click();s.$('nwEventSourceMonth').value='2026-09';s.$('nwEventSourceMonth').onchange();assert.equal(s.$('nwEventReuse').disabled,true);await s.$('nwEventSourceLoad').onclick();assert.match(s.$('nwEventReuseStatus').textContent,/없습니다/);s.$('nwEventSourceMonth').value='2026-12';await s.$('nwEventSourceLoad').onclick();assert.match(s.$('nwEventReuseStatus').textContent,/이전 월/);s.close();
 s=await setup();await s.load();s.$('nwEventAdminList').querySelectorAll('button')[2].click();s.$('nwEventSourceAll').click();await s.$('nwEventReuse').onclick();assert.deepEqual(s.posts[0].ids,[]);assert.deepEqual(s.months['2026-11'].images.map(x=>x.id),['one','two']);s.close();
 console.log('PASS: selected reuse, source preservation, revision chaining, duplicate exclusion, cache/reload, save conflict, source conflict, 20-photo cap, source reset, empty/future month, pending deletion');
})().catch(e=>{console.error(e);process.exitCode=1;});
