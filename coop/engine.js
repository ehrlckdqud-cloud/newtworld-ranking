/* Original native player lifecycle with third-player ownership and keyboard input normalization. */
function cleanDirections(bits){if((bits&12)===12)bits&=~12;if((bits&3)===3)bits&=~3;return bits;}
class SoloEngineP3 {
 constructor(module,spawn){this.playerNumber=3;this.playerIndex=2;this.m=module;this.spawn=spawn;this.frame=0;this.held=0;this.dead=false;this.over=false;this.overAt=null;this.continueAt=null;this.continueRequested=false;this.continueSelection=false;this.events=[];this.render=true;this.phase="attract";this.coinFrames=0;this.startFrames=0;this.pendingStart=false;this.character=0;this.pendingMission=null;}
 ram(){return new Uint8Array(this.m.HEAPU8.buffer,this.m._nw_ram(),65536)}
 byte(a){return this.ram()[(a&65535)^1]}
 wb(a,v){this.ram()[(a&65535)^1]=v}
 word(a){const r=this.ram();return r[a&65535]|r[(a+1)&65535]<<8}
 ww(a,v){const r=this.ram();r[a&65535]=v&255;r[(a+1)&65535]=(v>>>8)&255}
 long(a){return ((this.word(a)<<16)|this.word(a+2))>>>0}
 wl(a,v){this.ww(a,v>>>16);this.ww(a+2,v&65535)}
 clear(a,n){this.ram().fill(0,a&65535,(a&65535)+n)}
 unlinkFree(addr){let prev=0x10540c,cur=this.long(prev),n=0;while(cur&&cur!==addr&&n++<113){prev=cur+8;cur=this.long(prev)}if(cur!==addr)throw Error('3P 메모리 초기화 실패: '+addr.toString(16));this.wl(prev,this.long(cur+8));this.ww(0x105410,this.word(0x105410)-1)}
 insert(){const actor=0x1051fc,before=0x1005ac,after=this.long(before+8);this.wl(before+8,actor);this.wl(after+4,actor);this.wl(actor+4,before);this.wl(actor+8,after);this.wl(actor+0xc,0);this.ww(actor+0x10,0);this.ww(actor+0x6c,2);this.wl(actor+0x80,0x10538c);this.wb(actor+0x5a,4)}
 startP3(){for(const a of [0x1051fc,0x1052ac,0x10535c])this.unlinkFree(a);this.clear(0x1052ac,0xb0);this.wb(0x10532e,2);this.lives=Math.max(1,this.byte(0x10fd88));this.wb(0x10532b,this.lives);this.wl(0x1051fc,this.spawn);this.clear(0x10535c,0xb0);this.ww(0x105380,65535);this.insert();this.ww(0x105266,0);this.ww(0x105390,0);this.wl(0x105318,0x1051fc);this.wb(0x1053e0,1);this.wb(0x105404,255);this.events.push({frame:this.frame,event:'solo-start'});this.phase='playing';this.m._nw_hud(1)}
 coin(){this.coinFrames=5;this.events.push({frame:this.frame,event:'coin-input'})}
 start(){this.startFrames=5;this.pendingStart=true;this.events.push({frame:this.frame,event:'start-input'})}
 credits(){const b=this.byte(0x10fdb0);return (b>>>4)*10+(b&15)}
 step(){const f=this.frame,input=cleanDirections(this.held);
 if(this.phase==='attract'&&this.pendingStart){if(this.credits()===0)this.pendingStart=false;else if(f%30===0)this.startFrames=5;}
 let native=(this.coinFrames>0?128:0);if(this.coinFrames>0)this.coinFrames--;
 if(this.phase==='attract'||this.continueSelection){native|=input;if(this.startFrames>0){native|=256;this.startFrames--}}
 else if(this.startFrames>0){if(this.continueAt!==null)native|=256;this.startFrames--}
 this.m._nw_input(native);
 if(this.phase==='playing'&&!this.over){this.ww(0x1053fe,this.long(0x10039c)===0xed682?(this.word(0x1053fe)|(input&~this.byte(0x105374))):0);this.wb(0x105374,input)}
 this.m._nw_run(f);
 if(this.phase==='attract'&&this.long(0x10023c)===0x433e6&&(this.byte(0x10ed7d)&2)!==0&&[0x22a96,0x22aae,0x24ed6,0x24d40].includes(this.long(0x1004fc))){
  const character=this.word(0x100566);
  for(const [a,s]of [[0x1004fc,0x10023c],[0x1005ac,0x1002ec]]){this.wb(s+0x7f,0);this.wl(a,0x567a);this.wl(s,0x567a)}
  this.character=character;this.startP3();this.ww(0x105266,this.character);this.pendingStart=false;if(this.pendingMission!==null){const mission=this.pendingMission;this.pendingMission=null;this.selectMission(mission)}
 }
 if(this.phase==='playing'&&!this.over){const a=0x1051fc,s=0x1052ac;
  if(this.long(a)===0x567a&&!this.dead){this.dead=true;this.wb(s+0x7f,Math.max(0,this.byte(s+0x7f)-1));this.events.push({frame:f,event:'death',lives:this.byte(s+0x7f)})}
  if(this.dead&&this.long(a)===0x567a&&(this.byte(s+0x7f)===0||this.continueSelection)){
   if(this.continueAt===null){this.continueAt=f;this.beginNativeContinue();this.events.push({frame:f,event:'continue'})}
   const outcome=this.byte(0x1053fc);
   if(outcome===1){this.continueSelection=true;this.selectionDisplayMode=this.byte(0x10ec07);this.wb(0x10ec07,255);this.wb(0x1053fc,0);this.events.push({frame:f,event:'continue-character-select'});this.m._nw_hud(2)}
   else if(outcome===3){this.character=this.byte(s+0x7e)&3;this.endNativeContinue();this.wb(s+0x7f,this.lives);this.continueSelection=false;this.wb(0x10ec07,this.selectionDisplayMode||0);this.continueAt=null;this.events.push({frame:f,event:'continue-accept',character:this.character});this.m._nw_hud(1)}
   else if(outcome===2){this.endNativeContinue();this.over=true;this.overAt=f;this.wb(0x105374,0);this.wb(0x105375,0);this.ww(0x10537c,0);this.ww(0x10537e,0);this.wb(0x1053e0,0);this.events.push({frame:f,event:'game-over'})}
  }
  if(this.dead&&this.long(a)===0x567a&&this.byte(s+0x7f)>0&&!this.continueSelection){let prev=0x10540c,cur=this.long(prev),n=0;while(cur&&cur!==a&&n++<113){prev=cur+8;cur=this.long(prev)}const ap=this.long(a+4),an=this.long(a+8),linked=ap>=0x100000&&ap<0x110000&&an>=0x100000&&an<0x110000&&this.long(ap+8)===a&&this.long(an+4)===a;if(cur===a||linked){if(cur===a){this.wl(prev,this.long(a+8));this.ww(0x105410,this.word(0x105410)-1)}if(linked){this.wl(ap+8,an);this.wl(an+4,ap)}this.wl(a,this.spawn);this.insert();this.ww(a+0x6a,this.character);this.dead=false;this.events.push({frame:f,event:'respawn'})}}
 }
 if(this.phase==='playing'&&!this.dead&&this.continueAt===null&&![0,0x567a].includes(this.long(0x1051fc))){const c=this.word(0x105266);if(c<4)this.character=c}this.continueRequested=false;this.frame++;}
 beginNativeContinue(){const s=0x1052ac;this.wb(0x10ec06,this.byte(0x10ec06)&~(1<<[0,2,1,3][this.character]));for(let i=0x6a;i<0xb0;i++)this.wb(s+i,this.byte(0x10023c+i));this.wb(s+0x7e,this.character);this.ww(s+0x6a,0);this.wl(s+0x6c,0x1051fc);this.wb(s+0x7f,0);this.wb(s+0x80,0);this.wb(0x1053fc,0);this.ww(s+0x10,0);this.wl(s+0xc,0);const before=0x1005ac,after=this.long(before+8);this.wl(before+8,s);this.wl(after+4,s);this.wl(s+4,before);this.wl(s+8,after);this.wl(s,0x43606);this.m._nw_hud(1)}
 endNativeContinue(){const s=0x1052ac,prev=this.long(s+4),next=this.long(s+8);if(this.long(prev+8)===s&&this.long(next+4)===s){this.wl(prev+8,next);this.wl(next+4,prev)}this.wl(s,0);this.wl(s+4,0);this.wl(s+8,0);this.wb(0x1053fc,0)}
 hudState(){const v=0x1053a2,active=![0,0x567a].includes(this.long(0x1051fc)),mounted=active&&this.word(v)!==0,vehicleBombs=mounted&&this.byte(v+0x29)===1;const kind=mounted?this.byte(v+0x27):0,maxEnergy=[0,48,0,48,48,48,0,0,48,48,48,48,0][kind]||0;return {vehicleEnergy:mounted?Math.min(maxEnergy,this.word(v+0x1c)):0,vehicleMaxEnergy:maxEnergy,mounted,vehicleKind:mounted?this.byte(v+0x27):0,ammo:this.word(mounted?v+0x20:0x105396),bombs:this.byte(vehicleBombs?v+0x25:0x105391),bombType:this.byte(vehicleBombs?v+0x26:0x105390)}}
 selectMission(mission){if(!Number.isInteger(mission)||mission<0||mission>4)throw Error('미션 선택 범위 오류');if(this.phase!=='playing'){this.pendingMission=mission;this.events.push({frame:this.frame,event:'mission-queued',mission});return 'queued'}if(this.over||this.continueAt!==null||this.dead)throw Error('컨티뉴하거나 타이틀에서 캐릭터를 선택한 뒤 이동하세요.');this.held=0;this.wb(0x105374,0);this.wb(0x105375,0);this.wl(0x10537c,0);this.wl(0x1053f4,0);this.wb(0x10ed7a,mission);this.wb(0x10ed7b,0);this.wl(0x10039c,0xed0f6);this.events.push({frame:this.frame,event:'mission-select',mission});return 'started'}
 checkpoint(){return Object.fromEntries(["frame","held","dead","over","overAt","continueAt","continueRequested","continueSelection","selectionDisplayMode","phase","coinFrames","startFrames","pendingStart","lives","character","pendingMission"].map(k=>[k,this[k]]))}
 restoreHost(s){this.character=this.word(0x105266);for(const k of Object.keys(this.checkpoint()))if(k in s)this[k]=s[k];this.m._nw_hud(this.phase==='playing'?1:0)}
 state(){return {playerNumber:3,playerIndex:this.word(0x105268),actorAddress:0x1051fc,frame:this.frame,stageRoutine:this.long(0x10039c),hud:this.hudState(),script:this.long(0x1053f4),nativeContinue:this.long(0x1052ac),character:this.word(0x105266),selectedCharacter:this.character,food:this.word(0x105392),form:[this.byte(0x10528e),this.byte(0x10528f)],actorFlags:[this.byte(0x105211),this.byte(0x105257),this.byte(0x105297)],processedInput:this.long(0x10537c),phase:this.phase,credits:this.credits(),rescues:this.word(0x1053d8),held:this.held,x:this.word(0x105224),y:this.word(0x105228),screenX:this.word(0x105238),screenY:this.word(0x10523c),routine:this.long(0x1051fc),nativeActive:[this.long(0x1004fc)!==0x567a,this.long(0x1005ac)!==0x567a],activeMask:this.byte(0x10ed86),lives:this.byte(0x10532b),ammo:this.word(0x105396),weapon:this.byte(0x10538f),bombs:this.byte(0x105391),score:this.long(0x10535c),mission:[this.byte(0x10040c),this.byte(0x10040d)],camera:[this.word(0x10e2d8),this.word(0x10e2dc)],continueDigit:this.continueAt!==null&&!this.over?Math.min(9,this.byte(0x1001f8)):null,gameOver:this.over}}
}

globalThis.SoloEngineP3=SoloEngineP3;

class SoloEngineP4 {
 constructor(module,spawn){this.playerNumber=4;this.playerIndex=3;this.m=module;this.spawn=spawn;this.frame=0;this.held=0;this.dead=false;this.over=false;this.overAt=null;this.continueAt=null;this.continueRequested=false;this.continueSelection=false;this.events=[];this.render=true;this.phase="attract";this.coinFrames=0;this.startFrames=0;this.pendingStart=false;this.character=0;this.pendingMission=null;}
 ram(){return new Uint8Array(this.m.HEAPU8.buffer,this.m._nw_ram(),65536)}
 byte(a){return this.ram()[(a&65535)^1]}
 wb(a,v){this.ram()[(a&65535)^1]=v}
 word(a){const r=this.ram();return r[a&65535]|r[(a+1)&65535]<<8}
 ww(a,v){const r=this.ram();r[a&65535]=v&255;r[(a+1)&65535]=(v>>>8)&255}
 long(a){return ((this.word(a)<<16)|this.word(a+2))>>>0}
 wl(a,v){this.ww(a,v>>>16);this.ww(a+2,v&65535)}
 clear(a,n){this.ram().fill(0,a&65535,(a&65535)+n)}
 unlinkFree(addr){let prev=0x10540c,cur=this.long(prev),n=0;while(cur&&cur!==addr&&n++<113){prev=cur+8;cur=this.long(prev)}if(cur!==addr)throw Error('3P 메모리 초기화 실패: '+addr.toString(16));this.wl(prev,this.long(cur+8));this.ww(0x105410,this.word(0x105410)-1)}
 insert(){const actor=0x104fec,before=0x1005ac,after=this.long(before+8);this.wl(before+8,actor);this.wl(after+4,actor);this.wl(actor+4,before);this.wl(actor+8,after);this.wl(actor+0xc,0);this.ww(actor+0x10,0);this.ww(actor+0x6c,3);this.wl(actor+0x80,0x10517c);this.wb(actor+0x5a,8)}
 startP3(){for(const a of [0x104fec,0x10509c,0x10514c])this.unlinkFree(a);this.clear(0x10509c,0xb0);this.wb(0x10511e,2);this.lives=Math.max(1,this.byte(0x10fd88));this.wb(0x10511b,this.lives);this.wl(0x104fec,this.spawn);this.clear(0x10514c,0xb0);this.ww(0x105170,65535);this.insert();this.ww(0x105056,0);this.ww(0x105180,0);this.wl(0x105108,0x104fec);this.wb(0x1051d0,1);this.wb(0x1051f4,255);this.events.push({frame:this.frame,event:'solo-start'});this.phase='playing';this.m._nw_hud(1)}
 coin(){this.coinFrames=5;this.events.push({frame:this.frame,event:'coin-input'})}
 start(){this.startFrames=5;this.pendingStart=true;this.events.push({frame:this.frame,event:'start-input'})}
 credits(){const b=this.byte(0x10fdb0);return (b>>>4)*10+(b&15)}
 step(){const f=this.frame,input=cleanDirections(this.held);
 if(this.phase==='attract'&&this.pendingStart){if(this.credits()===0)this.pendingStart=false;else if(f%30===0)this.startFrames=5;}
 let native=(this.coinFrames>0?128:0);if(this.coinFrames>0)this.coinFrames--;
 if(this.phase==='attract'||this.continueSelection){native|=input;if(this.startFrames>0){native|=256;this.startFrames--}}
 else if(this.startFrames>0){if(this.continueAt!==null)native|=256;this.startFrames--}
 this.m._nw_input(native);
 if(this.phase==='playing'&&!this.over){this.ww(0x1051ee,this.long(0x10039c)===0xed682?(this.word(0x1051ee)|(input&~this.byte(0x105164))):0);this.wb(0x105164,input)}
 this.m._nw_run(f);
 if(this.phase==='attract'&&this.long(0x10023c)===0x433e6&&(this.byte(0x10ed7d)&2)!==0&&[0x22a96,0x22aae,0x24ed6,0x24d40].includes(this.long(0x1004fc))){
  const character=this.word(0x100566);
  for(const [a,s]of [[0x1004fc,0x10023c],[0x1005ac,0x1002ec]]){this.wb(s+0x7f,0);this.wl(a,0x567a);this.wl(s,0x567a)}
  this.character=character;this.startP3();this.ww(0x105056,this.character);this.pendingStart=false;if(this.pendingMission!==null){const mission=this.pendingMission;this.pendingMission=null;this.selectMission(mission)}
 }
 if(this.phase==='playing'&&!this.over){const a=0x104fec,s=0x10509c;
  if(this.long(a)===0x567a&&!this.dead){this.dead=true;this.wb(s+0x7f,Math.max(0,this.byte(s+0x7f)-1));this.events.push({frame:f,event:'death',lives:this.byte(s+0x7f)})}
  if(this.dead&&this.long(a)===0x567a&&(this.byte(s+0x7f)===0||this.continueSelection)){
   if(this.continueAt===null){this.continueAt=f;this.beginNativeContinue();this.events.push({frame:f,event:'continue'})}
   const outcome=this.byte(0x1051ec);
   if(outcome===1){this.continueSelection=true;this.selectionDisplayMode=this.byte(0x10ec07);this.wb(0x10ec07,255);this.wb(0x1051ec,0);this.events.push({frame:f,event:'continue-character-select'});this.m._nw_hud(2)}
   else if(outcome===3){this.character=this.byte(s+0x7e)&3;this.endNativeContinue();this.wb(s+0x7f,this.lives);this.continueSelection=false;this.wb(0x10ec07,this.selectionDisplayMode||0);this.continueAt=null;this.events.push({frame:f,event:'continue-accept',character:this.character});this.m._nw_hud(1)}
   else if(outcome===2){this.endNativeContinue();this.over=true;this.overAt=f;this.wb(0x105164,0);this.wb(0x105165,0);this.ww(0x10516c,0);this.ww(0x10516e,0);this.wb(0x1051d0,0);this.events.push({frame:f,event:'game-over'})}
  }
  if(this.dead&&this.long(a)===0x567a&&this.byte(s+0x7f)>0&&!this.continueSelection){let prev=0x10540c,cur=this.long(prev),n=0;while(cur&&cur!==a&&n++<113){prev=cur+8;cur=this.long(prev)}const ap=this.long(a+4),an=this.long(a+8),linked=ap>=0x100000&&ap<0x110000&&an>=0x100000&&an<0x110000&&this.long(ap+8)===a&&this.long(an+4)===a;if(cur===a||linked){if(cur===a){this.wl(prev,this.long(a+8));this.ww(0x105410,this.word(0x105410)-1)}if(linked){this.wl(ap+8,an);this.wl(an+4,ap)}this.wl(a,this.spawn);this.insert();this.ww(a+0x6a,this.character);this.dead=false;this.events.push({frame:f,event:'respawn'})}}
 }
 if(this.phase==='playing'&&!this.dead&&this.continueAt===null&&![0,0x567a].includes(this.long(0x104fec))){const c=this.word(0x105056);if(c<4)this.character=c}this.continueRequested=false;this.frame++;}
 beginNativeContinue(){const s=0x10509c;this.wb(0x10ec06,this.byte(0x10ec06)&~(1<<[0,2,1,3][this.character]));for(let i=0x6a;i<0xb0;i++)this.wb(s+i,this.byte(0x10023c+i));this.wb(s+0x7e,this.character);this.ww(s+0x6a,0);this.wl(s+0x6c,0x104fec);this.wb(s+0x7f,0);this.wb(s+0x80,0);this.wb(0x1051ec,0);this.ww(s+0x10,0);this.wl(s+0xc,0);const before=0x1005ac,after=this.long(before+8);this.wl(before+8,s);this.wl(after+4,s);this.wl(s+4,before);this.wl(s+8,after);this.wl(s,0x43606);this.m._nw_hud(1)}
 endNativeContinue(){const s=0x10509c,prev=this.long(s+4),next=this.long(s+8);if(this.long(prev+8)===s&&this.long(next+4)===s){this.wl(prev+8,next);this.wl(next+4,prev)}this.wl(s,0);this.wl(s+4,0);this.wl(s+8,0);this.wb(0x1051ec,0)}
 hudState(){const v=0x105192,active=![0,0x567a].includes(this.long(0x104fec)),mounted=active&&this.word(v)!==0,vehicleBombs=mounted&&this.byte(v+0x29)===1;const kind=mounted?this.byte(v+0x27):0,maxEnergy=[0,48,0,48,48,48,0,0,48,48,48,48,0][kind]||0;return {vehicleEnergy:mounted?Math.min(maxEnergy,this.word(v+0x1c)):0,vehicleMaxEnergy:maxEnergy,mounted,vehicleKind:mounted?this.byte(v+0x27):0,ammo:this.word(mounted?v+0x20:0x105186),bombs:this.byte(vehicleBombs?v+0x25:0x105181),bombType:this.byte(vehicleBombs?v+0x26:0x105180)}}
 selectMission(mission){if(!Number.isInteger(mission)||mission<0||mission>4)throw Error('미션 선택 범위 오류');if(this.phase!=='playing'){this.pendingMission=mission;this.events.push({frame:this.frame,event:'mission-queued',mission});return 'queued'}if(this.over||this.continueAt!==null||this.dead)throw Error('컨티뉴하거나 타이틀에서 캐릭터를 선택한 뒤 이동하세요.');this.held=0;this.wb(0x105164,0);this.wb(0x105165,0);this.wl(0x10516c,0);this.wl(0x1051e4,0);this.wb(0x10ed7a,mission);this.wb(0x10ed7b,0);this.wl(0x10039c,0xed0f6);this.events.push({frame:this.frame,event:'mission-select',mission});return 'started'}
 checkpoint(){return Object.fromEntries(["frame","held","dead","over","overAt","continueAt","continueRequested","continueSelection","selectionDisplayMode","phase","coinFrames","startFrames","pendingStart","lives","character","pendingMission"].map(k=>[k,this[k]]))}
 restoreHost(s){this.character=this.word(0x105056);for(const k of Object.keys(this.checkpoint()))if(k in s)this[k]=s[k];this.m._nw_hud(this.phase==='playing'?1:0)}
 state(){return {playerNumber:4,playerIndex:this.word(0x105058),actorAddress:0x104fec,frame:this.frame,stageRoutine:this.long(0x10039c),hud:this.hudState(),script:this.long(0x1051e4),nativeContinue:this.long(0x10509c),character:this.word(0x105056),selectedCharacter:this.character,food:this.word(0x105182),form:[this.byte(0x10507e),this.byte(0x10507f)],actorFlags:[this.byte(0x105001),this.byte(0x105047),this.byte(0x105087)],processedInput:this.long(0x10516c),phase:this.phase,credits:this.credits(),rescues:this.word(0x1051c8),held:this.held,x:this.word(0x105014),y:this.word(0x105018),screenX:this.word(0x105028),screenY:this.word(0x10502c),routine:this.long(0x104fec),nativeActive:[this.long(0x1004fc)!==0x567a,this.long(0x1005ac)!==0x567a],activeMask:this.byte(0x10ed86),lives:this.byte(0x10511b),ammo:this.word(0x105186),weapon:this.byte(0x10517f),bombs:this.byte(0x105181),score:this.long(0x10514c),mission:[this.byte(0x10040c),this.byte(0x10040d)],camera:[this.word(0x10e2d8),this.word(0x10e2dc)],continueDigit:this.continueAt!==null&&!this.over?Math.min(9,this.byte(0x1001f8)):null,gameOver:this.over}}
}

globalThis.SoloEngineP4=SoloEngineP4;

class SoloEngineP5 {
 constructor(module,spawn){this.playerNumber=5;this.playerIndex=4;this.m=module;this.spawn=spawn;this.frame=0;this.held=0;this.dead=false;this.over=false;this.overAt=null;this.continueAt=null;this.continueRequested=false;this.continueSelection=false;this.events=[];this.render=true;this.phase="attract";this.coinFrames=0;this.startFrames=0;this.pendingStart=false;this.character=0;this.pendingMission=null;}
 ram(){return new Uint8Array(this.m.HEAPU8.buffer,this.m._nw_ram(),65536)}
 byte(a){return this.ram()[(a&65535)^1]}
 wb(a,v){this.ram()[(a&65535)^1]=v}
 word(a){const r=this.ram();return r[a&65535]|r[(a+1)&65535]<<8}
 ww(a,v){const r=this.ram();r[a&65535]=v&255;r[(a+1)&65535]=(v>>>8)&255}
 long(a){return ((this.word(a)<<16)|this.word(a+2))>>>0}
 wl(a,v){this.ww(a,v>>>16);this.ww(a+2,v&65535)}
 clear(a,n){this.ram().fill(0,a&65535,(a&65535)+n)}
 unlinkFree(addr){let prev=0x10540c,cur=this.long(prev),n=0;while(cur&&cur!==addr&&n++<113){prev=cur+8;cur=this.long(prev)}if(cur!==addr)throw Error('3P 메모리 초기화 실패: '+addr.toString(16));this.wl(prev,this.long(cur+8));this.ww(0x105410,this.word(0x105410)-1)}
 insert(){const actor=0x104ddc,before=0x1005ac,after=this.long(before+8);this.wl(before+8,actor);this.wl(after+4,actor);this.wl(actor+4,before);this.wl(actor+8,after);this.wl(actor+0xc,0);this.ww(actor+0x10,0);this.ww(actor+0x6c,4);this.wl(actor+0x80,0x104f6c);this.wb(actor+0x5a,16)}
 startP3(){for(const a of [0x104ddc,0x104e8c,0x104f3c])this.unlinkFree(a);this.clear(0x104e8c,0xb0);this.wb(0x104f0e,2);this.lives=Math.max(1,this.byte(0x10fd88));this.wb(0x104f0b,this.lives);this.wl(0x104ddc,this.spawn);this.clear(0x104f3c,0xb0);this.ww(0x104f60,65535);this.insert();this.ww(0x104e46,0);this.ww(0x104f70,0);this.wl(0x104ef8,0x104ddc);this.wb(0x104fc0,1);this.wb(0x104fe4,255);this.events.push({frame:this.frame,event:'solo-start'});this.phase='playing';this.m._nw_hud(1)}
 coin(){this.coinFrames=5;this.events.push({frame:this.frame,event:'coin-input'})}
 start(){this.startFrames=5;this.pendingStart=true;this.events.push({frame:this.frame,event:'start-input'})}
 credits(){const b=this.byte(0x10fdb0);return (b>>>4)*10+(b&15)}
 step(){const f=this.frame,input=cleanDirections(this.held);
 if(this.phase==='attract'&&this.pendingStart){if(this.credits()===0)this.pendingStart=false;else if(f%30===0)this.startFrames=5;}
 let native=(this.coinFrames>0?128:0);if(this.coinFrames>0)this.coinFrames--;
 if(this.phase==='attract'||this.continueSelection){native|=input;if(this.startFrames>0){native|=256;this.startFrames--}}
 else if(this.startFrames>0){if(this.continueAt!==null)native|=256;this.startFrames--}
 this.m._nw_input(native);
 if(this.phase==='playing'&&!this.over){this.ww(0x104fde,this.long(0x10039c)===0xed682?(this.word(0x104fde)|(input&~this.byte(0x104f54))):0);this.wb(0x104f54,input)}
 this.m._nw_run(f);
 if(this.phase==='attract'&&this.long(0x10023c)===0x433e6&&(this.byte(0x10ed7d)&2)!==0&&[0x22a96,0x22aae,0x24ed6,0x24d40].includes(this.long(0x1004fc))){
  const character=this.word(0x100566);
  for(const [a,s]of [[0x1004fc,0x10023c],[0x1005ac,0x1002ec]]){this.wb(s+0x7f,0);this.wl(a,0x567a);this.wl(s,0x567a)}
  this.character=character;this.startP3();this.ww(0x104e46,this.character);this.pendingStart=false;if(this.pendingMission!==null){const mission=this.pendingMission;this.pendingMission=null;this.selectMission(mission)}
 }
 if(this.phase==='playing'&&!this.over){const a=0x104ddc,s=0x104e8c;
  if(this.long(a)===0x567a&&!this.dead){this.dead=true;this.wb(s+0x7f,Math.max(0,this.byte(s+0x7f)-1));this.events.push({frame:f,event:'death',lives:this.byte(s+0x7f)})}
  if(this.dead&&this.long(a)===0x567a&&(this.byte(s+0x7f)===0||this.continueSelection)){
   if(this.continueAt===null){this.continueAt=f;this.beginNativeContinue();this.events.push({frame:f,event:'continue'})}
   const outcome=this.byte(0x104fdc);
   if(outcome===1){this.continueSelection=true;this.selectionDisplayMode=this.byte(0x10ec07);this.wb(0x10ec07,255);this.wb(0x104fdc,0);this.events.push({frame:f,event:'continue-character-select'});this.m._nw_hud(2)}
   else if(outcome===3){this.character=this.byte(s+0x7e)&3;this.endNativeContinue();this.wb(s+0x7f,this.lives);this.continueSelection=false;this.wb(0x10ec07,this.selectionDisplayMode||0);this.continueAt=null;this.events.push({frame:f,event:'continue-accept',character:this.character});this.m._nw_hud(1)}
   else if(outcome===2){this.endNativeContinue();this.over=true;this.overAt=f;this.wb(0x104f54,0);this.wb(0x104f55,0);this.ww(0x104f5c,0);this.ww(0x104f5e,0);this.wb(0x104fc0,0);this.events.push({frame:f,event:'game-over'})}
  }
  if(this.dead&&this.long(a)===0x567a&&this.byte(s+0x7f)>0&&!this.continueSelection){let prev=0x10540c,cur=this.long(prev),n=0;while(cur&&cur!==a&&n++<113){prev=cur+8;cur=this.long(prev)}const ap=this.long(a+4),an=this.long(a+8),linked=ap>=0x100000&&ap<0x110000&&an>=0x100000&&an<0x110000&&this.long(ap+8)===a&&this.long(an+4)===a;if(cur===a||linked){if(cur===a){this.wl(prev,this.long(a+8));this.ww(0x105410,this.word(0x105410)-1)}if(linked){this.wl(ap+8,an);this.wl(an+4,ap)}this.wl(a,this.spawn);this.insert();this.ww(a+0x6a,this.character);this.dead=false;this.events.push({frame:f,event:'respawn'})}}
 }
 if(this.phase==='playing'&&!this.dead&&this.continueAt===null&&![0,0x567a].includes(this.long(0x104ddc))){const c=this.word(0x104e46);if(c<4)this.character=c}this.continueRequested=false;this.frame++;}
 beginNativeContinue(){const s=0x104e8c;this.wb(0x10ec06,this.byte(0x10ec06)&~(1<<[0,2,1,3][this.character]));for(let i=0x6a;i<0xb0;i++)this.wb(s+i,this.byte(0x10023c+i));this.wb(s+0x7e,this.character);this.ww(s+0x6a,0);this.wl(s+0x6c,0x104ddc);this.wb(s+0x7f,0);this.wb(s+0x80,0);this.wb(0x104fdc,0);this.ww(s+0x10,0);this.wl(s+0xc,0);const before=0x1005ac,after=this.long(before+8);this.wl(before+8,s);this.wl(after+4,s);this.wl(s+4,before);this.wl(s+8,after);this.wl(s,0x43606);this.m._nw_hud(1)}
 endNativeContinue(){const s=0x104e8c,prev=this.long(s+4),next=this.long(s+8);if(this.long(prev+8)===s&&this.long(next+4)===s){this.wl(prev+8,next);this.wl(next+4,prev)}this.wl(s,0);this.wl(s+4,0);this.wl(s+8,0);this.wb(0x104fdc,0)}
 hudState(){const v=0x104f82,active=![0,0x567a].includes(this.long(0x104ddc)),mounted=active&&this.word(v)!==0,vehicleBombs=mounted&&this.byte(v+0x29)===1;const kind=mounted?this.byte(v+0x27):0,maxEnergy=[0,48,0,48,48,48,0,0,48,48,48,48,0][kind]||0;return {vehicleEnergy:mounted?Math.min(maxEnergy,this.word(v+0x1c)):0,vehicleMaxEnergy:maxEnergy,mounted,vehicleKind:mounted?this.byte(v+0x27):0,ammo:this.word(mounted?v+0x20:0x104f76),bombs:this.byte(vehicleBombs?v+0x25:0x104f71),bombType:this.byte(vehicleBombs?v+0x26:0x104f70)}}
 selectMission(mission){if(!Number.isInteger(mission)||mission<0||mission>4)throw Error('미션 선택 범위 오류');if(this.phase!=='playing'){this.pendingMission=mission;this.events.push({frame:this.frame,event:'mission-queued',mission});return 'queued'}if(this.over||this.continueAt!==null||this.dead)throw Error('컨티뉴하거나 타이틀에서 캐릭터를 선택한 뒤 이동하세요.');this.held=0;this.wb(0x104f54,0);this.wb(0x104f55,0);this.wl(0x104f5c,0);this.wl(0x104fd4,0);this.wb(0x10ed7a,mission);this.wb(0x10ed7b,0);this.wl(0x10039c,0xed0f6);this.events.push({frame:this.frame,event:'mission-select',mission});return 'started'}
 checkpoint(){return Object.fromEntries(["frame","held","dead","over","overAt","continueAt","continueRequested","continueSelection","selectionDisplayMode","phase","coinFrames","startFrames","pendingStart","lives","character","pendingMission"].map(k=>[k,this[k]]))}
 restoreHost(s){this.character=this.word(0x104e46);for(const k of Object.keys(this.checkpoint()))if(k in s)this[k]=s[k];this.m._nw_hud(this.phase==='playing'?1:0)}
 state(){return {playerNumber:5,playerIndex:this.word(0x104e48),actorAddress:0x104ddc,frame:this.frame,stageRoutine:this.long(0x10039c),hud:this.hudState(),script:this.long(0x104fd4),nativeContinue:this.long(0x104e8c),character:this.word(0x104e46),selectedCharacter:this.character,food:this.word(0x104f72),form:[this.byte(0x104e6e),this.byte(0x104e6f)],actorFlags:[this.byte(0x104df1),this.byte(0x104e37),this.byte(0x104e77)],processedInput:this.long(0x104f5c),phase:this.phase,credits:this.credits(),rescues:this.word(0x104fb8),held:this.held,x:this.word(0x104e04),y:this.word(0x104e08),screenX:this.word(0x104e18),screenY:this.word(0x104e1c),routine:this.long(0x104ddc),nativeActive:[this.long(0x1004fc)!==0x567a,this.long(0x1005ac)!==0x567a],activeMask:this.byte(0x10ed86),lives:this.byte(0x104f0b),ammo:this.word(0x104f76),weapon:this.byte(0x104f6f),bombs:this.byte(0x104f71),score:this.long(0x104f3c),mission:[this.byte(0x10040c),this.byte(0x10040d)],camera:[this.word(0x10e2d8),this.word(0x10e2dc)],continueDigit:this.continueAt!==null&&!this.over?Math.min(9,this.byte(0x1001f8)):null,gameOver:this.over}}
}

globalThis.SoloEngineP5=SoloEngineP5;

globalThis.SoloEngine=SoloEngineP3;
async function prepareROM(module,source,patch,progress=()=>{}){
 const zip=await JSZip.loadAsync(source),inner=zip.file('ROMS/mslug3.zip'),bundle=zip.file('NeoRAGEx5.zip');if(!inner||!bundle)throw Error('처음 전달하신 구동기+메탈3 전체 ZIP을 선택하세요. 내부 ROMS/mslug3.zip과 NeoRAGEx5.zip이 필요합니다.');
 const rom=await JSZip.loadAsync(await inner.async('uint8array')),neo=await JSZip.loadAsync(await bundle.async('uint8array'));const bios=await JSZip.loadAsync(await neo.file('ROMS/neogeo.zip').async('uint8array'));
 const p1=await rom.file('256d-p1.rom').async('uint8array'),native=new Uint8Array(p1.length);for(let i=0;i<p1.length;i+=2){native[i]=p1[i+1];native[i+1]=p1[i]}
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',native))].map(x=>x.toString(16).padStart(2,'0')).join('');if(hash!=='6c54ecaecc4ce90348c0fef6285e4a1d91ad7424cf0143aa6f939c51bd53cf39')throw Error('검증한 ROM 버전과 다릅니다. 기존 원본 ZIP을 선택하세요.');
 const out=new JSZip(),overlay=new JSZip();let count=0;const files=[];for(let i=1;i<=8;i++)files.push([`256d-c${i}.rom`,`256-c${i}d.c${i}`]);for(let i=1;i<=4;i++)files.push([`256d-v${i}.rom`,`256-v${i}.v${i}`]);files.push(['256d-m1.rom','256-m1.m1'],['256d-p1.rom','256-ph1.p1'],['256d-p2.rom','256-ph2.sp2'],['256d-s1.rom','256-s1d.s1']);
 for(const [from,to]of files){let data=await rom.file(from).async('uint8array');const original=data.slice();for(const [offset,b64]of patch[from]||[]){const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));data.set(bytes,offset)}if(from==='256d-s1.rom')data=data.slice(0x20000,0x40000);out.file(to,from==='256d-s1.rom'?data:original);if(patch[from])overlay.file(to,data);progress(++count/files.length)}
 const bz=new JSZip();for(const [from,to]of [['ng-lo.rom','000-lo.lo'],['ng-sfix.rom','sfix.sfix'],['ng-sm1.rom','sm1.sm1'],['neo-geo.rom','sp-s2.sp1']]){let data=await bios.file(from).async('uint8array');if(from==='ng-lo.rom'){const twice=new Uint8Array(data.length*2);twice.set(data);twice.set(data,data.length);data=twice}bz.file(to,data);if(from==='neo-geo.rom')bz.file('sp-s3.sp1',data)}
 for(const path of ['/roms','/system','/system/fbneo','/system/fbneo/patched'])module.FS.mkdirTree(path);
 // Full patched sets are local memory files; the source ZIP is never modified.
 module.FS.writeFile('/roms/mslug3fd.zip',await out.generateAsync({type:'uint8array',compression:'STORE'}));module.FS.writeFile('/system/fbneo/patched/mslug3fd.zip',await overlay.generateAsync({type:'uint8array',compression:'STORE'}));const biosBytes=await bz.generateAsync({type:'uint8array',compression:'STORE'});module.FS.writeFile('/roms/neogeo.zip',biosBytes);module.FS.writeFile('/system/fbneo/patched/neogeo.zip',biosBytes);
}
globalThis.prepareROM=prepareROM;
