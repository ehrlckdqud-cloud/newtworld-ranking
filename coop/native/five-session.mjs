/** Cooperative host lifecycle. Native continue/selection rendering is still a release gate. */
export class FiveSession {
 constructor(module,profile,{characters=[0,1,2,3,0],sharedSelection=false,playerCount=characters.length,paid=false}={}){
  if(!Number.isInteger(playerCount)||playerCount<1||playerCount>5||characters.length<playerCount||characters.length>5||characters.some(x=>!Number.isInteger(x)||x<0||x>3))throw Error('INVALID_CHARACTERS');
  this.paid=paid;this.paidInitialCoin=paid;this.paidContinuePending=false;this.approvedCredits=new Set();this.playerCount=playerCount;characters=Array.from({length:5},(_,i)=>characters[i]??0);
  this.sharedSelection=sharedSelection;this.selection=null;this.selectionPrevious=[0,0,0,0,0];this.m=module;this.x=profile.experiment;this.frame=0;this.phase='attract';this.completionFrame=null;this.inputs=[0,0,0,0,0];this.coinPulse=0;this.startPulse=0;this.events=[];this.reserved=new Set();this.pendingStart=false;
  this.status=[0x10023c,0x1002ec,0x1052ac,0x10509c,0x104e8c];this.weapon=[0x10eaf0,0x10eafe,0x10538c,0x10517c,0x104f6c];
  this.players=characters.map((character,i)=>({slot:i+1,character,participating:i<playerCount,lives:i<playerCount?3:0,state:i<playerCount?'waiting':'spectator',deadline:null,seenAlive:false,coinIds:[]}));
  this.reserve=[0x1051fc,0x1052ac,0x10535c,0x104fec,0x10509c,0x10514c,0x104ddc,0x104e8c,0x104f3c,this.x.inputBase];
 }
 ram(){return new Uint8Array(this.m.HEAPU8.buffer,this.m._nw_ram(),65536)}byte(a){return this.ram()[(a&65535)^1]}wb(a,v){this.ram()[(a&65535)^1]=v}word(a){const r=this.ram();return r[a&65535]|r[(a+1)&65535]<<8}ww(a,v){const r=this.ram();r[a&65535]=v&255;r[(a+1)&65535]=v>>>8&255}long(a){return ((this.word(a)<<16)|this.word(a+2))>>>0}wl(a,v){this.ww(a,v>>>16);this.ww(a+2,v)}clear(a,n){this.ram().fill(0,a&65535,(a&65535)+n)}
 emit(type,fields={}){this.events.push({frame:this.frame,type,...fields});if(this.events.length>500)this.events.shift();}
 removeFree(a){let prev=0x10540c,cur=this.long(prev);for(let n=0;cur&&n<120;n++){if(cur===a){this.wl(prev,this.long(cur+8));this.ww(0x105410,this.word(0x105410)-1);return true;}prev=cur+8;cur=this.long(prev);}return false;}
 reserveDuringBoot(){for(const a of this.reserve)if(this.removeFree(a)){this.clear(a,0xb0);this.reserved.add(a);}}
 linked(a){const p=this.long(a+4),n=this.long(a+8);return p>=0x100000&&p<0x110000&&n>=0x100000&&n<0x110000&&this.long(p+8)===a&&this.long(n+4)===a;}
 detach(a){if(this.linked(a)){this.wl(this.long(a+4)+8,this.long(a+8));this.wl(this.long(a+8)+4,this.long(a+4));}}
 insert(a){this.detach(a);const before=0x1005ac,after=this.long(before+8);this.wl(before+8,a);this.wl(after+4,a);this.wl(a+4,before);this.wl(a+8,after);}
 coin(){if(this.phase!=='attract')throw Error('USE_PER_PLAYER_CONTINUE');this.coinPulse=5;}
 start(){if(this.phase!=='attract')throw Error('ALREADY_STARTED');this.pendingStart=true;this.startPulse=5;this.startConfirmAt=this.frame+48;}
 begin(){if(this.reserved.size!==this.reserve.length)throw Error('RESERVATION_INCOMPLETE');
  for(let i=0;i<5;i++){
   const a=this.x.actors[i],s=this.status[i],p=this.players[i];
   if(i>=this.playerCount||p.departed){this.wl(a,0x567a);this.wl(s,0x567a);this.wb(s+0x7f,0);this.wb(s+0x82,0);if(i>=2)this.wb(0x1053e0-(i-2)*0x210,0);continue;}
   this.wb(s+0x7f,3);this.wb(s+0x7e,p.character);this.wb(s+0x82,2);this.wl(s,0x567a);
   if(i>=2){this.ww(a+0x12,0xffff);this.wl(s+0x6c,a);this.wb(0x1053e0-(i-2)*0x210,1);this.ww(0x105380-(i-2)*0x210,65535);this.wb(0x105404-(i-2)*0x210,255);}
   if(i===0){p.character=this.word(a+0x6a);p.state='active';p.seenAlive=true;}else this.respawn(i);
  }
  this.phase='playing';this.pendingStart=false;this.m._nw_hud(1);this.emit('five-session-start');
 }
 respawn(i){if(i>=this.playerCount)throw Error('EMPTY_SEAT');const a=this.x.actors[i],p=this.players[i];this.removeFree(a);if(i>=2)this.insert(a);this.wl(a,this.x.spawns[i]);this.ww(a+0x6c,i);this.ww(a+0x6a,p.character);this.wl(a+0x80,this.weapon[i]);this.wb(a+0x5a,1<<i);this.wl(a+0xc,0);this.ww(a+0x10,0);this.wb(this.status[i]+0x7f,p.lives);this.wb(this.status[i]+0x82,2);if(i>=2)this.wb(0x1053e0-(i-2)*0x210,1);p.state='active';p.seenAlive=false;p.deadline=null;p.spawnSpacing=true;this.emit('respawn',{slot:i+1,character:p.character,lives:p.lives});}
 addSeat(slot){
  if(!Number.isInteger(slot)||slot<1||slot>5)throw Error('EMPTY_SEAT');
  const i=slot-1,p=this.players[i];this.playerCount=Math.max(this.playerCount,slot);
  if(p.state==='active')this.removePlayer(slot);
  p.departed=true;p.participating=false;p.state='spectator';p.lives=0;p.deadline=null;
  if(i>=2){this.ww(this.x.actors[i]+0x12,0xffff);this.wl(this.status[i]+0x6c,this.x.actors[i]);this.ww(0x105380-(i-2)*0x210,65535);this.wb(0x105404-(i-2)*0x210,255);}
 }
 quickContinue(slot,id,rejoin=false){
  const ok=rejoin?this.authorizeRejoin(slot,id):this.authorizeContinue(slot,id);if(!ok)return false;
  if(this.nativeContinue&&slot===1)this.autoContinue=true;
  else this.selectCharacter(slot,this.players[slot-1].character);
  return true;
 }
 removePlayer(slot){const i=slot-1,p=this.players[i];if(!p||p.departed)return;p.departed=true;p.participating=false;p.state='spectator';p.lives=0;p.deadline=null;const a=this.x.actors[i];this.detach(a);this.wl(a,0x567a);this.wl(this.status[i],0x567a);this.wb(this.status[i]+0x7f,0);this.wb(this.status[i]+0x82,0);this.wb(this.x.inputBase+i*2,0);this.wb(this.x.inputBase+0x10+i,0);if(i>=2)this.wb(0x1053e0-(i-2)*0x210,0);if(this.selection)this.selection[i].confirmed=true;this.emit('player-departed',{slot});}
 separateSpawn(i){const p=this.players[i],a=this.x.actors[i];if(!p.spawnSpacing||this.long(a)===this.x.spawns[i]||!this.word(a+0x3c))return;p.spawnSpacing=false;let x=this.word(a+0x3c),y=this.word(a+0x40),shift=0;for(let j=0;j<i;j++){const other=this.x.actors[j];if(this.players[j].state==='active'&&Math.abs(y-this.word(other+0x40))<16&&Math.abs(x+shift-this.word(other+0x3c))<16)shift+=20;}if(shift&&x+shift<288){this.ww(a+0x28,this.word(a+0x28)+shift);this.ww(a+0x3c,x+shift);}}
 requestContinue(slot,id){const p=this.players[slot-1];if(!p||typeof id!=='string'||!id||id.length>100)throw Error('INVALID_CONTINUE');if(p.coinIds.includes(id))return false;if(p.state!=='continue'||this.frame>=p.deadline)throw Error('CONTINUE_EXPIRED');p.coinIds.push(id);p.state='selecting';p.deadline=null;this.emit('continue-selection',{slot});return true;}
 authorizeContinue(slot,id){
  if(this.approvedCredits.has(id))return false;
  const p=this.players[slot-1];if(!p)throw Error('EMPTY_SEAT');
  if(this.nativeContinue&&slot===1){this.paidContinuePending=true;this.approvedCredits.add(id);return true;}
  if(p.state==='spectator'&&this.phase==='playing'){p.departed=false;p.participating=true;p.state='selecting';p.deadline=null;this.approvedCredits.add(id);return true;}
  const ok=this.requestContinue(slot,id);this.approvedCredits.add(id);return ok;
 }
 authorizeRejoin(slot,id){
  if(this.approvedCredits.has(id))return false;
  if(this.phase!=='playing'||!this.players.some(p=>p.state==='active'))throw Error('NO_ACTIVE_TEAMMATE');
  const p=this.players[slot-1];if(!p||!['continue','spectator'].includes(p.state))throw Error('REJOIN_NOT_AVAILABLE');
  p.departed=false;p.participating=true;p.state='selecting';p.deadline=null;this.approvedCredits.add(id);return true;
 }
 selectCharacter(slot,character){const p=this.players[slot-1];if(!p||p.state!=='selecting'||!Number.isInteger(character)||character<0||character>3)throw Error('INVALID_SELECTION');p.character=character;p.lives=3;this.wb(this.status[slot-1]+0x7e,character);this.respawn(slot-1);}
 cancelContinueWait(slot,life){const p=this.players[slot-1];if(p?.state==='continue'&&p.continueLife===life){p.continueWaitUntil=null;p.continueWaitUsed=true;}}
 continueInput(inputs,previous){
  // Test credits only. A paid deployment must authorize coin spending on the server.
  const order=[0,2,1,3];
  for(let i=0;i<5;i++){
   const p=this.players[i],edge=inputs[i]&~previous[i];
   if(p.state==='continue'){
    if(this.paid&&(edge&16)&&!p.continueWaitUsed&&this.frame<p.deadline){p.continueWaitUsed=true;p.continueWaitUntil=this.frame+Math.ceil(this.m._nw_fps()*12);}
    if(this.paid&&p.continueWaitUntil>this.frame)p.deadline++;
    if(!this.paid&&(edge&16)&&this.frame<p.deadline)this.requestContinue(i+1,`keyboard-${this.frame}-${i}`);
   }else if(p.state==='selecting'){
    let at=order.indexOf(p.character);
    if(edge&4)at=(at+3)%4;if(edge&8)at=(at+1)%4;
    p.character=order[at];
    if(edge&16)this.selectCharacter(i+1,p.character);
   }
  }
 }
 selectionInput(inputs){
  if(!this.sharedSelection||this.long(0x10023c)!==0x432d4)return inputs[0];
  if(!this.selection){this.selection=this.players.map((p,i)=>({character:p.character,confirmed:i>=this.playerCount||!!p.departed}));this.selectionPrevious=inputs.slice();this.emit('five-selection-open');}
  const order=[0,2,1,3];
  for(let i=0;i<5;i++){const q=this.selection[i],edge=inputs[i]&~this.selectionPrevious[i];if(!q.confirmed){let at=order.indexOf(q.character);if(edge&4)at=(at+3)%4;if(edge&8)at=(at+1)%4;q.character=order[at];if(edge&16){q.confirmed=true;this.players[i].character=q.character;this.emit('selection-confirmed',{slot:i+1,character:q.character});}}}
  this.selectionPrevious=inputs.slice();this.wb(0x1002ba,this.selection[0].character);
  if(this.selection.every(p=>p.confirmed))return 16;
  // Keep original selector/portraits alive until every participant confirms.
  this.ww(0x1001fa,0x20ff);return 0;
 }
 step(inputs=this.inputs){if(!Array.isArray(inputs)||inputs.length!==5||inputs.some(x=>!Number.isInteger(x)||x<0||x>127))throw Error('INVALID_INPUTS');const previousInputs=this.inputs;this.inputs=inputs.slice();
  if(this.phase==='playing'&&!this.nativeContinue)this.continueInput(inputs,previousInputs);
  if(this.phase==='playing'){
   let tick=false;
   for(const p of this.players){
    if(p.state==='continue'&&!this.nativeContinue){
     const digit=Math.max(0,Math.min(9,Math.ceil((p.deadline-this.frame)/this.m._nw_fps())-1));
     if(p.continueDigit!==digit){p.continueDigit=digit;tick=true;}
    }else p.continueDigit=null;
   }
   // Original ECF8E requests 0x10D4 each time its continue digit changes.
   // Simultaneous players share a single tick instead of stacking five sounds.
   if(tick){this.ww(this.x.inputBase+0x50,0x10d4);this.emit('continue-sound',{command:0x10d4});}
  }
  if(this.phase==='attract'){this.reserveDuringBoot();if(this.paidInitialCoin&&this.frame>1100&&this.frame%30===0){if(this.byte(0x10fdb0)>0)this.paidInitialCoin=false;else this.coinPulse=5;}}
  let native=0;if(this.nativeContinue){const routine=this.long(this.status[0]);if(routine===0x43640&&((!this.paid&&(inputs[0]&16)&&!(previousInputs[0]&16))||this.paidContinuePending)){this.paidContinuePending=false;this.coinPulse=5;this.startPulse=5;}if(routine===0x432d4)native|=this.autoContinue?16:inputs[0];if(this.startPulse>0){native|=256;this.startPulse--;}}if(this.coinPulse>0){native|=128;this.coinPulse--;}if(this.phase==='attract'){
   native|=this.selectionInput(inputs);if(this.pendingStart&&this.frame>=this.startConfirmAt&&this.frame<this.startConfirmAt+6)native|=16;if(this.pendingStart&&this.frame%30===0&&this.byte(0x10fdb0)>0)this.startPulse=5;if(this.startPulse>0){native|=256;this.startPulse--;}
  }
  if(this.phase==='playing')for(let i=0;i<5;i++){let bits=this.players[i].state==='active'?inputs[i]:0;if((bits&12)===12)bits&=~12;if((bits&3)===3)bits&=~3;this.wb(this.x.inputBase+i*2,bits);const edge=bits&~previousInputs[i],edgeAddr=this.x.inputBase+0x10+i;this.wb(edgeAddr,this.long(0x10039c)===0xed682?this.byte(edgeAddr)|edge:edge);}
  // Native 4303A/43072 and portrait renderer 43C12 share the character-use mask.
  // Only clear it during selection; gameplay ownership and actor state are untouched.
  if(this.nativeContinue||(this.phase==='attract'&&[0x4323c,0x43284,0x432c4,0x432d4].includes(this.long(this.status[0]))))this.wb(0x10ec06,0);
  this.m._nw_input(native);this.m._nw_run(this.frame);
  if(this.phase==='playing'&&this.byte(0x10040c)===5){this.phase='complete';this.completionFrame=this.frame;for(let i=0;i<5;i++){this.wb(this.x.inputBase+i*2,0);this.wb(this.x.inputBase+i*2+1,0);}this.emit('complete',{nativeStage:5});}
  if(this.phase==='attract'&&this.long(0x10023c)===0x433e6&&(this.byte(0x10ed7d)&2)&&[0x22a96,0x22aae,0x24ed6,0x24d40].includes(this.long(0x1004fc)))this.begin();
  else if(this.phase==='playing')for(let i=0;i<5;i++){
   const p=this.players[i],a=this.x.actors[i],routine=this.long(a);
   if(p.state==='active'){this.separateSpawn(i);
    if(routine!==0&&routine!==0x567a)p.seenAlive=true;
    else if(p.seenAlive&&routine===0x567a){p.seenAlive=false;p.lives=Math.max(0,p.lives-1);this.wb(this.status[i]+0x7f,p.lives);this.emit('death',{slot:i+1,lives:p.lives});if(p.lives)this.respawn(i);else{p.state='continue';p.continueLife=(p.continueLife||0)+1;p.continueWaitUsed=false;p.continueWaitUntil=null;p.deadline=this.frame+Math.ceil(this.m._nw_fps()*10);this.wb(this.x.inputBase+i*2,0);if(this.playerCount===1){this.nativeContinue=true;p.deadline=null;const s=this.status[0];this.ww(s+0x6a,0);this.wb(s+0x7f,0);this.wb(s+0x80,0);this.ww(s+0x10,0);this.wl(s+0xc,0);this.wl(s,0x43606);}}}
   }
   if(p.state==='continue'&&!this.nativeContinue&&this.frame>=p.deadline){p.state='spectator';p.deadline=null;this.wb(this.status[i]+0x82,0);this.emit('spectator',{slot:i+1});}
  }
  if(this.nativeContinue){const p=this.players[0],s=this.status[0],routine=this.long(s);if(routine===0x432d4)p.state='selecting';if(routine===0x433e6&&![0,0x567a].includes(this.long(this.x.actors[0]))){p.character=this.word(this.x.actors[0]+0x6a);p.lives=3;p.state='active';p.seenAlive=true;p.deadline=null;this.nativeContinue=false;this.autoContinue=false;this.wb(s+0x7f,3);this.wl(s,0x567a);this.emit('native-continue-accepted');}else if(routine===0x43862){p.state='spectator';p.deadline=null;this.nativeContinue=false;this.emit('native-continue-expired');}}
  if(this.phase==='playing'&&this.players.every(p=>p.state==='spectator')){this.phase='game-over';for(let i=2;i<5;i++)this.wb(0x1053e0-(i-2)*0x210,0);this.emit('game-over');}
  this.frame++;
 }
 state(){return {playerCount:this.playerCount,frame:this.frame,phase:this.phase,completionFrame:this.completionFrame,selection:this.selection?structuredClone(this.selection):null,activeMask:this.byte(0x10ed86),players:this.players.map((p,i)=>({...p,coinIds:undefined,x:this.word(this.x.actors[i]+0x28),y:this.word(this.x.actors[i]+0x2c),owner:this.word(this.x.actors[i]+0x6c),routine:this.long(this.x.actors[i]),nativeCharacter:this.word(this.x.actors[i]+0x6a),ammo:this.word(this.weapon[i]+10),weapon:this.byte(this.weapon[i]+3)}))};}
 checkpoint(){return {autoContinue:!!this.autoContinue,paidInitialCoin:this.paidInitialCoin,paidContinuePending:this.paidContinuePending,approvedCredits:[...this.approvedCredits],nativeContinue:!!this.nativeContinue,playerCount:this.playerCount,sharedSelection:this.sharedSelection,selection:structuredClone(this.selection),selectionPrevious:this.selectionPrevious.slice(),frame:this.frame,phase:this.phase,completionFrame:this.completionFrame,inputs:this.inputs.slice(),coinPulse:this.coinPulse,startPulse:this.startPulse,pendingStart:this.pendingStart,startConfirmAt:Number.isFinite(this.startConfirmAt)?this.startConfirmAt:null,players:structuredClone(this.players),reserved:[...this.reserved]};}
 restore(s){this.autoContinue=!!s.autoContinue;this.paidInitialCoin=s.paidInitialCoin??false;this.paidContinuePending=s.paidContinuePending??false;this.approvedCredits=new Set(s.approvedCredits||[]);this.nativeContinue=!!s.nativeContinue;this.playerCount=s.playerCount??5;this.sharedSelection=s.sharedSelection??false;this.selection=structuredClone(s.selection??null);this.selectionPrevious=s.selectionPrevious?.slice()||[0,0,0,0,0];this.frame=s.frame;this.phase=s.phase;this.completionFrame=s.completionFrame??null;this.inputs=s.inputs.slice();this.coinPulse=s.coinPulse;this.startPulse=s.startPulse;this.pendingStart=s.pendingStart;this.startConfirmAt=s.startConfirmAt??Infinity;this.players=structuredClone(s.players);this.reserved=new Set(s.reserved);}
}
