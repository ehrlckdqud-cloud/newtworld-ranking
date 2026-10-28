import {downloadGame} from './download-game.mjs?v=50';
import {testHeaders} from './test-access.mjs?v=48';
import {readSavedROM,saveROM} from './rom-cache.mjs';
const API='https://newtworld-ms3-coop-5p.pluckypeach517.chatgpt.site';
const apiFetch=(path,options={})=>fetch(API+path,{...options,headers:{...options.headers,...testHeaders()}});
import {createChatPresentation} from './chat-presentation.mjs';
import {applyLocalHostCommand} from './local-command.mjs';
import {drawClearLabels,DISPLAY_SCALE} from './clear-labels.mjs';
import {inputReceiver} from './input-channel.mjs';
import {makeResults} from './native-results.mjs';
import {drawFiveSelection,drawFiveContinue} from './native-selection.mjs?v=48';
import {makeHUD} from './native-hud.mjs';
import {FiveSession} from './native/five-session.mjs?v=48';
import {prepareCoopROM} from './native/prepare-coop.mjs';
const $=id=>document.getElementById(id),BUILD='nw-ms3-online-lab-v46';
const colors=['#ff6464','#65afff','#68dc83','#ffc45e','#c892ff'],keymap={KeyW:1,KeyS:2,KeyA:4,KeyD:8,KeyJ:16,KeyK:32,KeyU:64};
let pendingDownload=null;
let session,roster=[],module,engine,profile,stream,ac,audioOut,audioNext=0,playing=false,completed=false,seq=0,bits=0,lastSent=-1,lastSentAt=0,lastTick=0,clock=0,chatOpen=false,composing=false,pendingChat=false,enterHeld=false,transportAlive=false,config;
const peers=new Map(),held=[0,0,0,0,0],heldAt=[0,0,0,0,0],bubbles=new Map();
const canvas=$('screen'),displayCtx=canvas.getContext('2d',{alpha:false}),nativeCanvas=document.createElement('canvas'),ctx=nativeCanvas.getContext('2d',{alpha:false});let pixels,paintHUD,paintResults;
const note=s=>$('status').textContent=({ALL_PRESENT_READY_REQUIRED:'현재 입장한 인원이 모두 준비를 눌러주세요.',CLIENT_UPDATE_REQUIRED:'새 버전이 적용되었습니다. 새로고침한 뒤 방을 다시 만들어주세요.',BUILD_MISMATCH:'새로고침한 뒤 방을 다시 만들어주세요.'}[s]||s);
async function post(path,data){const r=await apiFetch(path,{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token}:{})},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw Error(d.error);return d;}
const act=data=>post(`/api/rooms/${session.room}/action`,data);
async function command(command){if(applyLocalHostCommand(engine,command,{slot:session?.slot,playing,completed}))return;return act({type:'native-command',command});}
function safe(p){return Promise.resolve(p).catch(e=>note(e.message));}
function render(){const list=$('players');list.replaceChildren();for(let i=0;i<5;i++){const p=roster[i],a=document.createElement('article');a.className='player-card'+(!p?' empty-seat':'');if(!p){a.textContent='대원 대기 중';list.append(a);continue;}const slot=document.createElement('div');slot.className='slot';slot.textContent=`P${p.slot}`;slot.style.color=colors[i];const name=document.createElement('b');name.textContent=p.name;const state=document.createElement('small');state.textContent=p.slot===1?'방장 · '+['Marco','Tarma','Eri','Fio'][p.character]:['Marco','Tarma','Eri','Fio'][p.character];a.append(slot,name,state);if(p.ready){const ready=document.createElement('span');ready.className='ready';ready.textContent='READY';a.append(ready);}list.append(a);}const self=roster.find(p=>p.slot===session?.slot);$('ready').textContent=self?.ready?'준비 취소':'준비하기';}

async function join(create){if(session)return;const name=$('name').value;let path='/api/rooms',data={name,build:BUILD,...(window.nwLobbyConfig?.()||{}),member:{token:localStorage.getItem('nwProfileToken'),device:localStorage.getItem('nwProfileDevice')}};if(!create){const [room,invite]=$('invite').value.trim().split('.');if(!/^[a-f0-9]{16}$/.test(room||'')||!invite)throw Error('초대 코드를 확인하세요');path+=`/${room}/join`;data.invite=invite;}session=await post(path,data);const configResponse=await apiFetch('/native-config?room='+session.room,{headers:{Authorization:'Bearer '+session.token}});config=await configResponse.json();if(!configResponse.ok)throw Error(config.error||'연결 설정을 읽을 수 없습니다');$('joinForm').hidden=true;$('controls').hidden=false;$('host').hidden=session.slot!==1;if(session.invite)$('code').textContent=session.room+'.'+session.invite;$('start').hidden=session.slot!==1;$('coin').hidden=session.slot!==1;window.nwEnterRoom?.(window.nwPendingRoomTitle||data.title);transportAlive=true;listen().catch(e=>stop('연결 중단: '+e.message)).finally(()=>{transportAlive=false;if(session.slot===1)safe(act({type:'native-pause'}));});note('모든 대원이 준비하면 방장이 출동할 수 있습니다.');if(session.slot===1){readSavedROM().then(data=>{if(data){$('romInfo').textContent='이 PC에 저장된 게임 데이터를 찾았습니다.';$('load').click();}}).catch(()=>{});}}
window.nwJoinPublic=(id,title)=>{$('invite').value=id+'.public';window.nwPendingRoomTitle=title;return safe(join(false));};
$('leaveRoom').onclick=()=>safe((async()=>{await act({type:'leave'});location.reload();})());
async function listen(){if(config.eventTransport==='poll'||new URLSearchParams(location.search).get('transport')==='poll')return listenPoll();const r=await apiFetch(`/api/rooms/${session.room}/events`,{headers:{Authorization:'Bearer '+session.token}});if(!r.ok)throw Error('EVENT_STREAM_FAILED');const reader=r.body.pipeThrough(new TextDecoderStream()).getReader();let b='';for(;;){const v=await reader.read();if(v.done){stop('연결이 끊겼습니다.');return;}b+=v.value;let n;while((n=b.indexOf('\n\n'))>=0){const row=b.slice(0,n);b=b.slice(n+2);const d=row.split('\n').find(x=>x.startsWith('data: '));if(d)await event(JSON.parse(d.slice(6)));}}}
function stop(reason){playing=false;held.fill(0);bits=0;lastSent=-1;audioNext=0;note(reason);}
async function event(e){
 if(e.type==='closed'){stop('방장이 작전실을 닫았습니다.');location.reload();return;}
 if(e.type==='snapshot'||e.type==='roster'){roster=e.players;render();if(e.completed)completed=true;}
 if(e.type==='game-complete'){completed=true;bits=0;held.fill(0);note('MISSION ALL OVER · 채팅은 계속 이용할 수 있습니다.');}
 if(e.type==='game-over')stop('GAME OVER');
 if(e.type==='paused')stop('연결 중단: '+e.reason+' · 현재 검증본은 새 방으로 다시 시작해야 합니다.');
 if(e.type==='native-start'){
  roster=e.players;playing=true;$('coin').disabled=false;$('full').disabled=false;window.nwGameStarted?.();
  if(session.slot===1){engine=new FiveSession(module,profile,{characters:roster.map(p=>p.character),playerCount:roster.length,sharedSelection:true});paintHUD=makeHUD(module,engine,ctx);paintResults=makeResults(module,engine,ctx);$('screen').hidden=false;module.onVideo=(...args)=>{paint(...args);present();};module.onAudio=audio;lastTick=0;clock=0;for(const p of roster)if(p.slot!==1)await makePeer(p.slot,true);}
  else {$('video').hidden=false;note('방장의 게임 영상 연결 중');}
 }
 if(e.type==='signal'&&e.to===session.slot){try{await signal(e.from,e.signal);}catch(err){note('영상 연결 오류: '+err.message);}}
 if(e.type==='native-input'&&session.slot===1){held[e.slot-1]=e.bits;heldAt[e.slot-1]=performance.now();}
 if(e.type==='native-command'&&session.slot===1&&engine){try{if(e.command==='coin')engine.coin();if(e.command==='start')engine.start();if(e.command==='continue')engine.requestContinue(e.slot,'test-'+e.id);if(e.command==='select')engine.selectCharacter(e.slot,e.character);}catch(err){note(err.message);}}
 if(e.type==='chat')chatPresentation.receive(e);
}
async function makePeer(slot,offer=false){if(peers.has(slot))return peers.get(slot);const pc=new RTCPeerConnection({iceServers:config.iceServers});const record={pc,queue:[],chain:Promise.resolve(),channel:null};peers.set(slot,record);pc.onicecandidate=e=>{if(e.candidate)safe(act({type:'signal',to:slot,signal:{type:'candidate',candidate:e.candidate.toJSON()}}));};pc.onconnectionstatechange=()=>{if(['failed','disconnected','closed'].includes(pc.connectionState))note(`P${slot} 영상 연결 ${pc.connectionState}. 외부망에서는 TURN 중계가 필요할 수 있습니다.`);};pc.ondatachannel=e=>{if(session.slot!==1&&slot===1&&e.channel.label==='input')bindInput(record,e.channel,slot);else e.channel.close();};pc.ontrack=e=>{$('video').srcObject=e.streams[0];safe($('video').play());note('게임 연결됨');};if(offer){bindInput(record,pc.createDataChannel('input',{ordered:false,maxRetransmits:0}),slot);for(const t of stream.getTracks())pc.addTrack(t,stream);await pc.setLocalDescription(await pc.createOffer());await act({type:'signal',to:slot,signal:{type:'offer',sdp:pc.localDescription.sdp}});}return record;}
function bindInput(record,channel,slot){
 record.channel=channel;
 if(session.slot===1){const receive=inputReceiver({slot,enabled:()=>playing&&!completed&&engine?.players[slot-1]?.state!=='spectator',accept:(seat,value,t)=>{held[seat-1]=value;heldAt[seat-1]=t;}});channel.onmessage=e=>receive(e.data);}
 channel.onopen=()=>{lastSent=-1;note('게임 입력 연결됨');};
 channel.onclose=()=>{if(session.slot===1){held[slot-1]=0;safe(act({type:'native-pause'}));}stop('게임 입력 연결이 끊겼습니다. 새 방으로 다시 시작하세요.');};
}
async function signal(from,s){const r=await makePeer(from),pc=r.pc;if(s.type==='candidate'){if(pc.remoteDescription)await pc.addIceCandidate(s.candidate);else r.queue.push(s.candidate);return;}await pc.setRemoteDescription({type:s.type,sdp:s.sdp});for(const c of r.queue.splice(0))await pc.addIceCandidate(c);if(s.type==='offer'){await pc.setLocalDescription(await pc.createAnswer());await act({type:'signal',to:from,signal:{type:'answer',sdp:pc.localDescription.sdp}});}}
async function initAudio(){ac??=new AudioContext();if(!audioOut){audioOut=ac.createMediaStreamDestination();}await ac.resume();}
function audio(ptr,n){if(!playing||!ac||ac.state!=='running'||!n)return;const src=module.HEAP16.subarray(ptr/2,ptr/2+n*2),b=ac.createBuffer(2,n,module._nw_rate());for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=src[i*2+c]/32768;}if(audioNext<ac.currentTime||audioNext>ac.currentTime+.25)audioNext=ac.currentTime+.04;const node=ac.createBufferSource();node.buffer=b;node.connect(ac.destination);node.connect(audioOut);node.start(audioNext);audioNext+=n/module._nw_rate();}
function paint(ptr,w,h,pitch,fmt){if(nativeCanvas.width!==w||nativeCanvas.height!==h){nativeCanvas.width=w;nativeCanvas.height=h;pixels=null;}pixels??=ctx.createImageData(w,h);const src=module.HEAPU8,d=pixels.data;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const s=ptr+y*pitch+x*(fmt===1?4:2),o=(y*w+x)*4;if(fmt===1){d[o]=src[s+2];d[o+1]=src[s+1];d[o+2]=src[s];}else{const v=src[s]|src[s+1]<<8;d[o]=(v>>11&31)*255/31;d[o+1]=(v>>5&63)*255/63;d[o+2]=(v&31)*255/31;}d[o+3]=255;}ctx.putImageData(pixels,0,0);if(engine?.nativeContinue)return;drawFiveSelection(ctx,module,engine,colors);if(engine?.phase!=='playing')return;paintHUD?.();if(paintResults?.(paintHUD)){drawFiveContinue(ctx,module,engine,colors);return;}drawFiveContinue(ctx,module,engine,colors);
}
function present(){
 const width=nativeCanvas.width*DISPLAY_SCALE,height=nativeCanvas.height*DISPLAY_SCALE;
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 displayCtx.imageSmoothingEnabled=false;displayCtx.drawImage(nativeCanvas,0,0,width,height);
 if(engine?.phase!=='playing'||engine.long(0x10039c)===0xed682)return;
 const players=[];for(let i=0;i<engine.playerCount;i++){if(engine.players[i].state!=='active')continue;const a=engine.x.actors[i],signed=v=>v>32767?v-65536:v;players.push({slot:i+1,name:roster[i]?.name||`P${i+1}`,x:signed(engine.word(a+0x3c))-8,y:496-signed(engine.word(a+0x40)),mounted:engine.word([0x10ec14,0x10ec40,0x1053a2,0x105192,0x104f82][i])!==0});}
 drawClearLabels(displayCtx,{width,height,players,bubbles,colors,now:performance.now()});
}

function tick(t){requestAnimationFrame(tick);if(!playing||!engine||session?.slot!==1)return;if(!lastTick)lastTick=t;clock+=Math.min(100,t-lastTick);lastTick=t;const dt=1000/module._nw_fps();let n=0;try{while(clock>=dt&&n++<5){for(let i=1;i<5;i++)if(t-heldAt[i]>500)held[i]=0;held[0]=bits;engine.step(held);clock-=dt;}if(clock>dt*5)clock=dt*5;}catch(e){stop('실행 오류: '+e.message);}}
requestAnimationFrame(tick);
$('create').onclick=()=>safe(join(true));$('joinForm').onsubmit=e=>{e.preventDefault();safe(join(false));};$('ready').onclick=()=>safe(act({type:'ready',ready:!roster.find(p=>p.slot===session.slot)?.ready,character:+$('character').value}));$('character').onchange=()=>safe(act({type:'ready',ready:false,character:+$('character').value}));$('select').onclick=()=>safe(act({type:'native-command',command:'select',character:+$('character').value}));
$('load').onclick=async()=>{try{if(!crypto.subtle)throw Error('게임 실행은 HTTPS 주소에서 가능합니다. 배포된 사이트를 열어주세요.');const f=$('rom').files[0],downloaded=pendingDownload;pendingDownload=null;const source=downloaded||(f?await f.arrayBuffer():await readSavedROM());if(!source)throw Error('게임을 선택하고 설치해주세요.');$('load').disabled=true;void initAudio();profile=await(await fetch('./native/profile.json')).json();module=await createMS3({print:()=>{},printErr:()=>{}});await prepareCoopROM(module,source,profile,v=>note('준비 '+Math.round(v*100)+'%'));if(!module._nw_load())throw Error('CORE_LOAD_FAILED');canvas.width=304*DISPLAY_SCALE;canvas.height=224*DISPLAY_SCALE;stream=canvas.captureStream(30);for(const t of audioOut.stream.getAudioTracks())stream.addTrack(t);await act({type:'native-loaded',loaded:true});$('start').disabled=false;let stored=!f&&!downloaded;if(f||downloaded){try{await saveROM(source);stored=true;$('romInfo').textContent='이 PC에 저장 완료 · 다음부터 자동으로 준비됩니다.';}catch{$('romInfo').textContent='브라우저 저장 공간이 부족합니다. 다음 접속 시 다시 선택해주세요.';}}$('installGame').textContent=stored?'설치 완료':'실행 준비 완료 · 저장 안 됨';note('게임 준비 완료 · 대원들이 준비하면 출동하세요.');return true;}catch(e){note(e.message);$('load').disabled=false;return false;}};
async function offerInstallation(){if(session?.slot!==1){note('참가자는 별도 데이터 설치 없이 방장의 게임에 연결됩니다.');return;}const saved=await readSavedROM().catch(()=>null);if(saved){note('이 PC에 이미 설치된 게임입니다.');if(!$('load').disabled)$('load').click();return;}$('installDialog').showModal();}
$('gameSelect').onclick=()=>safe(offerInstallation());$('installGame').onclick=()=>safe(offerInstallation());
$('cancelInstall').onclick=()=>$('installDialog').close();$('confirmInstall').onclick=async()=>{
 $('installDialog').close();$('installGame').disabled=true;$('gameSelect').disabled=true;note('설치 권한 확인 중…');$('romInfo').textContent='설치 준비 중…';
 try{pendingDownload=await downloadGame({member:{token:localStorage.getItem('nwProfileToken'),device:localStorage.getItem('nwProfileDevice')},headers:testHeaders(),onProgress:p=>{const message='게임 설치 다운로드 '+Math.round(p*100)+'%';note(message);$('romInfo').textContent=message;}});note('다운로드 검증 완료 · 게임 데이터 준비 중…');await $('load').onclick();}
 catch(e){pendingDownload=null;note(e.message);$('romInfo').textContent='설치가 완료되지 않았습니다. 게임 설치를 다시 눌러주세요.';}
 finally{$('installGame').disabled=false;$('gameSelect').disabled=false;}
};
$('rom').onchange=()=>{if($('rom').files[0])$('load').click();};
$('start').onclick=()=>safe((async()=>{await initAudio();await act({type:'start-native'});})());$('coin').onclick=()=>safe(command('coin'));$('sound').onclick=()=>safe(session?.slot===1?initAudio():($('video').muted=false,$('video').play()));const chatPanel=document.querySelector('aside'),chatParent=chatPanel.parentElement;
$('full').onclick=()=>safe((async()=>{const stage=$('stage');stage.append(chatPanel);try{await stage.requestFullscreen();}catch(e){chatParent.append(chatPanel);throw e;}})());
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)chatParent.append(chatPanel);});
function closeChat(){chatOpen=false;pendingChat=false;composing=false;$('chatForm').hidden=playing;$('chat').blur();bits=0;}
const chatPresentation=createChatPresentation({
 show:e=>{const li=document.createElement('li');li.dataset.messageId=e.messageId;li.dataset.slot=String(e.slot);li.textContent=`${e.spectator?'[관전] ':''}P${e.slot} ${e.name}: ${e.text}`;$('messages').append(li);if($('messages').children.length>100)$('messages').firstChild.remove();bubbles.set(e.slot,{messageId:e.messageId,text:e.text,until:performance.now()+5000});},
 reject:(e,error)=>{if(bubbles.get(e.slot)?.messageId===e.messageId)bubbles.delete(e.slot);for(const li of $('messages').children)if(li.dataset.messageId===e.messageId&&li.dataset.slot===String(e.slot))li.textContent+=' (전송 실패)';}
});
function sendChat(){
 const text=$('chat').value.trim();$('chat').value='';closeChat();if(!text)return;
 const self=roster.find(p=>p.slot===session.slot),messageId=[...crypto.getRandomValues(new Uint8Array(16))].map(v=>v.toString(16).padStart(2,'0')).join('');
 const event={type:'chat',slot:session.slot,name:self?.name||`P${session.slot}`,spectator:self?.state==='spectator',text,messageId};
 safe(chatPresentation.send(event,()=>act({type:'chat',text,messageId})));
}

$('chat').onfocus=()=>{chatOpen=true;bits=0;};
$('chatForm').onsubmit=e=>{e.preventDefault();if(composing)pendingChat=true;else sendChat();};$('chat').oncompositionstart=()=>composing=true;$('chat').oncompositionend=()=>{composing=false;if(pendingChat)queueMicrotask(()=>{if(chatOpen)sendChat();});};
window.addEventListener('keydown',e=>{if(!session)return;if(e.key==='Enter'){if(enterHeld||e.repeat)return;enterHeld=true;if(!chatOpen){e.preventDefault();chatOpen=true;bits=0;$('chatForm').hidden=false;$('chat').focus();}else if(composing||e.isComposing)pendingChat=true;else{e.preventDefault();sendChat();}return;}if(chatOpen){if(e.key==='Escape')closeChat();return;}if(completed||/INPUT|SELECT/.test(e.target.tagName))return;if(e.code==='Digit5'&&session.slot===1&&!e.repeat){e.preventDefault();safe(command('coin'));return;}if(keymap[e.code]){e.preventDefault();if(e.code==='KeyJ'&&!e.repeat){if(session.slot===1&&engine?.phase==='attract')safe(command('start'));}bits|=keymap[e.code];}});
window.addEventListener('keyup',e=>{if(e.key==='Enter')enterHeld=false;bits&=~(keymap[e.code]||0);});window.addEventListener('blur',()=>{bits=0;enterHeld=false;});document.addEventListener('visibilitychange',()=>{bits=0;if(document.hidden&&session?.slot===1&&playing){safe(act({type:'native-pause'}));stop('방장 창이 숨겨졌습니다. 현재 검증본은 새 방으로 재시작하세요.');}});
setInterval(()=>{if(!session||!playing||completed||roster[session.slot-1]?.state==='spectator')return;const t=performance.now();if(bits!==lastSent||t-lastSentAt>150){lastSent=bits;lastSentAt=t;if(config.inputTransport==='webrtc'){if(session.slot!==1){const ch=peers.get(1)?.channel;if(ch?.readyState==='open'&&ch.bufferedAmount<4096)ch.send(JSON.stringify({type:'input',bits,sequence:seq++}));}}else safe(act({type:'native-input',bits,sequence:seq++}));}},35);
setInterval(()=>{if(session&&transportAlive)safe(act({type:'ping'}));},5000);
let publishedState='',stateInFlight=false;
setInterval(async()=>{if(!playing||!engine||session?.slot!==1||stateInFlight)return;const state={type:'native-state',completed:engine.phase==='complete',players:engine.players.slice(0,engine.playerCount).map(({state,lives})=>({state,lives}))},key=JSON.stringify(state);if(key===publishedState)return;stateInFlight=true;try{await act(state);publishedState=key;}catch(e){note(e.message);}finally{stateInFlight=false;}},500);
// Read-only diagnostics for reproducible browser checks; no state mutation endpoint.
window.newtOnlineDiagnostics=()=>({slot:session?.slot,playing,state:engine?.state(),credits:engine?.byte(0x10fdb0),peers:[...peers].map(([slot,{pc}])=>({slot,state:pc.connectionState})),inputChannel:peers.get(1)?.channel?.readyState,videoFrames:$('video').getVideoPlaybackQuality?.().totalVideoFrames||0,audioState:ac?.state,roster:roster.map(p=>({...p}))});

async function listenPoll(){let cursor=0;for(;;){const r=await apiFetch(`/api/rooms/${session.room}/poll?after=${cursor}`,{headers:{Authorization:'Bearer '+session.token}}),d=await r.json();if(!r.ok){stop(d.error);return;}if(d.slot)session.slot=d.slot;if(d.snapshot)await event({type:'snapshot',...d.snapshot});for(const e of d.events)await event(e);cursor=d.cursor;await new Promise(resolve=>setTimeout(resolve,750));}}
