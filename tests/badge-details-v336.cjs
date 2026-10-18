const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/index.html','utf8');
const listeners={},nodes={},ctx={window:{},document:{getElementById:id=>nodes[id]}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root+'/assets/badges/grades-v335.js','utf8'),ctx);
for(const id of ['badgeGrid','unlockCount','tb','cards','q','limit','leader','cut10','cut20','memberCount'])nodes[id]={innerHTML:'',textContent:'',value:id==='limit'?'all':''};
vm.runInContext(`const BADGES=window.NWGrades.levels;let DATA=[{lifetimeTotal:3902}];const fmt=n=>String(n);let gradedOnly=false;
function isStaff(){return false}function staffStar(){return ''}function rankMovementBadge(){return ''}function rankingAvatarSlot(){return ''}function roleOf(){return ''}`,ctx);
for(const name of ['badgeIndexFor','unlockState','renderBadgeLadder','memberBadge']){const start=html.indexOf('function '+name+'(');vm.runInContext(html.slice(start,html.indexOf('\n',start)),ctx);}
vm.runInContext('renderBadgeLadder()',ctx);assert.equal((nodes.badgeGrid.innerHTML.match(/role="button"/g)||[]).length,2);assert.equal((nodes.badgeGrid.innerHTML.match(/aria-haspopup="dialog"/g)||[]).length,2);
ctx.window.NWLatestRankingMeta330={badgeUnlocked:[true,true,true,true,true,true,true]};vm.runInContext('renderBadgeLadder()',ctx);assert.equal((nodes.badgeGrid.innerHTML.match(/role="button"/g)||[]).length,7);
ctx.window.NWMemberVerificationHTML=()=>'';
const renderStart=html.indexOf('function renderRanking(){');vm.runInContext(html.slice(renderStart,html.indexOf('function renderAll()',renderStart)),ctx);
vm.runInContext(`DATA=[0,1000,3000,10000,30000,50000,100000,200000].map((score,i)=>({rank:i+1,name:'test'+i,lifetimeTotal:score,seasonTotal:1}));renderRanking()`,ctx);
for(let i=0;i<=7;i++){assert(nodes.tb.innerHTML.includes('data-rank-tier="'+i+'"'));assert(nodes.cards.innerHTML.includes('data-rank-tier="'+i+'"'));}
function element(){return {events:{},addEventListener(t,f){this.events[t]=f},setAttribute(){},removeAttribute(k){delete this[k]},focus(){this.focused=true}}}
const grid=element();grid.contains=()=>true;grid.querySelector=()=>card;
const image=element(),title=element(),caption=element(),close=element(),dialog=element();
dialog.querySelector=t=>({img:image,h2:title,p:caption,button:close}[t]);dialog.showModal=()=>{dialog.open=true};dialog.close=()=>{dialog.open=false;dialog.events.close()};dialog.getBoundingClientRect=()=>({left:10,right:100,top:10,bottom:100});
const card={dataset:{badgeIndex:'0'},classList:{contains:()=>true},isConnected:true,focus(){this.focused=true}};
ctx.document={getElementById:()=>grid,createElement:()=>dialog,body:{append(){}},documentElement:{style:{overflow:'auto'}}};ctx.window.unlockState=()=>[true,true,false,false,false,false,false];
vm.runInContext(fs.readFileSync(root+'/assets/badges/badge-details-v336.js','utf8'),ctx);
function activate(type,key){grid.events[type]({type,key,target:{closest:()=>card},preventDefault(){}})}
activate('click');assert(dialog.open);assert(image.src.endsWith('rank-1.webp'));assert.equal(ctx.document.documentElement.style.overflow,'hidden');close.events.click();assert(!dialog.open);assert(card.focused);assert.equal(ctx.document.documentElement.style.overflow,'auto');
card.dataset.badgeIndex='2';activate('click');assert(!dialog.open);assert(!image.src); // locked artwork never opened
card.dataset.badgeIndex='1';activate('keydown','Enter');assert(dialog.open);assert(image.src.endsWith('rank-2.webp'));dialog.events.click({target:dialog,clientX:0,clientY:0});assert(!dialog.open);
activate('keydown',' ');assert(dialog.open);dialog.close();
activate('keydown','ArrowRight');assert(!dialog.open);
for(const name of ['index.html','profile.html'])for(const [,attrs,code] of fs.readFileSync(root+'/'+name,'utf8').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!/\bsrc\s*=/.test(attrs)&&code.trim())new vm.Script(code);
console.log('Unlocked click/keyboard zoom, locked rejection, close/focus/scroll restoration, PC/mobile tier boundaries and syntax passed');
