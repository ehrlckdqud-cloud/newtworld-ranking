import {beginRecord,observeRecord} from './records.mjs';
import {ProtocolError,CLOCK_GRACE} from './room.mjs';
const fail=c=>{throw new ProtocolError(c)};
/** Input-lockstep room admission and paid lifecycle authority. */
export class NativeRoom {
 constructor(room){this.room=room;this.loaded=false;this.completed=false;this.lastSeq=new Map();this.rates=new Map();}
 reset(){const r=this.room;
   r.players.sort((a,b)=>(a.slot===(r.hostSlot||1)?-1:b.slot===(r.hostSlot||1)?1:0));r.hostSlot=1;r.hostEpoch=0;r.nativeCommands=[];r.phase='lobby';this.completed=false;this.loaded=false;this.lastSeq.clear();this.rates.clear();r.players=r.players.filter(q=>!q.departed);r.players.forEach((q,i)=>q.slot=i+1);for(const q of r.players){delete q.lastClockAt;delete q.syncFrame;q.started=false;q.ready=false;q.coreReady=false;q.away=false;q.state='waiting';q.lives=0;}
   r.emit('native-reset',{players:r.roster()});return {phase:r.phase};
 }
 resetIfEmpty(){const r=this.room;if(['native','paused','game-over'].includes(r.phase)&&r.players.length&&r.players.every(p=>p.away||p.departed)){this.reset();return true;}return false;}
 action(p,m){const r=this.room;if(p.role==='viewer'&&!['signal','native-loaded','native-return','native-rejoin'].includes(m.type))fail('SPECTATOR_INPUT');
  if(m.type==='launch-begin'){
   if(p.slot!==(r.hostSlot||1))fail('HOST_ONLY');if(r.phase!=='lobby')fail('NOT_LOBBY');
   if(typeof m.attempt!=='string'||m.attempt.length>100)fail('INVALID_ATTEMPT');
   if(r.launch?.status==='starting'){if(r.launch.attempt===m.attempt)return {launch:r.launch};fail('LAUNCH_IN_PROGRESS');}
   if(r.players.some(q=>!q.connected||!q.ready))fail('ALL_PRESENT_READY_REQUIRED');
   if(r.players.some(q=>!q.coreReady))fail('ALL_CORES_REQUIRED');
   r.launch={attempt:m.attempt,status:'starting',startedAt:r.now(),host:p.name};r.emit('launch-state',{launch:r.launch});return {launch:r.launch};
  }
  if(m.type==='launch-failed'){
   if(p.slot!==(r.hostSlot||1))fail('HOST_ONLY');if(r.phase!=='lobby'||r.launch?.attempt!==m.attempt||r.launch.status!=='starting')return {};
   r.launch={...r.launch,status:'failed',message:String(m.message||'게임 시작에 실패했습니다.').slice(0,500)};r.emit('launch-state',{launch:r.launch});return {launch:r.launch};
  }
  if(m.type==='native-heartbeat'){
   if(r.phase!=='native')return {};
   if(m.epoch!==(r.hostEpoch||0))return {hostSlot:r.hostSlot||1,hostEpoch:r.hostEpoch||0};
   if(!Number.isSafeInteger(m.frame)||m.frame<0)fail('INVALID_FRAME');
   if(p.slot===(r.hostSlot||1)&&m.links!==undefined){
    if(!Array.isArray(m.links)||m.links.length>4||m.links.some(x=>!Number.isInteger(x.slot)||x.slot===p.slot||!r.players.some(q=>q.slot===x.slot)||typeof x.connected!=='boolean'))fail('INVALID_LINKS');
    for(const link of m.links){const q=r.players.find(q=>q.slot===link.slot);if(q.departed||q.reconnecting)continue;if(link.connected)delete q.missingLinkAt;else {q.missingLinkAt??=r.now();if(r.now()-q.missingLinkAt>CLOCK_GRACE)r.depart(q,'INPUT_LINK_TIMEOUT');}}
   }
   p.lastClockAt=r.now();p.syncFrame=m.frame;if(m.frame>0)p.reconnecting=false;return {hostSlot:r.hostSlot||1,hostEpoch:r.hostEpoch||0};
  }
  if(m.type==='native-abandon'){
   if(r.players.filter(q=>!q.departed).length!==1)fail('SOLO_ONLY');
   if(!['native','paused','game-over'].includes(r.phase))fail('NOT_RUNNING');
   r.phase='game-over';this.completed=true;p.away=true;p.input=0;p.state='spectator';p.lives=0;
   r.emit('game-over',{reason:'ABANDONED'});r.emit('native-presence',{slot:p.slot,away:true});return {};
  }
  if(m.type==='native-reset'){
   if(p.slot!==(r.hostSlot||1))fail('HOST_ONLY');if(r.phase==='lobby')return {phase:'lobby'};if(!this.completed&&r.phase!=='game-over')fail('GAME_STILL_RUNNING');
   return this.reset();
  }
  if(m.type==='native-loaded'){if(!['lobby','native'].includes(r.phase))fail('NOT_LOBBY');if(m.protocol!==(r.protocol||'nw-input-lockstep-v78'))fail('CLIENT_UPDATE_REQUIRED');p.coreReady=m.loaded===true;if(p.slot===(r.hostSlot||1))this.loaded=p.coreReady;r.emit('roster',{players:r.roster()});return {};}
  if(m.type==='start-native'){
   if(p.slot!==(r.hostSlot||1))fail('HOST_ONLY');if(!this.loaded)fail('HOST_CORE_REQUIRED');if(r.phase==='native')return {phase:r.phase,players:r.roster(),replayed:true};if(r.phase!=='lobby')fail('NOT_LOBBY');
   if(r.players.some(q=>!q.coreReady))fail('ALL_CORES_REQUIRED');
   if(r.players.length<1||r.players.length>5||r.players.some(q=>!q.connected||!q.ready))fail('ALL_PRESENT_READY_REQUIRED');
   if(r.players.some(q=>q.purchasing))fail('PURCHASE_IN_PROGRESS');
   if(r.players.some(q=>(q.credits||0)<1))fail('ALL_PLAYERS_NEED_COIN');
   if(m.attempt&&r.launch?.attempt!==m.attempt)fail('STALE_LAUNCH');r.launch=null;r.emit('launch-state',{launch:null});r.nativeCommands=[];r.phase='native';for(const q of r.players){q.lastClockAt=r.now();q.syncFrame=0;q.started=false;q.away=false;q.state='waiting';q.lives=3;}
   beginRecord(this);r.emit('native-start',{players:r.roster(),experimental:true,realGems:true});return {phase:r.phase,players:r.roster()};
  }
  if(['native-return','native-rejoin'].includes(m.type)){
   if(m.type==='native-return'&&!['native','game-over','paused'].includes(r.phase))fail('NOT_RUNNING');
   if(m.type==='native-rejoin'&&r.phase!=='native')fail('NOT_RUNNING');
   if(m.type==='native-rejoin'&&this.completed)fail('GAME_COMPLETED');
   p.away=m.type==='native-return';if(p.away)p.recordEntered=false;p.input=0;
   r.emit('native-presence',{slot:p.slot,away:p.away});r.emit('roster',{players:r.roster()});return {};
  }
  if(m.type==='native-resume'){if(p.slot!==(r.hostSlot||1))fail('HOST_ONLY');if(this.completed)fail('GAME_COMPLETED');if(r.phase==='native')return {};if(r.phase!=='paused')fail('NOT_PAUSED');if(!this.loaded)fail('HOST_CORE_REQUIRED');if(r.players.some(q=>!q.departed&&!q.connected))fail('PLAYERS_NOT_CONNECTED');r.phase='native';r.emit('native-resumed',{});return {};}
  if(m.type==='native-pause'){if(p.slot!==(r.hostSlot||1))fail('HOST_ONLY');if(r.phase!=='native')fail('NOT_RUNNING');r.pause('HOST_PAUSED',p.slot);return {};}
  if(m.type==='connection-report'){
   if(p.slot!==(r.hostSlot||1))fail('HOST_ONLY');
   if(!Number.isInteger(m.to)||m.to<1||m.to>5)fail('INVALID_TARGET');
   const allowed={mode:['auto','tls'],stage:['stable','have-local-offer','have-remote-offer','closed'],ice:['new','checking','connected','completed','disconnected','failed','closed'],connection:['new','connecting','connected','disconnected','failed','closed'],input:['none','connecting','open','closing','closed']};
   for(const [key,values]of Object.entries(allowed))if(!values.includes(m[key]))fail('INVALID_DIAGNOSTIC');
   if(typeof m.remoteDescription!=='boolean'||!Array.isArray(m.iceErrors)||m.iceErrors.length>8||m.iceErrors.some(x=>!Number.isInteger(x)||x<0||x>999))fail('INVALID_DIAGNOSTIC');
   this.rate(p.slot,'diagnostic',4);
   console.info('coop-connection',JSON.stringify({room:r.id,to:m.to,mode:m.mode,signaling:m.stage,ice:m.ice,connection:m.connection,input:m.input,remoteDescription:m.remoteDescription,iceErrors:m.iceErrors}));return {};
  }
  if(m.type==='signal'){
   if(!['native','lobby','paused'].includes(r.phase))fail('NOT_RUNNING');
   if(!Number.isInteger(m.to)||m.to<1||m.to===p.slot||![...r.players,...(r.viewers||[])].some(q=>q.slot===m.to))fail('INVALID_TARGET');
   if(p.slot!==(r.hostSlot||1)&&m.to!==(r.hostSlot||1))fail('HOST_LINK_ONLY');
   if(m.signal?.epoch!==(r.hostEpoch||0))fail('STALE_HOST_EPOCH');
   if(!m.signal||typeof m.signal!=='object'||!['offer','answer','candidate','candidates'].includes(m.signal.type))fail('INVALID_SIGNAL');
   if(m.signal.type==='offer'&&p.slot!==(r.hostSlot||1))fail('HOST_OFFER_ONLY');if(m.signal.type==='answer'&&p.slot===(r.hostSlot||1))fail('PEER_ANSWER_ONLY');
   if(m.signal.type==='candidates'&&(!Array.isArray(m.signal.candidates)||m.signal.candidates.length>32||m.signal.candidates.some(c=>!c||typeof c.candidate!=='string')))fail('INVALID_SIGNAL');
   if(JSON.stringify(m.signal).length>48000)fail('SIGNAL_TOO_LARGE');
   this.rate(p.slot,'signal',100);r.emit('signal',{to:m.to,from:p.slot,signal:m.signal});return {};
  }
  if(m.type==='native-input'){
   if(this.completed)fail('GAME_COMPLETED');
   if(r.phase!=='native')fail('NOT_RUNNING');if(p.state==='spectator')fail('SPECTATOR_INPUT');
   if(!Number.isInteger(m.bits)||m.bits<0||m.bits>127)fail('INVALID_INPUT');
   if(!Number.isSafeInteger(m.sequence)||m.sequence<0||m.sequence<=(this.lastSeq.get(p.slot)??-1))fail('STALE_INPUT');
   this.rate(p.slot,'input',90);this.lastSeq.set(p.slot,m.sequence);r.emit('native-input',{slot:p.slot,bits:m.bits});return {};
  }
  if(m.type==='native-state'){
   if(p.slot!==(r.hostSlot||1))fail('HOST_ONLY');if(r.phase!=='native')fail('NOT_RUNNING');
   if(!Array.isArray(m.players)||m.players.length!==r.players.length||m.players.some(x=>!['waiting','active','continue','selecting','spectator'].includes(x.state)||!Number.isInteger(x.lives)||x.lives<0||x.lives>3))fail('INVALID_STATE');
   if(m.completed!==undefined&&typeof m.completed!=='boolean')fail('INVALID_STATE');
   this.rate(p.slot,'state',10);
   m.players.forEach((v,i)=>{r.players[i].state=r.players[i].departed?'spectator':v.state;});observeRecord(this,m);
   if(m.completed===true&&!this.completed){this.completed=true;r.emit('game-complete',{});}
   m.players.forEach((v,i)=>{r.players[i].state=r.players[i].departed?'spectator':v.state;r.players[i].lives=r.players[i].departed?0:v.lives;});r.emit('roster',{players:r.roster()});return {};
  }
  if(m.type==='native-credit-result'){
   if(p.slot!==(r.hostSlot||1))fail('HOST_ONLY');
   const q=r.players[m.slot-1];if(!q||typeof m.accepted!=='boolean')fail('INVALID_RECEIPT');
   if(!q.pendingContinue||q.pendingContinue.id!==m.commandId)return {replayed:true};
   if(!m.accepted){q.credits=(q.credits||0)+1;q.state=q.pendingContinue.previousState;}
   delete q.pendingContinue;r.emit('roster',{players:r.roster()});return {};
  }
  if(m.type==='native-command'){if(p.slot===(r.hostSlot||1)&&m.players)this.action(p,{type:'native-state',players:m.players});
   if(this.completed)fail('GAME_COMPLETED');
   if(r.phase!=='native')fail('NOT_RUNNING');
   if(!['coin','start','continue','revive','select'].includes(m.command))fail('INVALID_COMMAND');
   if(m.command==='coin')fail('PAID_COIN_REQUIRED');
   if(m.command==='start'){
    if(p.started)return {replayed:true};if(!(p.credits>0))fail('PAID_COIN_REQUIRED');p.credits--;p.started=true;
    r.emit('roster',{players:r.roster()});
    const event=r.emit('native-command',{slot:p.slot,command:'start',commandId:(r.nativeCommandId=(r.nativeCommandId||0)+1)});r.nativeCommands=(r.nativeCommands||[]).concat(event).slice(-256);return {event};
   }
   if(p.away)fail('RETURN_TO_GAME_FIRST');
   if(['continue','revive'].includes(m.command)){
    if(p.pendingContinue)fail('CONTINUE_PENDING');
    const immediate=m.command==='continue'&&m.immediate===true&&r.protocol==='nw-input-lockstep-v85'&&p.started&&p.state==='active';
    if(!['continue','spectator'].includes(p.state)&&!immediate)fail('CONTINUE_NOT_AVAILABLE');
    if(!(p.credits>0))fail('PAID_COIN_REQUIRED');
    p.pendingContinue={id:(r.nativeCommandId||0)+1,previousState:p.state};p.credits--;p.state='selecting';r.emit('roster',{players:r.roster()});
   }
   if(m.command==='select'&&(!Number.isInteger(m.character)||m.character<0||m.character>3))fail('INVALID_SELECTION');
   if(p.state==='spectator')fail('SPECTATOR_INPUT');
   this.rate(p.slot,'command',12);const event=r.emit('native-command',{slot:p.slot,command:m.command,character:m.character,commandId:(r.nativeCommandId=(r.nativeCommandId||0)+1)});r.nativeCommands=(r.nativeCommands||[]).concat(event).slice(-256);return {event};
  }
  fail('UNKNOWN_ACTION');
 }
 rate(slot,key,max){const id=slot+':'+key,t=this.room.now();let v=this.rates.get(id);if(!v||t-v.at>=1000){v={at:t,n:0};this.rates.set(id,v);}if(++v.n>max)fail('RATE_LIMIT');}
}
