// No live provider calls: exercise the browser state and transport boundaries.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const test=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const KEY='nwSocialLoginAttempt:v1';
const ticket='b'.repeat(64);
const attempt=()=>({provider:'google',verifier:'a'.repeat(64),returnTo:'coop/index.html?release=99',createdAt:Date.now()});
const successful=(status='legacy')=>({ok:true,token:'test-member-session',memberId:'NW-TEST',nickname:'테스트 회원',welcome:{status,amount:1000}});
function storage(initial={}){const data=new Map(Object.entries(initial));return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key),data};}
function element(){return {hidden:true,textContent:'',href:'',dataset:{},disabled:false};}
async function login(options={}){
 const nodes=Object.fromEntries(['loginStatus','memberContinue','verifyMember','retryConfig','retryFinish','providerNotice','browserNotice','memberState'].map(id=>[id,element()]));
 const buttons=['google','kakao','naver'].map(id=>({...element(),dataset:{provider:id},state:element(),querySelector(){return this.state;}}));
 const local=options.localStorage||storage(options.local||{}),session=options.sessionStorage||storage(options.session||{}),calls=[],moves=[],timers=[];
 const location={search:options.search||'',assign:url=>moves.push(url),replace:url=>moves.push(url)};
 const document={currentScript:{src:'https://example.test/assets/social-login.js'},getElementById:id=>nodes[id],querySelectorAll:()=>buttons};
 const api={call:async(action,params)=>{calls.push({action,params});return action==='socialConfig'?{ok:true,providers:options.providers||[{id:'google',enabled:true}]}:action==='contentSocialStart'?options.start:typeof options.finish==='function'?options.finish(params):options.finish;},status:async()=>({ok:false})};
 const window={NWContent:api,top:{location},NWSocialCallback:options.callback,dispatchEvent(){}};
 vm.runInNewContext(read('assets/social-login.js'),{window,document,location,localStorage:local,sessionStorage:session,navigator:{userAgent:options.userAgent||'test'},URL,URLSearchParams,crypto:webcrypto,TextEncoder,Uint8Array,CustomEvent:class{},setTimeout:fn=>{timers.push(fn);return timers.length;}});
 await new Promise(setImmediate);await new Promise(setImmediate);
 return {nodes,buttons,local,session,calls,moves,timers};
}
test('callback fragment is removed before other resources load',()=>{
 const inline=read('login.html').match(/<script>\s*([\s\S]*?)<\/script>/)[1],window={},replacements=[];
 vm.runInNewContext(inline,{window,location:{hash:'#ticket='+ticket,pathname:'/login.html',search:'?returnTo=index.html'},history:{replaceState:(_state,_title,url)=>replacements.push(url)},URLSearchParams});
 assert.equal(window.NWSocialCallback.ticket,ticket);assert.deepEqual(replacements,['/login.html?returnTo=index.html']);
});
test('unconfigured providers remain disabled and existing member verification remains available',async()=>{
 const state=await login({providers:[]});assert.ok(state.buttons.every(button=>button.disabled));assert.match(state.nodes.providerNotice.textContent,/준비 중/);assert.match(state.nodes.verifyMember.href,/^https:\/\/example\.test\/profile\.html/);
});
test('external or privileged return targets cannot become redirects',async()=>{
 for(const value of ['https://attacker.test/steal','//attacker.test/path','javascript:alert(1)','login-settings.html','../other.html']){
  const state=await login({search:'?returnTo='+encodeURIComponent(value)});assert.equal(state.nodes.memberContinue.href,'https://example.test/index.html');
 }
 const state=await login({search:'?returnTo='+encodeURIComponent('coop/index.html?release=99&token=private')});assert.equal(state.nodes.memberContinue.href,'https://example.test/coop/index.html?release=99');
});
test('provider start binds a random verifier and only navigates to the official auth host',async()=>{
 const state=await login({start:{ok:true,authorizationUrl:'https://accounts.google.com/o/oauth2/v2/auth?client_id=test'}});await state.buttons[0].onclick();
 const saved=JSON.parse(state.session.getItem(KEY)),request=state.calls.find(call=>call.action==='contentSocialStart');
 assert.match(saved.verifier,/^[a-f0-9]{64}$/);assert.equal(request.params.challenge,Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(saved.verifier))).toString('hex'));assert.equal(request.params.adminToken,'');assert.equal(request.params.guestToken,'');assert.equal(state.moves.length,1);
 const spoofed=await login({start:{ok:true,authorizationUrl:'https://accounts.google.com.attacker.test/o/oauth2/v2/auth'}});await spoofed.buttons[0].onclick();assert.equal(spoofed.moves.length,0);assert.equal(spoofed.session.getItem(KEY),null);
});
test('held and pending bonuses preserve the device and allow member use without forcing navigation',async()=>{
 for(const status of ['held','pending_device']){
  const state=await login({local:{nwProfileDevice:'stable-device',nwCustomerToken:'old-guest'},session:{[KEY]:JSON.stringify(attempt())},callback:{ticket},finish:successful(status)});
  assert.equal(state.local.getItem('nwProfileToken'),'test-member-session');assert.equal(state.local.getItem('nwProfileDevice'),'stable-device');assert.equal(state.local.getItem('nwCustomerToken'),null);assert.equal(state.session.getItem(KEY),null);assert.equal(state.timers.length,0);assert.equal(state.nodes.memberContinue.hidden,false);assert.doesNotMatch(state.nodes.loginStatus.textContent,/지급됩니다/);
 }
});
test('a lost completion response can retry the same ticket without restarting OAuth',async()=>{
 let count=0;const initial=attempt();
 const state=await login({local:{nwCustomerToken:'old-guest'},session:{[KEY]:JSON.stringify(initial)},callback:{ticket},finish:()=>{if(++count===1)throw Error('lost response');return successful('paid');}});
 const saved=JSON.parse(state.session.getItem(KEY));assert.equal(saved.ticket,ticket);assert.equal(saved.createdAt,initial.createdAt);assert.equal(state.nodes.retryFinish.hidden,false);assert.equal(state.local.getItem('nwCustomerToken'),'old-guest');
 assert.ok(Object.values(state.nodes).every(node=>!node.textContent.includes(ticket)&&!node.textContent.includes(initial.verifier)));
 await state.nodes.retryFinish.onclick();const requests=state.calls.filter(call=>call.action==='contentSocialFinish');assert.equal(requests.length,2);assert.ok(requests.every(call=>call.params.ticket===ticket&&call.params.verifier===initial.verifier));assert.equal(state.local.getItem('nwCustomerToken'),null);assert.equal(state.session.getItem(KEY),null);assert.match(state.nodes.loginStatus.textContent,/지급 이력이 확인/);assert.doesNotMatch(state.nodes.loginStatus.textContent,/지급되었어요/);
});
test('refresh resumes the same bounded completion attempt after a lost response',async()=>{
 const initial=attempt(),first=await login({session:{[KEY]:JSON.stringify(initial)},callback:{ticket},finish:()=>{throw Error('lost response');}});
 const resumed=await login({localStorage:first.local,sessionStorage:first.session,finish:successful()});
 assert.ok(resumed.calls.some(call=>call.action==='contentSocialFinish'&&call.params.ticket===ticket&&call.params.verifier===initial.verifier));assert.equal(resumed.local.getItem('nwProfileToken'),'test-member-session');assert.equal(resumed.session.getItem(KEY),null);
});
test('guest credentials are cleared only after the member session is successfully saved',async()=>{
 const local=storage({nwCustomerToken:'old-guest',nwProfileDevice:'stable-device'}),save=local.setItem;let rejectSave=true;
 local.setItem=(key,value)=>{if(key==='nwProfileToken'&&rejectSave){rejectSave=false;throw Error('storage unavailable');}return save(key,value);};
 const state=await login({localStorage:local,session:{[KEY]:JSON.stringify(attempt())},callback:{ticket},finish:successful()});
 assert.equal(local.getItem('nwProfileToken'),null);assert.equal(local.getItem('nwCustomerToken'),'old-guest');assert.equal(state.nodes.retryFinish.hidden,false);assert.equal(JSON.parse(state.session.getItem(KEY)).ticket,ticket);
 await state.nodes.retryFinish.onclick();assert.equal(local.getItem('nwProfileToken'),'test-member-session');assert.equal(local.getItem('nwCustomerToken'),null);assert.equal(local.getItem('nwProfileDevice'),'stable-device');assert.equal(state.session.getItem(KEY),null);
});
test('missing or ten-minute expired attempts cannot exchange a ticket; canceled flow clears its attempt',async()=>{
 for(const session of [{},{[KEY]:JSON.stringify({...attempt(),createdAt:Date.now()-11*60*1000})}]){
  const state=await login({session,callback:{ticket},finish:successful()});assert.ok(!state.calls.some(call=>call.action==='contentSocialFinish'));assert.equal(state.local.getItem('nwProfileToken'),null);
 }
 const canceled=await login({session:{[KEY]:JSON.stringify(attempt())},callback:{error:'LOGIN_CANCELED'}});assert.match(canceled.nodes.loginStatus.textContent,/취소/);assert.equal(canceled.session.getItem(KEY),null);
});
test('public provider JSONP sends no credentials while existing authenticated status stays intact',async()=>{
 const scripts=[],local=storage({nwProfileToken:'member-test',nwProfileDevice:'device-test',nwCustomerToken:'guest-test'}),session=storage({nwAdminToken:'admin-test'});
 const window={NW_CONFIG:{appScriptUrl:'https://script.google.com/macros/s/example/exec'},addEventListener(){},removeEventListener(){},dispatchEvent(){}};
 const document={currentScript:{src:'https://example.test/assets/content-access.js'},addEventListener(){},createElement:()=>({remove(){}}),head:{append:script=>{scripts.push(script);queueMicrotask(()=>{const url=new URL(script.src);window[url.searchParams.get('callback')]({ok:true});});}}};
 vm.runInNewContext(read('assets/content-access.js'),{window,document,location:{origin:'https://example.test'},localStorage:local,sessionStorage:session,URL,URLSearchParams,crypto:webcrypto,setTimeout,clearTimeout,Event:class{},CustomEvent:class{}});
 await window.NWContent.call('socialConfig',{token:'must-not-leak',device:'must-not-leak'});let url=new URL(scripts[0].src);assert.deepEqual([...url.searchParams.keys()].sort(),['_','action','callback']);assert.equal(url.searchParams.get('action'),'socialConfig');
 await window.NWContent.call('contentStatus');url=new URL(scripts[1].src);assert.equal(url.searchParams.get('token'),'member-test');assert.equal(url.searchParams.get('device'),'device-test');assert.equal(url.searchParams.get('adminToken'),'');
});
class Node{constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.hidden=false;this.textContent='';this.value='';this.checked=false;this.disabled=false;}append(...values){this.children.push(...values);}replaceChildren(...values){this.children=values;}querySelectorAll(selector){const found=[];function visit(node){if(!node||typeof node!=='object')return;if(selector==='input'&&node.tagName==='INPUT')found.push(node);if(selector==='[data-secret]'&&node.dataset?.secret)found.push(node);for(const child of node.children||[])visit(child);}for(const child of this.children)visit(child);return found;}focus(){this.focused=true;}}
async function settings(options={}){
 const nodes=Object.fromEntries(['providerSettings','redirectUri','copyRedirect','copyStatus','loginSettings','saveSettings','saveStatus','adminStatus','adminBody','adminRetry'].map(id=>[id,new Node()]));nodes.loginSettings.append(nodes.providerSettings);
 const session=storage({nwAdminToken:'admin-test'}),writes=[],calls=[];let reads=0;const setItem=session.setItem;session.setItem=(key,value)=>{writes.push([key,value]);return setItem(key,value);};
 const api={call:async(action,params)=>{calls.push({action,params:params?JSON.parse(JSON.stringify(params)):params});if(action==='contentSocialAdminRead'){reads++;return {ok:true,redirectUri:'https://script.google.com/macros/s/example/exec?action=socialCallback',providers:['google','kakao','naver'].map(id=>({id,clientId:id+'-test-id',secretConfigured:true,configured:true,enabled:reads===1}))};}if(options.expired)return {ok:false,error:'관리자 인증이 필요합니다.'};if(options.fail)throw Error('network');return {ok:true};}};
 const window={NWContent:api,NWUI:{},NWAdminAccess:{initialize:async options=>{await options.load();options.body.hidden=false;}},addEventListener(){}};
 const document={getElementById:id=>nodes[id],createElement:tag=>new Node(tag),querySelectorAll:selector=>nodes.providerSettings.querySelectorAll(selector)};
 vm.runInNewContext(read('assets/social-login-settings.js'),{window,document,sessionStorage:session,navigator:{clipboard:{writeText:async()=>{}}},URL});await new Promise(setImmediate);await new Promise(setImmediate);
 return {nodes,session,writes,calls,document};
}
test('admin secrets are never re-populated or stored; blank preserves prior secret and actual disabled state is rendered',async()=>{
 const state=await settings(),secrets=state.document.querySelectorAll('[data-secret]');assert.ok(secrets.every(input=>input.value===''&&input.autocomplete==='new-password'));secrets[0].value='new-test-secret';
 await state.nodes.loginSettings.onsubmit({preventDefault(){}});assert.ok(state.document.querySelectorAll('[data-secret]').every(input=>input.value===''));assert.equal(state.writes.length,0);
 const sent=state.calls.find(call=>call.action==='contentSocialAdminSave').params.providers;assert.equal(sent[0].clientSecret,'new-test-secret');assert.equal(sent[1].clientSecret,'');assert.ok(state.nodes.providerSettings.querySelectorAll('input').filter(input=>input.type==='checkbox').every(input=>!input.checked));
});
test('admin error clears secret inputs and an expired session requires authentication again',async()=>{
 const failed=await settings({fail:true});failed.document.querySelectorAll('[data-secret]')[0].value='clear-on-failure';await failed.nodes.loginSettings.onsubmit({preventDefault(){}});assert.ok(failed.document.querySelectorAll('[data-secret]').every(input=>input.value===''));assert.equal(failed.writes.length,0);assert.doesNotMatch(failed.nodes.saveStatus.textContent,/clear-on-failure/);
 const expired=await settings({expired:true});await expired.nodes.loginSettings.onsubmit({preventDefault(){}});assert.equal(expired.session.getItem('nwAdminToken'),null);assert.equal(expired.nodes.adminBody.hidden,true);assert.equal(expired.nodes.adminRetry.hidden,false);
});
