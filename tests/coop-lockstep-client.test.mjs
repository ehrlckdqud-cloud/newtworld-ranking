import {createFramePresentation} from '../coop/frame-presentation.mjs';
// Actual browser controller functions with in-memory ordered links. Native cores are tested separately.
import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {InputSequencer,FrameQueue,INPUT_DELAY,PROTOCOL,stateHash} from '../coop/lockstep.mjs';
import {SnapshotReceiver,sendSnapshot} from '../coop/lockstep-snapshot.mjs';
const src=readFileSync(new URL('../coop/play.mjs',import.meta.url),'utf8');
const code=src.slice(src.indexOf('async function event(e)'),src.indexOf('async function initAudio()'))+src.slice(src.indexOf('function applyCommand('),src.indexOf('\nrequestAnimationFrame(tick);'))+'\n'+src.slice(src.indexOf('function sendControl('),src.indexOf('let warmingPeers='))+'\n'+src.slice(src.indexOf('async function migrateCoordinator('),src.indexOf('async function clockHeartbeat('));
const sleep=()=>new Promise(r=>setImmediate(r));
for(const count of [1,2,3,4,5])test(`actual ${count}-client startup uses local frames, synchronized commands, no media tracks`,async()=>{
 const clients=[],pcs=new Map();let next=0;const notes=[];class Channel{constructor(label){this.label=label;this.readyState='connecting';this.bufferedAmount=0;this.chain=Promise.resolve();}send(data){this.chain=this.chain.then(async()=>{await sleep();await this.other.onmessage?.({data});});}close(){this.readyState='closed';}}
 class PC{constructor(){this.id=++next;pcs.set(this.id,this);this.connectionState='new';this.iceConnectionState='new';this.signalingState='stable';}createDataChannel(label){return this.ch=new Channel(label);}async createOffer(){return {type:'offer',sdp:String(this.id)};}async createAnswer(){return {type:'answer',sdp:String(this.id)};}async setLocalDescription(d){this.localDescription=d;if(d.type==='answer'){this.connectionState=this.remote.connectionState='connected';this.ch.readyState=this.remote.ch.readyState='open';queueMicrotask(()=>{this.ch.onopen?.();this.remote.ch.onopen?.();});}}async setRemoteDescription(d){this.remoteDescription=d;if(d.type==='offer'){this.remote=pcs.get(+d.sdp);this.remote.remote=this;this.ch=new Channel(this.remote.ch.label);this.ch.other=this.remote.ch;this.remote.ch.other=this.ch;this.ondatachannel({channel:this.ch});}}async addIceCandidate(){}close(){this.connectionState='closed';}}
 function engine(){return {playerCount:3,frame:1400,phase:'attract',players:Array.from({length:5},(_,i)=>({slot:i+1,state:'waiting',character:0})),step(inputs){this.frame++;this.inputs=Array.from(inputs);},start(){this.phase='playing';},ram(){return new Uint8Array([this.frame&255]);},checkpoint(){return {frame:this.frame,phase:this.phase,players:this.players,inputs:this.inputs||[0,0,0,0,0]};},removePlayer(slot){this.players[slot-1].departed=true;},quickContinue(slot){this.players[slot-1].departed=false;},addSeat(slot){this.playerCount=Math.max(this.playerCount,slot);this.players[slot-1].departed=true;},authorizeContinue(){},authorizeRejoin(slot){this.players[slot-1].departed=false;}};}
 const roster=Array.from({length:count},(_,i)=>({slot:i+1,name:'P'+(i+1),ready:true,connected:true,character:0}));
 for(let slot=1;slot<=count;slot++){const nodes=new Map();const c={diagnostics:{record(){},save(){}},framePresentation:createFramePresentation(()=>{},()=>{}),hostSlot:1,hostEpoch:0,migrationBusy:false,migrationRetry:null,publishedState:"",audioNext:0,receivedCommands:new Map(),commandResults:new Map(),clockHeartbeat:async()=>{},session:{slot,room:'test'},roster:structuredClone(roster),viewers:[],coreReady:true,hasGame:false,engine:engine(),module:{_nw_fps:()=>60,_nw_redraw(){},_nw_credits(){}},config:{},peers:new Map(),sequencer:null,frameQueue:null,synced:false,syncFault:false,hashes:new Map(),handledCommands:new Set(),startApprovals:new Set(),held:[0,0,0,0,0],bits:slot,clock:0,lastTick:0,lastProgress:0,waitingNotice:false,viewer:false,away:false,playing:false,completed:false,creditReceipts:new Map(),InputSequencer,FrameQueue,INPUT_DELAY,PROTOCOL,stateHash,SnapshotReceiver,RTCPeerConnection:PC,crypto,performance,document:{hidden:false},window:{nwGameStarted(){}},$:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);},makeHUD:()=>()=>{},makeResults:()=>()=>{},ctx:{},audio(){},renderLocalFrame(){},render(){},note:m=>notes.push(m),resetGameInput(){},peerOptions:()=>({}),createCandidateBatcher:()=>({add(){},cancel(){}}),gatherDescription:async pc=>pc.localDescription,requestAnimationFrame(){},redrawLocal(){},flushCreditReceipts:async()=>{},safe:p=>Promise.resolve(p).catch(e=>{throw e;}),chatPresentation:{receive(){}},setAway(){},discardPeer(slot){const r=c.peers.get(slot);r?.pc.close();c.peers.delete(slot);},stop(m){throw Error(m);},captureState(m,e,frame){return {frame,engine:e.checkpoint(),bytes:new Uint8Array([1,2,3])};},sendSnapshot,restoreState(m,e,state){Object.assign(e,structuredClone(state.engine));},apiFetch:async()=>({ok:true,json:async()=>({hostEpoch:c.hostEpoch})}),act:async m=>{if(m.type==='signal')await clients[m.to-1].event({type:'signal',to:m.to,from:slot,signal:m.signal});},setTimeout,clearTimeout};vm.createContext(c);vm.runInContext(code,c);clients.push(c);}
 for(const c of clients)await c.event({type:'native-start',players:structuredClone(roster)});
 for(let i=0;i<30;i++)await sleep();assert(clients.every(c=>c.synced),'all clients initialized');
 for(let slot=1;slot<=count;slot++)await clients[0].event({type:'native-command',command:'start',slot,commandId:slot});
 for(let i=1;i<=180;i++){for(const c of clients)c.tick(i*17);for(let j=0;j<4;j++)await sleep();}
 assert(clients.every(c=>c.frameQueue.frame>140));assert(clients.every(c=>c.engine.phase==='playing'));assert(clients.every(c=>!c.syncFault));for(const c of clients)assert.equal(c.module.onVideo,c.renderLocalFrame);assert(!src.includes('captureStream('));assert(!src.includes('.addTrack('));assert(!src.includes("$('video')"));
 if(count===3){
  const host=clients[0],returning=clients[2];
  for(const c of clients.slice(0,2))await c.event({type:'native-presence',slot:3,away:true,departed:true,id:500});
  returning.synced=false;returning.discardPeer(1);
  let time=180*17;for(let f=0;f<20;f++){time+=17;for(const c of clients.slice(0,2))c.tick(time);for(let k=0;k<4;k++)await sleep();}
  const before=host.frameQueue.frame;
  for(const c of clients)await c.event({type:'native-presence',slot:3,away:false,returned:true,id:501});
  for(let k=0;k<40;k++)await sleep();assert(returning.synced,'returning player receives full state');
  await host.event({type:'native-command',command:'revive',slot:3,commandId:502});
  for(let f=0;f<80;f++){time+=17;for(const c of clients)c.tick(time);for(let k=0;k<4;k++)await sleep();}
  assert(clients.every(c=>c.frameQueue.frame>before+60));assert(clients.every(c=>!c.engine.players[2].departed));assert(clients.every(c=>!c.syncFault));
  const hashFrame=[...host.hashes.keys()].at(-1),beforeRepair=host.frameQueue.frame;
  await host.peers.get(3).control.onmessage({data:JSON.stringify({type:'hash',frame:hashFrame,hash:'bad-hash'})});
  for(let k=0;k<40;k++)await sleep();
  for(let f=0;f<100;f++){time+=17;for(const c of clients)c.tick(time);for(let k=0;k<4;k++)await sleep();}
  assert(clients.every(c=>!c.syncFault),'one divergent peer does not stop everyone');assert(clients.every(c=>c.frameQueue.frame>beforeRepair+60),'peer repair resumes common frames');

 }
 if(count>1){
  let live=clients.slice(),epoch=0,time=180*17;
  // Voluntary non-coordinator departure, then consecutive coordinator losses.
  if(count>=4){const leaving=live.pop();for(const c of live)await c.event({type:'native-presence',slot:leaving.session.slot,away:true,departed:true,id:100});}
  while(live.length>1){
   const dead=live.shift(),newHost=live[0].session.slot,before=live[0].frameQueue.frame;
   const oldRecord=live[0].peers.get(dead.session.slot);
   const updated=structuredClone(live[0].roster);updated[dead.session.slot-1].departed=true;updated[dead.session.slot-1].connected=false;
   epoch++;
   // Deliver server events to followers first so offers see the new epoch.
   for(const c of [...live].reverse())await c.event({type:'coordinator-changed',hostSlot:newHost,hostEpoch:epoch,players:updated,commands:[]});
   if(oldRecord)await oldRecord.control.onmessage({data:JSON.stringify({type:'sync-fault',message:'stale coordinator'})});
   for(let k=0;k<40;k++)await sleep();
   assert(live.every(c=>c.synced),'snapshot synchronized after coordinator departure');
   for(let f=0;f<100;f++){time+=17;for(const c of live)c.tick(time);for(let k=0;k<4;k++)await sleep();}
   assert(live.every(c=>c.frameQueue.frame>before+80),'survivors continue frames');
   assert(live.every(c=>c.engine.players[dead.session.slot-1].departed),'departed actor removed');
   assert(live.every(c=>!c.syncFault),'no stale authority or state mismatch');
  }
 }

});
