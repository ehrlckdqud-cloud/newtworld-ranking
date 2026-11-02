// Requires jsdom. Network/authentication/game engine are test doubles.
const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('coop/index.html','utf8'),source=fs.readFileSync('coop/newtworld-entry.mjs','utf8');
async function check({credentials=true,auth=true,leaseError='',mobile=false,core=true}={}){
 const dom=new JSDOM(html,{url:'https://ehrlckdqud-cloud.github.io/newtworld-ranking/coop/',runScripts:'outside-only'}),w=dom.window;let claims=0,loads=0,initializations=0;
 if(credentials){w.localStorage.setItem('nwProfileToken','fixture-token');w.localStorage.setItem('nwProfileDevice','fixture-device');}
 if(mobile)Object.defineProperty(w.navigator,'userAgent',{value:'iPhone Mobile'});
 w.claimSiteSession=async m=>{assert.equal(m.token,'fixture-token');claims++;if(leaseError)throw Error(leaseError);};w.blockSite=message=>{w.document.getElementById('channelView').hidden=true;w.document.getElementById('status').textContent=message;};w.DUPLICATE_MESSAGE='중복 접속';w.initRankings=()=>initializations++;w.initLobby=()=>initializations++;w.lobbyAudio={arm:()=>initializations++};w.__loadPlay=async()=>{loads++;};
 w.document.head.append=node=>{if(node.src.includes('script.google.com'))queueMicrotask(()=>w.nwCoopMemberCheck({ok:true,auth,profile:{nickname:'회원'}}));else if(node.src.includes('core.js'))queueMicrotask(()=>{if(core)w.createMS3=()=>{};node.onload();});};
 await w.eval('(async()=>{'+source.replace(/^import .*;\n/gm,'').replace("import('./play.mjs?v=member-games-1')",'window.__loadPlay()')+'})()');
 const result={claims,loads,initializations,hidden:w.document.getElementById('channelView').hidden,disabled:[...w.document.getElementById('joinForm').elements].every(x=>x.disabled),status:w.document.getElementById('status').textContent};assert.equal(w.document.getElementById('testAccessDialog'),null);w.close();return result;
}
(async()=>{
 let r=await check();assert.equal(r.claims,1);assert.equal(r.loads,1);assert.equal(r.initializations,3);assert.equal(r.hidden,false);assert.equal(r.disabled,false);
 for(const args of [{credentials:false},{auth:false},{mobile:true}]){r=await check(args);assert.equal(r.claims,0);assert.equal(r.loads,0);assert.equal(r.hidden,true);assert.equal(r.disabled,true);}
 for(const leaseError of ['MEMBER_ALREADY_ONLINE','SITE_SESSION_EXPIRED','MEMBER_VERIFICATION_UNAVAILABLE']){r=await check({leaseError});assert.equal(r.claims,1);assert.equal(r.loads,0);assert.equal(r.hidden,true);assert.equal(r.disabled,true);}
 r=await check({core:false});assert.equal(r.hidden,true);assert.equal(r.disabled,true);
 console.log('PASS: member enters without password; anonymous, invalid member, mobile, duplicate/expired/unavailable session and core failures stay blocked; lease claimed exactly once');
})().catch(e=>{console.error(e);process.exitCode=1;});
