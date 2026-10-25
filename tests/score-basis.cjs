const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),start=html.indexOf('function renderRanking(){'),end=html.indexOf('function renderAll()',start);
const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:''});return elements.get(id);};
el('limit').value='all';el('scoreBasis').value='season';
const data=[{name:'A',rank:1,seasonTotal:90,lifetimeTotal:100},{name:'B',rank:2,seasonTotal:80,lifetimeTotal:300},{name:'C',rank:3,seasonTotal:0,lifetimeTotal:200}].map(x=>({...x,role:'회원',memberId:x.name,date:'',chat:0,photo:0,video:0,intro:0,attendance:0}));
const ctx={DATA:data,document:{getElementById:el},window:{NWMemberVerificationHTML:()=>'',NWPaintRankingAvatars(){}},gradedOnly:false,isStaff:x=>x.role!=='회원',roleOf:x=>x.role,badgeIndexFor:()=>0,fmt:String,rankingAvatarSlot:()=>'',memberBadge:()=>'',staffStar:()=>'',rankMovementBadge:()=>'<movement>'};
vm.createContext(ctx);vm.runInContext(html.slice(start,end),ctx);ctx.renderRanking();assert(el('tb').innerHTML.indexOf('[A]')<el('tb').innerHTML.indexOf('[B]'));assert(!el('tb').innerHTML.includes('[C]'));
el('scoreBasis').value='lifetime';ctx.renderRanking();const table=el('tb').innerHTML;assert(table.indexOf('[B]')<table.indexOf('[C]'));assert(table.indexOf('[C]')<table.indexOf('[A]'));assert(!table.includes('<movement>'));assert.equal(el('leader').textContent,'B · 300점');
el('limit').value='1';ctx.renderRanking();assert(el('tb').innerHTML.includes('[B]'));assert(!el('tb').innerHTML.includes('[A]'));
for(const path of ['index.html','members.html']){const text=fs.readFileSync(__dirname+'/../'+path,'utf8');for(const m of text.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){if(!m[2].trim()||/type=["']?(?:application|importmap)/i.test(m[1]))continue;new vm.Script(m[2]);}}
console.log('PASS score basis sorting, positive-score filter, TOP limit, movement isolation and HTML inline syntax');
