const randomBytes=n=>({toString:format=>{const a=crypto.getRandomValues(new Uint8Array(n));return format==='hex'?[...a].map(v=>v.toString(16).padStart(2,'0')).join(''):btoa(String.fromCharCode(...a)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}});
export const CLOCK_GRACE=30000;
export const BUILD='nw-ms3-input-lockstep-v72';
export const COLORS=['#ff6464','#65afff','#68dc83','#ffc45e','#c892ff'];
export class ProtocolError extends Error {constructor(code){super(code);this.code=code;}}
const fail=c=>{throw new ProtocolError(c)};
const text=(s,n)=>typeof s==='string'&&s.trim()&&[...s.trim()].length<=n&&!/[\u0000-\u001f\u007f]/u.test(s);
export class Room {
 constructor(name,{now=()=>Date.now()}={}){
  this.protocol='nw-input-lockstep-v82';this.hostSlot=1;this.hostEpoch=0;this.nativeCommands=[];this.now=now;this.build=BUILD;this.id=randomBytes(8).toString('hex');this.invite=randomBytes(16).toString('base64url');this.players=[];this.viewers=[];this.nextViewer=6;this.phase='lobby';this.frame=0;this.events=[];this.seq=0;this.pending=new Map();this.hashes=new Map();this.listeners=new Set();this.lastActivity=now();this.emit('created',{});this.owner=this.join(name,BUILD);
 }
 emit(type,data){const event={...data,id:++this.seq,type};this.lastActivity=this.now();this.events.push(event);if(this.events.length>400)this.events.shift();for(const cb of this.listeners)cb(event);return event;}
 join(name,build){if(this.phase!=='lobby')fail('GAME_ALREADY_STARTED');if(build!==BUILD)fail('BUILD_MISMATCH');if(this.players.length>=5)fail('ROOM_FULL');if(!text(name,20))fail('INVALID_NAME');const p={slot:this.players.length+1,name:name.trim(),token:randomBytes(32).toString('base64url'),connected:false,ready:false,away:false,credits:0,character:0,state:'waiting',lives:0,input:0,lastInputSeq:-1,lastSeen:this.now(),chatAt:-Infinity,coinIds:new Set(),chatIds:new Map()};this.players.push(p);this.emit('roster',{players:this.roster()});return p;}
 joinViewer(name,build){if(build!==BUILD)fail('BUILD_MISMATCH');if(!text(name,20))fail('INVALID_NAME');const p={slot:this.nextViewer++,role:'viewer',name:name.trim(),token:randomBytes(32).toString('base64url'),connected:true,ready:false,away:false,state:'spectator',lives:0,credits:0,lastSeen:this.now(),chatAt:-Infinity,coinIds:new Set(),chatIds:new Map()};this.viewers.push(p);return p;}
 audience(){return (this.viewers||[]).filter(p=>!p.departed).map(({slot,name,gradeScore,staffRole,seatId,connected})=>({slot,name,gradeScore,staffRole,seatId,connected,role:'viewer'}));}
 auth(token){if((this.kickedTokens||[]).includes(token))fail('KICKED_FROM_ROOM');const p=[...this.players,...(this.viewers||[])].find(p=>p.token===token);if(!p)fail('UNAUTHORIZED');if(p.departed)fail('PLAYER_DISCONNECTED');p.lastSeen=this.now();return p;}
 roster(){return this.players.map(({slot,name,connected,ready,character,state,lives,away,credits,creditsRevision,departed,gradeScore,staffRole,seatId,started,purchasing,coreReady})=>({slot,name,connected,ready,character,state,lives,gradeScore,staffRole,seatId,coreReady:!!coreReady,started:!!started,purchasing:!!purchasing,away:!!away,departed:!!departed,credits:credits||0,creditsRevision:creditsRevision??0,color:COLORS[slot-1]}));}
 view(){return {hostSlot:this.hostSlot||1,hostEpoch:this.hostEpoch||0,room:this.id,build:BUILD,phase:this.phase,frame:this.frame,players:this.roster(),viewers:this.audience(),nativeFivePlayerReady:false,realGemsEnabled:true};}
 connect(p){p.connected=true;p.lastSeen=this.now();this.emit('roster',{players:this.roster()});}
 resumeMember(memberId,name,build){
  if(build!==BUILD)fail('BUILD_MISMATCH');if(!text(name,20))fail('INVALID_NAME');
  const p=this.players.find(q=>q.memberId===memberId&&q.departed);
  if(!p||this.phase!=='native')fail('GAME_ALREADY_STARTED');
  p.token=randomBytes(32).toString('base64url');p.name=name.trim();p.departed=false;p.connected=true;p.away=false;p.ready=false;p.coreReady=false;p.state='spectator';p.lives=0;p.input=0;p.lastSeen=this.now();
  delete p.lastClockAt;delete p.missingLinkAt;p.reconnecting=true;p.started=true;
  this.emit('native-presence',{slot:p.slot,away:false,returned:true});return p;
 }
 joinRunning(memberId,name,build){
  if(this.phase!=='native')fail('GAME_ALREADY_STARTED');
  if(this.players.some(p=>p.memberId===memberId&&p.departed))return this.resumeMember(memberId,name,build);
  if(build!==BUILD)fail('BUILD_MISMATCH');if(!text(name,20))fail('INVALID_NAME');
  const vacant=this.players.find(p=>p.departed&&!p.pendingContinue&&!p.purchasing);
  if(!vacant&&this.players.length>=5)fail('ROOM_FULL');
  const p={slot:vacant?.slot||this.players.length+1,name:name.trim(),memberId,token:randomBytes(32).toString('base64url'),connected:true,departed:false,reconnecting:true,started:true,ready:false,coreReady:false,away:false,credits:0,character:0,state:'spectator',lives:0,input:0,lastInputSeq:-1,lastSeen:this.now(),chatAt:-Infinity,coinIds:new Set(),chatIds:new Map()};
  if(vacant)this.players[vacant.slot-1]=p;else this.players.push(p);
  this.emit('native-presence',{slot:p.slot,away:false,returned:true,newSeat:true});return p;
 }
 disconnect(p){p.connected=false;p.input=0;p.ready=false;this.emit('roster',{players:this.roster()});if(['diagnostic','native'].includes(this.phase))this.pause('CONNECTION_LOST',p.slot);}
 pause(reason,slot){this.phase='paused';this.pending.clear();this.hashes.clear();for(const p of this.players)p.input=0;this.emit('paused',{reason,slot,frame:this.frame});}
 action(p,msg){if(!msg||typeof msg!=='object')fail('INVALID_MESSAGE');const {type}=msg;if(p.role==='viewer'&&!['chat','ping'].includes(type))fail('SPECTATOR_INPUT');
  if(type==='ready'){if(msg.ready&&!p.coreReady)fail('LOCAL_CORE_REQUIRED');if(this.phase!=='lobby')fail('NOT_LOBBY');if(typeof msg.ready!=='boolean'||!Number.isInteger(msg.character)||msg.character<0||msg.character>3)fail('INVALID_SELECTION');if(msg.ready&&p.purchasing)fail('PURCHASE_IN_PROGRESS');p.ready=msg.ready;p.character=msg.character;this.emit('roster',{players:this.roster()});return {players:this.roster(),revision:this.seq};}
  if(type==='start-game')fail('NATIVE_FIVE_PLAYER_NOT_INTEGRATED');
  if(type==='start-diagnostic'){if(p.slot!==1)fail('HOST_ONLY');if(this.phase!=='lobby')fail('NOT_LOBBY');if(this.players.length!==5||this.players.some(p=>!p.connected||!p.ready))fail('FIVE_READY_REQUIRED');this.phase='diagnostic';for(const q of this.players)q.state='active';this.emit('diagnostic-start',{frame:0,seed:randomBytes(8).toString('hex'),players:this.roster(),game:false});return {};}
  if(type==='chat'){if(!text(msg.text,120)||!text(msg.messageId,80))fail('INVALID_CHAT');if(p.chatIds.has(msg.messageId))return p.chatIds.get(msg.messageId);if(this.now()-p.chatAt<300)fail('CHAT_RATE_LIMIT');p.chatAt=this.now();const event=this.emit('chat',{messageId:msg.messageId,slot:p.slot,name:p.name,spectator:p.state==='spectator',audience:p.role==='viewer',text:msg.text.trim()});p.chatIds.set(msg.messageId,event);if(p.chatIds.size>100)p.chatIds.delete(p.chatIds.keys().next().value);return event;}
  if(type==='input'){if(this.phase!=='diagnostic')fail('NOT_RUNNING');if(p.state!=='active')fail('SPECTATOR_INPUT');if(!Number.isSafeInteger(msg.frame)||msg.frame<this.frame||msg.frame>this.frame+8)fail('FRAME_OUT_OF_WINDOW');if(!Number.isInteger(msg.bits)||msg.bits<0||msg.bits>127)fail('INVALID_INPUT');if(!Number.isSafeInteger(msg.sequence)||msg.sequence<=p.lastInputSeq)fail('STALE_INPUT');let row=this.pending.get(msg.frame);if(row?.has(p.slot))fail('DUPLICATE_FRAME');if(!row){row=new Map();this.pending.set(msg.frame,row);}p.lastInputSeq=msg.sequence;row.set(p.slot,msg.bits);this.drain();return {};}
  if(type==='hash'){if(this.phase!=='diagnostic')fail('NOT_RUNNING');if(!Number.isInteger(msg.frame)||msg.frame<Math.max(0,this.frame-120)||msg.frame>=this.frame||!/^[0-9a-f]{64}$/.test(msg.hash))fail('INVALID_HASH');let row=this.hashes.get(msg.frame);if(!row){row=new Map();this.hashes.set(msg.frame,row);}if(row.has(p.slot))fail('DUPLICATE_HASH');row.set(p.slot,msg.hash);if(new Set(row.values()).size>1){this.pause('DESYNC',p.slot);return {paused:true};}for(const f of this.hashes.keys())if(f<this.frame-120)this.hashes.delete(f);return {};}
  if(type==='ping')return {now:this.now(),frame:this.frame};
  fail('UNKNOWN_ACTION');
 }
 drain(){for(;;){const row=this.pending.get(this.frame),active=this.players.filter(p=>p.state==='active');if(!active.length||!row||active.some(p=>!row.has(p.slot)))return;const inputs=this.players.map(p=>p.state==='active'?row.get(p.slot):0);this.pending.delete(this.frame);this.emit('frame',{frame:this.frame++,inputs});}}
 // A server-authorized epoch fences the old coordinator without renumbering actors.
 depart(p,reason='DISCONNECTED'){
  if(p.departed)return;
  p.connected=false;p.departed=true;p.away=true;p.ready=false;p.state='spectator';p.lives=0;p.input=0;
  this.emit('native-presence',{slot:p.slot,away:true,departed:true,reason});
  if(p.slot===(this.hostSlot||1)){
   const candidates=this.players.filter(q=>!q.departed&&q.connected&&this.now()-(q.lastClockAt??q.lastSeen)<CLOCK_GRACE);
   candidates.sort((a,b)=>(b.syncFrame||0)-(a.syncFrame||0)||a.slot-b.slot);
   const next=candidates[0];
   if(!next){this.phase='closed';this.emit('closed',{reason:'NO_PLAYERS'});return;}
   this.hostSlot=next.slot;this.hostEpoch=(this.hostEpoch||0)+1;
   // Give the new topology time to connect and restore its common checkpoint.
   for(const q of candidates){q.lastClockAt=this.now();delete q.missingLinkAt;}
   this.emit('coordinator-changed',{hostSlot:this.hostSlot,hostEpoch:this.hostEpoch,reason,players:this.roster(),commands:this.nativeCommands||[]});
  }
  this.emit('roster',{players:this.roster()});
 }
 // Trusted future emulator adapter only: these are deliberately NOT HTTP actions.
 nativeDeath(slot){const p=this.players[slot-1];if(!p||p.state!=='active')fail('INVALID_LIFECYCLE');p.lives=Math.max(0,p.lives-1);if(!p.lives){p.state='continue';p.continueDeadline=this.now()+10000;p.input=0;}this.emit('roster',{players:this.roster()});}
 grantTestCoin(slot,id){const p=this.players[slot-1];if(!p||!text(id,80))fail('INVALID_COIN');if(p.coinIds.has(id))return false;if(p.state==='spectator'||p.state==='active'&&p.lives>0)fail('COIN_NOT_ALLOWED');if(p.state==='continue'&&this.now()>=p.continueDeadline)fail('CONTINUE_EXPIRED');p.coinIds.add(id);p.lives=3;p.state='active';delete p.continueDeadline;this.emit('test-coin',{slot,id,lives:3,realGems:false});return true;}
 tick(checkClock=true){if(checkClock&&this.phase==='native'){for(const p of this.players)if(!p.departed&&p.lastClockAt!==undefined&&this.now()-p.lastClockAt>CLOCK_GRACE)this.depart(p,'CLOCK_TIMEOUT');}
 const previous=(this.viewers||[]).length;this.viewers=(this.viewers||[]).filter(p=>this.now()-p.lastSeen<=25000);if(this.viewers.length!==previous)this.emit('audience',{viewers:this.audience()});for(const p of this.players){if(p.state==='continue'&&this.now()>=p.continueDeadline){p.state='spectator';p.input=0;this.emit('spectator',{slot:p.slot});}if(p.connected&&this.now()-p.lastSeen>30000){
 if(this.phase==='diagnostic'){this.disconnect(p);continue;}
 p.connected=false;p.ready=false;p.input=0;
 if(['native','paused'].includes(this.phase)){this.depart(p);continue;}
 if(p.slot===(this.hostSlot||1)){this.phase='closed';this.emit('closed',{reason:'HOST_DISCONNECTED'});return;}
 if(this.phase==='lobby'){p.departed=true;}else{p.departed=true;p.away=true;p.state='spectator';p.lives=0;this.emit('native-presence',{slot:p.slot,away:true,departed:true});}
 this.emit('roster',{players:this.roster()});
 }}
 if(this.phase==='lobby'&&this.players.some(p=>p.departed)){this.players=this.players.filter(p=>!p.departed);this.players.forEach((p,i)=>p.slot=i+1);this.emit('roster',{players:this.roster()});}
 if(this.phase!=='closed'&&this.players.length&&this.players.every(p=>p.state==='spectator')&&this.phase!=='game-over'){this.phase='game-over';this.emit('game-over',{});}}
}
