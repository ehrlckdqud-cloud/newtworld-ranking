const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../members.html','utf8');
const helpers=html.slice(html.indexOf('let memberVerifiedIds='),html.indexOf('function device(){'));
const sortAndSearch=html.slice(html.indexOf('function norm(s)'),html.indexOf('function renderMembers('));
const elements=Object.fromEntries(['q','region','species','breeding','memberSort','memberSortHint','searchError','count','results'].map(k=>[k,{value:'',textContent:'',innerHTML:''}]));
elements.memberSort.value='rank';let clock=1000;
const members=[
 {memberId:'NW1',nickname:'하늘',hasProfile:false,rank:1,region:'부산'},
 {memberId:'NW2',nickname:'나무',hasProfile:true,rank:2,region:'부산'},
 {memberId:'NW3',nickname:'가람',hasProfile:false,rank:3,region:'부산'},
 {memberId:'NW4',nickname:'다온',hasProfile:true,rank:4,region:'서울'},
 {memberId:'NW5',nickname:'가온',hasProfile:true,rank:5,region:'부산'},
 {memberId:'NW6',nickname:'가을',hasProfile:false,rank:6,region:'서울'}
];
const ctx={Intl,Set,JSON,Number,String,Math,Date:{now:()=>clock},HUB:{},MEMBERS:members,APP:'test',
 document:{hidden:false,getElementById:id=>elements[id],querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},
 localStorage:{setItem(){},getItem(){return null}},setTimeout:()=>1,clearTimeout(){},
 $:id=>elements[id],renderMembers:(el,arr)=>ctx.rendered=arr,jsonp:async()=>ctx.response};
vm.createContext(ctx);vm.runInContext(helpers+'\n'+sortAndSearch,ctx);
const ids=arr=>Array.from(arr,m=>m.memberId);let cases=0;
(async()=>{
 ctx.response={ok:true,verifiedIds:['NW1','NW2','NW3','NW4']};
 await ctx.refreshMemberVerification();
 assert.deepEqual(ids(ctx.searchLocal()),['NW1','NW2','NW3','NW4','NW5','NW6']);cases++;
 elements.memberSort.value='verified';
 assert.deepEqual(ids(ctx.searchLocal()),['NW2','NW4','NW3','NW1','NW5','NW6']);
 assert.deepEqual(ids(members),['NW1','NW2','NW3','NW4','NW5','NW6']);cases++;
 elements.region.value='부산';assert.deepEqual(ids(ctx.searchLocal()),['NW2','NW3','NW1','NW5']);
 elements.q.value='가';assert.deepEqual(ids(ctx.searchLocal()),['NW3','NW5']);cases++;
 elements.q.value='';elements.region.value='';ctx.response={ok:true,verifiedIds:['NW1','NW2','NW3','NW4','NW5']};
 await ctx.refreshMemberVerification();assert.deepEqual(ids(ctx.rendered),['NW5','NW2','NW4','NW3','NW1','NW6']);cases++;
 clock+=120001;ctx.paintMemberVerification();assert.deepEqual(ids(ctx.rendered),ids(members));
 assert(elements.memberSortHint.textContent.includes('임시 순위순'));cases++;
 elements.memberSort.value='rank';ctx.searchLocal();assert.equal(elements.memberSortHint.textContent,'');cases++;
 assert(html.includes('label for="memberSort"'));assert(html.includes("$('memberSort').onchange=searchLocal"));
 console.log(`${cases} directory sorting cases passed`);
})().catch(e=>{console.error(e);process.exitCode=1});
