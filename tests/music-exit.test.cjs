const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('assets/music/music-exit.js','utf8');
function setup(mobile=true){
 const nodes={},events={},stack=[{url:'https://outside.example',state:null},{url:'https://newt.example/',state:null}];let pos=1,stopped=0,closed=0;
 const location={href:stack[pos].url,hash:''};
 const sync=()=>{location.href=stack[pos].url;location.hash=new URL(location.href).hash};
 const history={get state(){return stack[pos].state},replaceState(state,_,url){stack[pos]={state,url};sync()},pushState(state,_,url){stack.splice(++pos);stack.push({state,url});sync()},go(delta){pos+=delta;sync()},back(){pos--;sync();events.popstate({stopImmediatePropagation(){}})}};
 const dialog={open:false,setAttribute(){},showModal(){this.open=true},close(){this.open=false}};
 const window={matchMedia:()=>({matches:mobile}),addEventListener:(n,f)=>events[n]=f,close(){closed++},NWMusicAdminAPI:{stopForExit(){stopped++}}};
 const document={createElement:()=>dialog,body:{appendChild(){}},getElementById:id=>nodes[id]??={}};
 vm.runInNewContext(source,{window,document,history,location});return {nodes,dialog,history,events,stack,get pos(){return pos},get stopped(){return stopped},get closed(){return closed}};
}
const a=setup();assert.equal(a.pos,2);a.history.back();assert(a.dialog.open);assert.equal(a.pos,2);a.nodes.nwExitCancel.onclick();assert(!a.dialog.open);assert.equal(a.stopped,0);
a.history.pushState({...a.history.state,nwMusicPlayer:true},'','https://newt.example/');a.history.back();assert(!a.dialog.open,'player back must not request exit');
a.history.pushState({nwPage:'#profile'},'','https://newt.example/#profile');a.history.back();assert(!a.dialog.open,'subpage back must not request exit');
a.history.back();assert(a.dialog.open);a.nodes.nwExitConfirm.onclick();assert.equal(a.stopped,1);assert.equal(a.closed,1);assert.equal(a.pos,0,'confirmation skips both guard entries');
const b=setup(false);assert.equal(b.pos,1);assert(!b.events.popstate);console.log('Mobile exit cancel, player/subpage back, confirm navigation/audio stop, desktop exclusion passed.');
