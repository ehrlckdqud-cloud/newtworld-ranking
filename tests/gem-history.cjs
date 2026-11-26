const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const s=fs.readFileSync('profile.html','utf8');for(const m of s.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
function el(){return {value:"",setAttribute(){},children:[],replaceChildren(){this.children=[]},append(...v){this.children.push(...v)},showModal(){this.open=true},close(){this.open=false;this.onclose()},addEventListener(k,f){this['on'+k]=f},focus(){this.focused=true}}}
const nodes={},$=id=>nodes[id]||(nodes[id]=el());let resolve,calls=0,cache=null;
const c={$,document:{createElement:el,getElementById:$},localStorage:{getItem:()=> 'token'},device:()=> 'device',fmt:String,Date,
 ownProfile:{memberId:'one',lifetimeScore:20},activityBaseProfile:{},renderRecent(){},saveCoreCache(){},
 readMemberWalletCache:()=>cache,saveMemberWalletCache:(t,m,w)=>{cache=w;},
 jsonp:()=>{calls++;return new Promise(r=>resolve=r)}};
vm.createContext(c);
vm.runInContext('let walletFlight=null,lastWalletRead=null,activityWallet=null,activityWalletState="loading";'+
 s.slice(s.indexOf('  function loadActivityWallet('),s.indexOf('  async function loadProfileExtras('))+
 s.slice(s.indexOf('  let gemHistoryRequest='),s.indexOf('  function show(id)')),c);
(async()=>{
 const activity=c.loadActivityWallet('token','one');
 let p=$('nwWallet').onclick();
 assert.equal(calls,1,'activity and dialog share the pending read');
 resolve({ok:true,memberId:'member:one',wallet:{balance:20,history:[{at:1,amount:-20,note:'<img onerror=bad()> 사유'}]}});
 await Promise.all([activity,p]);
 assert.equal($('gemHistoryList').children[0].children[1].textContent,'<img onerror=bad()> 사유');
 assert.equal($('gemHistoryList').children[0].children[2].textContent,'-20젬');
 $('gemHistoryClose').onclick();assert.equal($('nwWallet').focused,true);
 await $('nwWallet').onclick();assert.equal(calls,1,'immediate reopen uses confirmed history');
 $('gemHistoryClose').onclick();vm.runInContext('lastWalletRead=null',c);
 p=$('nwWallet').onclick();assert.equal($('gemHistoryList').children.length,1,'cached history renders during refresh');
 $('gemHistoryClose').onclick();resolve({ok:false});await p;assert.equal($('gemHistoryList').children.length,0);
 p=$('nwWallet').onclick();resolve({ok:false});await p;
 assert.equal($('gemHistoryRetry').hidden,false);assert.equal($('gemHistoryList').children.length,1);
const a=fs.readFileSync('assets/content-admin.js','utf8');c.members=[{name:'운영진',id:'a',balance:30},{name:'회원',id:'b',balance:30},{name:'회원2',id:'c',balance:0}];vm.runInContext(a.slice(a.indexOf(' function matches('),a.indexOf(' async function mutate('))+';renderGemMembers()',c);assert.deepEqual($('gemMembers').children.map(x=>x.children[0].textContent),['1위','1위','3위']);console.log('PASS history safety, close, stale response, retry, all members and tied ranks');})();


