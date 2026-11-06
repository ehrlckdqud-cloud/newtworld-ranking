const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('assets/music/music-exit.js','utf8');
function setup(mobile=true,native=false,active=true){
 const watchers=[];let changed;
 const nodes={},events={},stack=[{url:'https://outside.example',state:null},{url:'https://newt.example/',state:null}];let pos=1,stopped=0,closed=0;
 const location={href:stack[pos].url,hash:''};
 const sync=()=>{location.href=stack[pos].url;location.hash=new URL(location.href).hash};
 const history={get state(){return stack[pos].state},replaceState(state,_,url){stack[pos]={state,url};sync()},pushState(state,_,url){stack.splice(++pos);stack.push({state,url});sync()},go(delta){pos+=delta;sync()},back(){pos--;sync();events.popstate({stopImmediatePropagation(){}})}};
 const dialog={open:false,setAttribute(){},addEventListener(){},showModal(){this.open=true},close(){this.open=false}};
 const window={matchMedia:()=>({matches:mobile}),addEventListener:(n,f)=>events[n]=f,close(){closed++},NWMusicAdminAPI:{stopForExit(){stopped++}}};
 if(native)window.CloseWatcher=class{constructor(){watchers.push(this)}addEventListener(_,f){this.onclose=f}destroy(){this.destroyed=true}};
 const document={querySelector(){return null},addEventListener(){},createElement:()=>dialog,body:{appendChild(){}},getElementById:id=>nodes[id]??={}};
 vm.runInNewContext(source,{window,document,history,location,navigator:{userAgent:'',userActivation:{hasBeenActive:active,isActive:active}},queueMicrotask:f=>f(),MutationObserver:class{constructor(f){changed=f}observe(){}}});return {window,nodes,dialog,history,events,stack,watchers,changed,get pos(){return pos},get stopped(){return stopped},get closed(){return closed}};
}
const a=setup();assert.equal(a.pos,2);a.history.back();assert(a.dialog.open);assert.equal(a.pos,2);a.nodes.nwExitCancel.onclick();assert(!a.dialog.open);assert.equal(a.stopped,0);
a.history.pushState({...a.history.state,nwMusicPlayer:true},'','https://newt.example/');a.history.back();assert(!a.dialog.open,'player back must not request exit');
a.history.pushState({nwPage:'#profile'},'','https://newt.example/#profile');a.history.back();assert(!a.dialog.open,'subpage back must not request exit');
a.history.back();assert(a.dialog.open);a.nodes.nwExitConfirm.onclick();assert.equal(a.stopped,1);assert.equal(a.closed,1);assert.equal(a.pos,0,'confirmation skips both guard entries');
const b=setup(false);assert.equal(b.pos,1);assert(!b.events.popstate);console.log('Mobile exit cancel, player/subpage back, confirm navigation/audio stop, desktop exclusion passed.');

const c=setup(true,true);assert.equal(c.watchers.length,1);const before=c.pos;c.watchers[0].onclose();assert(c.dialog.open,'system close request opens confirmation without popstate');assert.equal(c.pos,before);c.nodes.nwExitCancel.onclick();assert.equal(c.watchers.length,2);c.history.pushState({...c.history.state,nwMusicPlayer:true},'','https://newt.example/');c.changed();assert(c.watchers[1].destroyed,'player must handle its own back');c.history.back();assert.equal(c.watchers.length,3);console.log('Native close request, cancel rearm and player watcher exclusion passed.');

const d=setup(true,false,false);assert.equal(d.pos,1,'no inactive startup-only guard');d.window.NWExitGuard.prepareForPlayer(true);d.history.pushState({...d.history.state,nwMusicPlayer:true},'','https://newt.example/');d.history.back();assert(!d.dialog.open,'first back returns to main');d.history.back();assert(d.dialog.open,'second back opens exit even without CloseWatcher');d.nodes.nwExitCancel.onclick();d.history.back();assert(d.dialog.open,'cancel preserves next Back protection');console.log('Cold startup -> user player open -> collapse -> main exit -> cancel passed without native watcher.');
