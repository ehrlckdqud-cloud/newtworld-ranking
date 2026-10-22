const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../members.html','utf8');
const helpers=html.slice(html.indexOf('let memberVerifiedIds='),html.indexOf('function device(){'));
const escaping=html.slice(html.indexOf('function esc(s)'),html.indexOf('\nreadMemberVerificationCache();'));
const renderer=html.slice(html.indexOf('function renderMembers('),html.indexOf('\n\nlet memberAvatarGeneration'));
function context(response={ok:true,verifiedIds:['NW0014']}){
 const cache=new Map(),timers=new Map();let clock=1000,timer=0;
 const ctx={HUB:{},APP:'https://example.test/app',Set,JSON,Number,String,Math,console,
  Date:{now:()=>clock},document:{hidden:false,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},
  localStorage:{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)},
  setTimeout:(fn,ms)=>{timers.set(++timer,{fn,ms});return timer},clearTimeout:id=>timers.delete(id),
  jsonp:async action=>{ctx.action=action;return ctx.response},response,fmt:n=>String(n),openDetailLocal(){}};
 vm.createContext(ctx);vm.runInContext(helpers+'\n'+escaping+'\n'+renderer,ctx);
 return{ctx,cache,advance:ms=>{clock+=ms}};
}
let count=0;async function test(name,fn){await fn();count++;}
(async()=>{
 await test('approval source is the ranking approval list, independent of profile completion',async()=>{
  const {ctx}=context();await ctx.refreshMemberVerification();assert.equal(ctx.action,'rankingVerification');
  const target={innerHTML:'',querySelectorAll:()=>[]};ctx.renderMembers(target,[{memberId:'NW0014',nickname:'J',role:'회원',rank:6,hasProfile:false,species:[]}]);
  assert(target.innerHTML.includes('인증회원'));assert(target.innerHTML.includes('프로필 미등록'));assert(target.innerHTML.includes('aria-hidden="true"'));
 });
 await test('an unapproved member is not inferred approved from having a profile',async()=>{
  const {ctx}=context();await ctx.refreshMemberVerification();const target={querySelectorAll:()=>[]};
  ctx.renderMembers(target,[{memberId:'NW0999',nickname:'Other',role:'회원',hasProfile:true,species:[]}]);
  assert(target.innerHTML.includes('미인증'));assert(target.innerHTML.includes('프로필 등록'));assert(!target.innerHTML.includes('member-verification-approved'));
 });
 await test('loading and network failure do not mislabel members as unapproved',async()=>{
  const {ctx}=context({ok:false});assert(ctx.directoryVerificationLabel('NW0014').includes('확인 중'));
  await ctx.refreshMemberVerification();assert(ctx.directoryVerificationLabel('NW0014').includes('확인 불가'));assert(!ctx.directoryVerificationLabel('NW0014').includes('미인증'));
 });
 await test('malformed approval payload is rejected',async()=>{
  const {ctx}=context({ok:true,verifiedIds:[{id:'NW0014'}]});await ctx.refreshMemberVerification();assert(ctx.directoryVerificationLabel('NW0014').includes('확인 불가'));
 });
 await test('fresh approval survives a brief failure but expires after two minutes',async()=>{
  const {ctx,advance}=context();await ctx.refreshMemberVerification();ctx.response={ok:false};await ctx.refreshMemberVerification();
  assert(ctx.directoryVerificationLabel('NW0014').includes('인증회원'));advance(120001);
  const text=ctx.directoryVerificationLabel('NW0014');assert(text.includes('확인 불가'));assert(!text.includes('미인증'));assert(!text.includes('인증회원'));
 });
 await test('ranking cache is reused only for the same service and a recent approval snapshot',()=>{
  const {ctx,cache}=context();cache.set('nwRankMeta297',JSON.stringify({app:ctx.APP,at:900,data:{ok:true,verifiedIds:['NW0014']}}));ctx.readMemberVerificationCache();assert(ctx.directoryVerificationLabel('NW0014').includes('인증회원'));
  const other=context();other.cache.set('nwRankMeta297',JSON.stringify({app:'https://other.test',at:900,data:{ok:true,verifiedIds:['NW0014']}}));other.ctx.readMemberVerificationCache();assert(other.ctx.directoryVerificationLabel('NW0014').includes('확인 중'));
 });
 await test('untrusted nickname text remains escaped and list/map use the same badge renderer',async()=>{
  const {ctx}=context();await ctx.refreshMemberVerification();for(const target of [{querySelectorAll:()=>[]},{querySelectorAll:()=>[]}]){
   ctx.renderMembers(target,[{memberId:'NW0014',nickname:'<script>alert(1)</script>',role:'회원',hasProfile:false,species:[]}]);assert(target.innerHTML.includes('&lt;script&gt;'));assert(!target.innerHTML.includes('<script>'));assert(target.innerHTML.includes('인증회원'));
  }
 });
 for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(match[1].trim())new vm.Script(match[1]);
 console.log(count+' member verification/profile distinction cases and inline syntax passed');
})().catch(e=>{console.error(e);process.exitCode=1});
