import {verifyCommand} from './command-proof.mjs?v=71';
import {createSingleFlight} from './single-flight.mjs?v=71';
import {PROTOCOL,INPUT_DELAY,InputSequencer,FrameQueue,stateHash} from './lockstep.mjs?v=71';
import {captureState,restoreState,sendSnapshot,SnapshotReceiver} from './lockstep-snapshot.mjs?v=71';
import {gatherDescription,peerOptions,connectionStage} from './peer-connection.mjs?v=71';
import {createCandidateBatcher} from './candidate-batcher.mjs?v=71';
import {waitForConnection} from './connection-check.mjs?v=71';
import {createRoomActions} from './room-actions.mjs?v=71';
import {startError,checkLaunch} from './start-flow.mjs?v=71';
import {starLabel,showCompletionStar} from './rankings.mjs?v=71';
import {readScores} from './native/score-reader.mjs?v=71';
import {chooseCoinQuantity} from './coin-purchase.mjs?v=71';
import {READY_REQUIRED,needsReady,showRoomNotice} from './room-feedback.mjs?v=71';
import {MemberCoins} from './member-coins.mjs?v=53';
import {lobbyAudio} from './lobby-audio.mjs?v=51';
import {downloadGame} from './download-game.mjs?v=50';
import {testHeaders} from './test-access.mjs?v=71';
import {readSavedROM,saveROM} from './rom-cache.mjs';
const API='https://newtworld-ms3-coop-5p.pluckypeach517.chatgpt.site';
const apiFetch=(path,options={})=>fetch(API+path,{...options,signal:options.signal||AbortSignal.timeout(15000),headers:{...options.headers,...testHeaders()}});
import {createChatPresentation} from './chat-presentation.mjs';
import {drawClearLabels,DISPLAY_SCALE} from './clear-labels.mjs';

import {makeResults} from './native-results.mjs';
import {drawFiveSelection,drawFiveContinue} from './native-selection.mjs?v=71';
import {makeHUD} from './native-hud.mjs?v=71';
import {FiveSession} from './native/five-session.mjs?v=71';
import {prepareCoopROM} from './native/prepare-coop.mjs';
const $=id=>document.getElementById(id),BUILD='nw-ms3-input-lockstep-v71';
const colors=['#ff6464','#65afff','#68dc83','#ffc45e','#c892ff'],keymap={KeyW:1,KeyS:2,KeyA:4,KeyD:8,KeyJ:16,KeyK:32,KeyU:64};
let renderedAudience=null,renderedCards=null,coreGeneration=0;const hostChanges=new Set();const careerRecords=new Map();let lastScoreRead=0,scoreSample=[];
let launchBusy=false,coreReady=false,loadingCore=null;
let frameQueue=null,sequencer=null,synced=false,syncFault=false,lastProgress=0,waitingNotice=false;const hashes=new Map();
let pendingDownload=null,away=false,purchaseBusy=false,hasGame=false,roomPhase='lobby',roomEpoch=0,pollCursor=0;
const coins=new MemberCoins();
const coinSound=new Audio('../draw/space-assets/coin-insert-v27.wav');coinSound.preload='auto';
function chime(){coinSound.currentTime=0;coinSound.play().catch(()=>{});}
function paintCredits(){const value=coins.balance;$('creditCount').textContent='보유 코인 '+value+(coins.pending?` (+${coins.pendingQuantity||1}개 결제 확인 중)`:'');syncNativeCredits();}
function updateCoins(data){if(coins.update(data)){paintCredits();}}
async function refreshWallet(){const w=await post('/api/wallet',{member:{token:localStorage.getItem('nwProfileToken'),device:localStorage.getItem('nwProfileDevice')}});updateCoins(w);}

let viewers=[],viewer=false,entryRole='player',commandBusy=false,gameReady=false;const handledCommands=new Set(),startApprovals=new Set();
let session,roster=[],module,engine,profile,ac,audioNext=0,playing=false,completed=false,seq=0,bits=0,lastSent=-1,lastSentAt=0,lastTick=0,clock=0,chatOpen=false,composing=false,pendingChat=false,enterHeld=false,transportAlive=false,config;
const creditReceipts=new Map();
const peers=new Map(),held=[0,0,0,0,0],heldAt=[0,0,0,0,0],bubbles=new Map();
const canvas=$('screen'),displayCtx=canvas.getContext('2d',{alpha:false}),nativeCanvas=document.createElement('canvas'),ctx=nativeCanvas.getContext('2d',{alpha:false});let pixels,paintHUD,paintResults;
const note=s=>$('status').textContent=({PURCHASE_IN_PROGRESS:'코인 결제 확인 중입니다. 구매 버튼으로 결과를 확인한 뒤 준비해주세요.',UNREADY_BEFORE_PURCHASE:'준비 취소 후 코인을 구매해주세요.',SPECTATOR_INPUT:'관전자는 게임 조작이나 코인 사용을 할 수 없습니다.',ALL_PRESENT_READY_REQUIRED:'현재 입장한 인원이 모두 준비를 눌러주세요.',CLIENT_UPDATE_REQUIRED:'새 버전이 적용되었습니다. 새로고침한 뒤 방을 다시 만들어주세요.',BUILD_MISMATCH:'새로고침한 뒤 방을 다시 만들어주세요.',ALL_PLAYERS_NEED_COIN:'모든 참가자가 코인을 1개 이상 구매해야 출동할 수 있습니다.',PAID_COIN_REQUIRED:'보유 코인이 없습니다. 채팅창 옆 코인 구매 버튼을 눌러주세요.',CONTINUE_NOT_AVAILABLE:'지금은 컨티뉴를 사용할 수 없습니다.'}[s]||s);
async function post(path,data){const r=await apiFetch(path,{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token}:{})},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw Object.assign(Error(d.error),{retryable:d.retryable});if(d.wallet)updateCoins(d.wallet);return d;}
let queuedActions=null,readyBusy=false,rosterRevision=0,soundEnabled=false;
const act=data=>{const own=session;if(!own)return Promise.reject(Error('NOT_IN_ROOM'));if(!queuedActions||queuedActions.owner!==own)queuedActions={owner:own,send:createRoomActions(message=>{if(session!==own)throw Error('ROOM_CHANGED');return post(`/api/rooms/${own.room}/action`,message);})};return data.type==='ping'?post(`/api/rooms/${own.room}/action`,data):queuedActions.send(data);};
async function command(command){if(commandBusy)return;commandBusy=true;try{const r=await act({type:'native-command',command,...(session.slot===1&&engine&&command!=='start'?{players:engine.players.slice(0,engine.playerCount).map(({state,lives})=>({state,lives}))}:{})});if(r.event&&session.slot===1)await event(r.event);else if(r.proof)sendControl({type:'command-proof',proof:r.proof});if(r.event&&['continue','revive'].includes(command)){rosterRevision=Math.max(rosterRevision,r.event.id||0);const self=roster.find(p=>p.slot===session.slot);if(self)self.state='selecting';resetGameInput();}return r;}finally{commandBusy=false;}}
function safe(p){return Promise.resolve(p).catch(e=>{note(e.message);if(e.message==='ALL_PRESENT_READY_REQUIRED')showRoomNotice(READY_REQUIRED);});}
function render(){document.body.classList.toggle('has-viewers',viewers.length>0);const cardsKey=JSON.stringify([roster,[...careerRecords],session?.slot,hasGame]);if(cardsKey!==renderedCards){renderedCards=cardsKey;const list=$('players');list.replaceChildren();for(let i=0;i<5;i++){const p=roster[i],a=document.createElement('article');a.className='player-card'+(!p?' empty-seat':'');if(!p){a.textContent='대원 대기 중';list.append(a);continue;}const slot=document.createElement('div');slot.className='slot';slot.textContent=`P${p.slot}`;slot.style.color=colors[i];const name=document.createElement('b');name.textContent=p.name;appendStaff(name,p.staffRole);const state=document.createElement('small');state.textContent=p.slot===1?'방장':'참가 대원';a.append(slot,name,state);const record=careerRecords.get(p.slot),stars=document.createElement('span');stars.className='completion-stars';stars.textContent=record?starLabel(record.stars):'☆';stars.title=record?`누적 완주 ${record.stars}회 · 최고 ${record.best_score.toLocaleString()}점`:'완주 기록 확인 중';a.append(stars);const grades=[1000,3000,10000,30000,50000,100000,200000],names=['입문자','초보자','중급자','숙련자','전문가','마스터','레전드'];let gi=grades.findLastIndex(v=>Number(p.gradeScore)>=v);if(gi>=0){const badge=document.createElement('img');badge.className='grade-badge';badge.src=`../assets/badges/v335/rank-${gi+1}.webp`;badge.alt=names[gi]+' 등급';badge.title=badge.alt;a.append(badge);}if(p.ready||playing){const ready=document.createElement('span');ready.className='ready';ready.textContent=!p.connected?'연결 끊김':playing?(p.away?'작전실 대기':p.state==='spectator'?'관전 중':'플레이 중'):'READY';a.append(ready);}if(session?.slot===1&&!hasGame&&p.slot!==1)a.append(memberActions(p,true));list.append(a);}}const self=roster.find(p=>p.slot===session?.slot);$('ready').disabled=readyBusy||launchBusy||!coreReady;$('ready').textContent=readyBusy?'READY 처리 중…':self?.ready?'READY 취소':'READY';$('ready').hidden=hasGame||viewer;paintCredits();$('start').textContent=completed?'새 게임 준비':hasGame?'도중 참가하기':'GAME START';$('start').hidden=completed?session?.slot!==1:hasGame?!away:session?.slot!==1;$('start').disabled=launchBusy;if($('gameLeave'))$('gameLeave').textContent=solo()&&!completed&&!viewer?'게임 포기하기':'작전실';$('leaveRoom').textContent=document.body.classList.contains('in-game')?(solo()&&!completed?'게임 포기하기':'작전실로 나가기'):'방 나가기';$('rejoinGame').hidden=viewer||!hasGame||completed;$('rejoinGame').disabled=!['spectator','continue'].includes(self?.state);$('coin').hidden=viewer;$('coin').disabled=purchaseBusy||(!hasGame&&!!self?.ready);$('coin').title=self?.ready&&!hasGame?'준비 취소 후 코인을 구매해주세요.':'';const audienceKey=JSON.stringify([session?.slot,hasGame,viewers.map(p=>[p.slot,p.name,p.staffRole])]);if(audienceKey!==renderedAudience){renderedAudience=audienceKey;const audience=$('audienceList');audience.replaceChildren();if(!viewers.length){const empty=document.createElement('li');empty.textContent='관전자 없음';audience.append(empty);}for(const p of viewers){const li=document.createElement('li');li.textContent=p.name;appendStaff(li,p.staffRole);if(session?.slot===1&&!hasGame)li.append(memberActions(p,false));audience.append(li);}$('gameAudienceCount').textContent=`관전자 ${viewers.length}명`;const gameAudience=$('gameAudienceList');gameAudience.replaceChildren(...[...audience.children].map(li=>li.cloneNode(true)));}$('viewerChatForm').hidden=!viewer;$('chatForm').hidden=viewer||(playing&&!away&&!chatOpen);$('startHint').textContent=self?.started?'동료들의 J 시작을 기다리는 중…':'J를 눌러 시작 · 코인 1개';if(engine?.selection&&engine.phase==='attract'){const waiting=engine.selection.slice(0,engine.playerCount).flatMap((p,i)=>p.confirmed?[]:[roster[i]?.name||`P${i+1}`]);$('startHint').textContent=waiting.length?`캐릭터 선택: A / D · J 확정 — 대기: ${waiting.join(', ')}`:'모든 대원 선택 완료 · 출동 중…';}$('startHint').hidden=viewer||!hasGame||away||completed||(!engine?.selection&&roster.every(p=>p.started))||engine?.phase==='playing';$('start').hidden=viewer?(!hasGame||!away):$('start').hidden;if(viewer)$('start').textContent='관전하기';}

function solo(){return roster.filter(p=>!p.departed).length===1;}
async function join(create){if(session)throw Error('ALREADY_IN_ROOM');const name=$('name').value;let path='/api/rooms',data={name,role:entryRole,build:BUILD,...(window.nwLobbyConfig?.()||{}),member:{token:localStorage.getItem('nwProfileToken'),device:localStorage.getItem('nwProfileDevice')}};if(!create){const [room,invite]=$('invite').value.trim().split('.');if(!/^[a-f0-9]{16}$/.test(room||'')||!invite)throw Error('초대 코드를 확인하세요');path+=`/${room}/join`;data.invite=invite;}session=await post(path,data);rosterRevision=0;hostChanges.clear();viewer=session.role==='viewer';document.body.classList.toggle('is-viewer',viewer);$('viewerChat').hidden=false;handledCommands.clear();startApprovals.clear();const joined=session,epoch=++roomEpoch;pollCursor=0;hasGame=false;roomPhase='lobby';completed=false;away=false;await refreshWallet();careerRecords.clear();safe(refreshCareerRecords());const configResponse=await apiFetch('/native-config?room='+session.room,{headers:{Authorization:'Bearer '+session.token}});config=await configResponse.json();if(!configResponse.ok)throw Error(config.error||'연결 설정을 읽을 수 없습니다');$('joinForm').hidden=true;$('controls').hidden=false;$('host').hidden=false;if(session.invite)$('code').textContent=session.room+'.'+session.invite;$('start').hidden=session.slot!==1;$('coin').hidden=false;$('coin').disabled=false;window.nwEnterRoom?.(window.nwPendingRoomTitle||data.title);transportAlive=true;listenPoll(joined,epoch).catch(e=>{if(session===joined)stop('연결 중단: '+e.message);}).finally(()=>{if(session===joined&&epoch===roomEpoch)transportAlive=false;});note('모든 대원이 준비하면 방장이 출동할 수 있습니다.');{readSavedROM().then(data=>{if(data&&session===joined&&epoch===roomEpoch){$('romInfo').textContent='이 PC에 저장된 게임 데이터를 찾았습니다.';$('load').click();}}).catch(()=>{});}}
window.nwJoinPublic=(id,title,role='player')=>{entryRole=role;$('invite').value=id+'.public';window.nwPendingRoomTitle=title;return join(false);};
$('leaveRoom').onclick=()=>safe((async()=>{
 if(document.body.classList.contains('in-game')){bits=0;if(viewer){setAway(true);return;}if(session.slot<=5)held[session.slot-1]=0;if(solo()&&!completed){await flushCreditReceipts();await act({type:'native-abandon'});stop('게임을 포기했습니다.');}else await act({type:'native-return'});setAway(true);return;}
 if(session.slot===1&&hasGame&&!completed&&roster.some(p=>p.slot!==1&&!p.departed)&&!await NWUI.confirm({title:'방 나가기',message:'방장이 방을 나가면 진행 중인 게임도 종료됩니다. 나가시겠습니까?'}))return;
 await flushCreditReceipts();await act({type:'leave'});exitToChannel();
})());
function disposeGame(){coreGeneration++;coreReady=false;synced=false;syncFault=false;frameQueue=null;sequencer=null;hashes.clear();for(const slot of [...peers.keys()])discardPeer(slot);engine=null;module?._nw_close?.();module=null;held.fill(0);bits=0;creditReceipts.clear();publishedState='';}
function exitToChannel(){roomEpoch++;session=null;transportAlive=false;playing=false;hasGame=false;completed=false;away=false;disposeGame();roster=[];viewers=[];viewer=false;document.body.classList.remove('is-viewer','has-viewers');$('viewerMessages').replaceChildren();$('load').disabled=false;$('start').disabled=true;$('joinForm').hidden=false;$('controls').hidden=true;$('screen').hidden=true;$('messages').replaceChildren();bubbles.clear();window.nwBackToChannel?.();safe(refreshWallet());}
function setAway(value){away=value;bits=0;lastSent=-1;lastTick=0;clock=0;
 if(value){if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});window.nwOperations?.();note(!hasGame?'작전실 · READY 후 새 게임을 시작할 수 있습니다.':completed?'게임 종료 · 남은 코인은 회원 계정에 보관됩니다.':'작전실 복귀 · 동료들의 게임은 계속됩니다.');}
 else {playing=roomPhase==='native'&&!completed;const self=roster.find(p=>p.slot===session?.slot);if(self)self.away=false;window.nwGameStarted?.();resetGameInput();}
 render();
}

function stop(reason){playing=false;held.fill(0);bits=0;lastSent=-1;audioNext=0;note(reason);}
async function event(e){
 if(e.type==='closed'){exitToChannel();note('방이 종료되어 대기실로 돌아왔습니다.');return;}
 if(e.type==='audience'){viewers=e.viewers;for(const [slot,r]of peers)if(slot>5&&!viewers.some(p=>p.slot===slot)){r.pc.onconnectionstatechange=null;r.pc.close();peers.delete(slot);}render();if(session.slot===1&&hasGame)for(const p of viewers)if(!peers.has(p.slot))await makePeer(p.slot,true);}
 if((e.type==='snapshot'||e.type==='roster')&&(!e.id||e.id>=rosterRevision)){if(e.viewers)viewers=e.viewers;if(!hasGame&&session?.slot===1&&JSON.stringify(roster.map(p=>p.seatId))!==JSON.stringify(e.players.map(p=>p.seatId)))for(const slot of [...peers.keys()])discardPeer(slot);roster=e.players;if(e.completed)completed=true;render();}
 if(e.type==='host-changed'&&roomPhase==='lobby'&&!hasGame&&!hostChanges.has(e.id)){hostChanges.add(e.id);coreGeneration++;disposeGame();roster=e.players;careerRecords.clear();$('host').hidden=false;$('load').disabled=false;render();safe(refreshCareerRecords());note(`${e.host} 님에게 방장 권한이 이전되었습니다. 다시 READY를 눌러주세요.`);{const saved=await readSavedROM().catch(()=>null);if(saved)$('load').click();}}
 if(e.type==='completion-stars'){if(e.players.some(p=>p.slot===session.slot))showCompletionStar(e.runId);safe(refreshCareerRecords());}
 if(e.type==='game-complete'){completed=true;render();bits=0;held.fill(0);note('MISSION ALL OVER · 채팅은 계속 이용할 수 있습니다.');}
 if(e.type==='game-over'){completed=true;stop('GAME OVER · 작전실로 돌아갈 수 있습니다.');render();}
 if(e.type==='paused'){roomPhase='paused';stop('잠시 일시정지 · 창으로 돌아와 연결이 확인되면 이어집니다.');}
 if(e.type==='native-resumed'){roomPhase='native';playing=!completed;lastTick=0;clock=0;bits=0;held.fill(0);audioNext=0;note('게임을 이어서 진행합니다.');if(!document.hidden){ac?.resume().catch(()=>{});module?._nw_redraw?.();}}
 if(e.type==='native-presence'){const p=roster.find(p=>p.slot===e.slot);if(p){p.away=e.away;if(e.departed)p.departed=true;}if(session.slot===1&&sequencer)sequencer.enqueue(e);if(e.slot===session.slot)setAway(e.away);render();}
 if(e.type==='native-reset'){roomPhase='lobby';coreGeneration++;handledCommands.clear();startApprovals.clear();lastScoreRead=0;scoreSample=[];playing=false;hasGame=false;completed=false;away=true;disposeGame();roster=e.players;$('load').disabled=false;setAway(true);render();await $('load').onclick();}
 if(e.type==='native-start'){
  if(hasGame)return;if(!coreReady||!engine){note('이 PC의 게임 설치와 준비가 필요합니다.');return;}
  roster=e.players;hasGame=true;completed=false;roomPhase='native';playing=true;away=false;synced=false;syncFault=false;frameQueue=new FrameQueue();hashes.clear();
  engine.playerCount=roster.length;engine.players.forEach((p,i)=>{p.character=roster[i]?.character??0;p.participating=i<roster.length;p.state=i<roster.length?'waiting':'spectator';p.lives=i<roster.length?3:0;});
  paintHUD=makeHUD(module,engine,ctx);paintResults=makeResults(module,engine,ctx);module.onVideo=renderLocalFrame;module.onAudio=audio;$('screen').hidden=false;$('gameLoading').hidden=false;window.nwGameStarted?.();resetGameInput();render();
  if(session.slot===1){sequencer=new InputSequencer({slots:roster.filter(p=>!p.departed).map(p=>p.slot),onFrame:packet=>{frameQueue.receive(packet);broadcastSync(packet);}});synced=true;$('gameLoading').hidden=true;for(const p of [...roster,...viewers])if(p.slot!==1){const r=await makePeer(p.slot,true);if(r.control?.readyState==='open')safe(syncPeer(r));}}
  else requestSync();
 }
 if(e.type==='signal'&&e.to===session.slot){try{await signal(e.from,e.signal);}catch(err){note('입력 연결 오류: '+err.message);}}
 if(e.type==='native-command'&&session.slot===1&&sequencer)sequencer.enqueue(e);
 if(e.type==='chat')chatPresentation.receive(e);
}
async function makePeer(slot,offer=false,attempt=null,mode='auto'){
 if(peers.has(slot))return peers.get(slot);const pc=new RTCPeerConnection(peerOptions(config,mode));const record={pc,slot,attempt:attempt||crypto.randomUUID(),mode,iceErrors:[],queue:[],channel:null,control:null,coreReady:false,synced:false,receiver:new SnapshotReceiver()};peers.set(slot,record);
 record.candidates=createCandidateBatcher(signal=>{if(peers.get(slot)===record)return act({type:'signal',to:slot,signal:{...signal,attempt:record.attempt}});},e=>note('연결 신호 전송 실패: '+e.message));pc.onicecandidate=e=>record.candidates.add(e.candidate?.toJSON());pc.onicecandidateerror=e=>record.iceErrors.push(e.errorCode);
 pc.onconnectionstatechange=()=>{record.stateChangedAt=performance.now();if(['failed','disconnected','closed'].includes(pc.connectionState)){record.synced=false;note(`P${slot} 입력 연결 복구 중`);}};
 pc.ondatachannel=e=>{if(session.slot!==1&&slot===1&&e.channel.label===PROTOCOL)bindControl(record,e.channel,slot);else e.channel.close();};
 if(offer){bindControl(record,pc.createDataChannel(PROTOCOL,{ordered:true}),slot);await pc.setLocalDescription(await pc.createOffer());const description=await gatherDescription(pc);if(peers.get(slot)!==record)throw Error('PEER_REPLACED');await act({type:'signal',to:slot,signal:{...description,attempt:record.attempt,mode}});}
 return record;
}
function discardPeer(slot){const r=peers.get(slot);if(!r)return;r.candidates?.cancel();r.pc.onconnectionstatechange=null;r.pc.onicecandidate=null;if(r.control)r.control.onclose=null;r.pc.close();peers.delete(slot);}
async function signal(from,s){
 const current=peers.get(from);
 if(s.type==='offer'){
  if(current&&s.attempt&&current.attempt===s.attempt&&current.pc.remoteDescription)return;
  if(current&&(!s.attempt||current.attempt!==s.attempt))discardPeer(from);
 }else if(s.attempt&&(!current||current.attempt!==s.attempt))return;
 if(s.type==='candidates'){for(const candidate of s.candidates)await signal(from,{type:'candidate',candidate,attempt:s.attempt});return;}
 const r=await makePeer(from,false,s.attempt,s.mode||'auto'),pc=r.pc;
 if(s.type==='candidate'){if(pc.remoteDescription)await pc.addIceCandidate(s.candidate);else r.queue.push(s.candidate);return;}
 await pc.setRemoteDescription({type:s.type,sdp:s.sdp});for(const c of r.queue.splice(0))await pc.addIceCandidate(c);
 if(s.type==='offer'){await pc.setLocalDescription(await pc.createAnswer());const description=await gatherDescription(pc);if(peers.get(from)!==r)return;safe(act({type:'signal',to:from,signal:{...description,attempt:r.attempt}}));}
}

async function initAudio(){ac??=new AudioContext();await ac.resume();}
function audio(ptr,n){if(!playing||!soundEnabled||away||!ac||ac.state!=='running'||!n)return;const src=module.HEAP16.subarray(ptr/2,ptr/2+n*2),b=ac.createBuffer(2,n,module._nw_rate());for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=src[i*2+c]/32768;}if(audioNext<ac.currentTime||audioNext>ac.currentTime+.25)audioNext=ac.currentTime+.04;const node=ac.createBufferSource();node.buffer=b;if(!away)node.connect(ac.destination);node.start(audioNext);audioNext+=n/module._nw_rate();}
function paint(ptr,w,h,pitch,fmt){if(nativeCanvas.width!==w||nativeCanvas.height!==h){nativeCanvas.width=w;nativeCanvas.height=h;pixels=null;}pixels??=ctx.createImageData(w,h);const src=module.HEAPU8,d=pixels.data;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const s=ptr+y*pitch+x*(fmt===1?4:2),o=(y*w+x)*4;if(fmt===1){d[o]=src[s+2];d[o+1]=src[s+1];d[o+2]=src[s];}else{const v=src[s]|src[s+1]<<8;d[o]=(v>>11&31)*255/31;d[o+1]=(v>>5&63)*255/63;d[o+2]=(v&31)*255/31;}d[o+3]=255;}ctx.putImageData(pixels,0,0);if(engine?.nativeContinue)return;drawFiveSelection(ctx,module,engine,colors);if(engine?.phase!=='playing')return;paintHUD?.();if(paintResults?.(paintHUD)){drawFiveContinue(ctx,module,engine,colors);return;}drawFiveContinue(ctx,module,engine,colors);
}
function present(target=canvas){
 const output=target===canvas?displayCtx:target.getContext('2d',{alpha:false});
 const width=nativeCanvas.width*DISPLAY_SCALE,height=nativeCanvas.height*DISPLAY_SCALE;
 if(target.width!==width||target.height!==height){target.width=width;target.height=height;}
 output.imageSmoothingEnabled=false;output.drawImage(nativeCanvas,0,0,width,height);
 if(engine?.phase!=='playing'||engine.long(0x10039c)===0xed682)return;
 const players=[];for(let i=0;i<engine.playerCount;i++){if(engine.players[i].state!=='active')continue;const a=engine.x.actors[i],signed=v=>v>32767?v-65536:v;players.push({slot:i+1,name:roster[i]?.name||`P${i+1}`,x:signed(engine.word(a+0x3c))-8,y:496-signed(engine.word(a+0x40)),mounted:engine.word([0x10ec14,0x10ec40,0x1053a2,0x105192,0x104f82][i])!==0});}
 drawClearLabels(output,{width,height,players,bubbles,colors,now:performance.now()});
}

// CREDIT is presentation-only: temporarily override during redraw, restore before any emulated frame.
function syncNativeCredits(){if(module&&coreReady&&!playing)module._nw_redraw();}
function renderLocalFrame(...args){if(document.hidden)return;paint(...args);present();}
function redrawLocal(){if(!module)return;module._nw_credits(coins.balance);module._nw_redraw();module._nw_credits(0);}
function applyCommand(e){if(e.type==='native-presence'){if(e.departed)engine.removePlayer(e.slot);return;}if(e.type!=='native-command'||handledCommands.has(e.commandId))return;handledCommands.add(e.commandId);let accepted=true;try{if(e.command==='start'){startApprovals.add(e.slot);if(engine.players.slice(0,engine.playerCount).filter(p=>!p.departed).every(p=>startApprovals.has(p.slot))&&engine.phase==='attract'&&!engine.pendingStart)engine.start();}if(e.command==='continue')engine.authorizeContinue(e.slot,'paid-'+e.commandId);if(e.command==='revive')engine.authorizeRejoin(e.slot,'paid-'+e.commandId);if(e.command==='select')engine.selectCharacter(e.slot,e.character);}catch(err){accepted=false;note(err.message);}if(session.slot===1&&['continue','revive'].includes(e.command)){creditReceipts.set(e.commandId,{type:'native-credit-result',slot:e.slot,commandId:e.commandId,accepted});void flushCreditReceipts().catch(()=>{});}}
function submitInput(frame){if(viewer||!synced)return;const value=away||document.hidden?0:bits;if(session.slot===1)sequencer?.submit(1,frame,value);else sendControl({type:'input',frame,bits:value});}
function tick(t){requestAnimationFrame(tick);if(!document.hidden)advanceGame(t);}
function advanceGame(t){if(!playing||!engine||!synced||syncFault||!frameQueue)return;if(!lastTick)lastTick=t;clock+=Math.min(100,t-lastTick);lastTick=t;const dt=1000/module._nw_fps();let n=0;try{
 if(session.slot===1){if(roster.some(p=>p.slot!==1&&!p.departed&&!peers.get(p.slot)?.synced)){clock=0;note('동료 PC의 게임 상태를 맞추는 중…');return;}sequencer.drain();}
 while(clock>=dt&&n++<5){const packet=frameQueue.take();if(!packet){clock=Math.min(clock,dt);if(lastProgress&&performance.now()-lastProgress>1500&&!waitingNotice){waitingNotice=true;note('동료의 입력을 기다리는 중 · 연결 복구 후 같은 프레임부터 이어집니다.');}break;}lastProgress=performance.now();if(waitingNotice){waitingNotice=false;note('입력 동기화가 복구되었습니다.');}for(const e of packet.commands)applyCommand(e);engine.step(packet.inputs);if(frameQueue.frame%120===0){const hash=stateHash(engine);hashes.set(frameQueue.frame,hash);if(hashes.size>20)hashes.delete(hashes.keys().next().value);if(session.slot===1)broadcastSync({type:'hash',frame:frameQueue.frame,hash});else sendControl({type:'hash',frame:frameQueue.frame,hash});}
 submitInput(packet.frame+INPUT_DELAY);clock-=dt;if(session.slot===1)sequencer.drain();}
 if(n>1)redrawLocal();if(clock>dt*5)clock=dt*5;
 }catch(e){syncFault=true;stop('동기화 실행 오류: '+e.message);}}
requestAnimationFrame(tick);
const backgroundClock=new Worker(new URL('./clock-worker.mjs?v=71',import.meta.url),{type:'module'});backgroundClock.onmessage=()=>{if(document.hidden)advanceGame(performance.now());};
$('create').onclick=()=>{entryRole='player';safe(join(true));};$('joinForm').onsubmit=e=>{e.preventDefault();safe(join(false));};$('ready').onclick=createSingleFlight(async()=>{if(launchBusy)return;const owner=session,self=roster.find(p=>p.slot===owner?.slot);if(!self)return;readyBusy=true;render();void enableSound().catch(()=>{});try{const result=await act({type:'ready',ready:!self.ready,character:self.character??0});if(session===owner&&result.players){rosterRevision=Math.max(rosterRevision,result.revision||0);roster=result.players;}}catch(e){note(e.message);}finally{readyBusy=false;render();}});
async function loadCore(){const owner=session,epoch=roomEpoch,generation=coreGeneration;try{if(coreReady)return true;if(!crypto.subtle)throw Error('게임 실행은 HTTPS 주소에서 가능합니다. 배포된 사이트를 열어주세요.');const f=$('rom').files[0],downloaded=pendingDownload;pendingDownload=null;const source=downloaded||(f?await f.arrayBuffer():await readSavedROM());if(!source)throw Error('게임을 선택하고 설치해주세요.');$('load').disabled=true;void initAudio();profile=await(await fetch('./native/profile.json')).json();const loadedModule=await createMS3({print:()=>{},printErr:()=>{}});await prepareCoopROM(loadedModule,source,profile,v=>note('준비 '+Math.round(v*100)+'%'));if(session!==owner||epoch!==roomEpoch||generation!==coreGeneration){loadedModule._nw_close?.();return false;}module=loadedModule;if(!module._nw_load())throw Error('CORE_LOAD_FAILED');engine=new FiveSession(module,profile,{characters:[0,1,2,3,0],playerCount:5,sharedSelection:true,paid:true});note('게임 시작 화면 준비 중…');for(let block=0;block<35;block++){for(let i=0;i<40;i++)engine.step([0,0,0,0,0]);await new Promise(r=>setTimeout(r,0));if(generation!==coreGeneration||session!==owner)return false;}canvas.width=304*DISPLAY_SCALE;canvas.height=224*DISPLAY_SCALE;module.onVideo=renderLocalFrame;module._nw_redraw();await act({type:'native-loaded',loaded:true,protocol:PROTOCOL});coreReady=true;for(const r of peers.values())sendHello(r);render();$('start').disabled=false;let stored=!f&&!downloaded;if(f||downloaded){try{await saveROM(source);stored=true;$('romInfo').textContent='이 PC에 저장 완료 · 다음부터 자동으로 준비됩니다.';}catch{$('romInfo').textContent='브라우저 저장 공간이 부족합니다. 다음 접속 시 다시 선택해주세요.';}}$('installGame').textContent=stored?'설치 완료':'실행 준비 완료 · 저장 안 됨';note('내 PC 게임 준비 완료 · READY를 눌러주세요.');if(hasGame)requestSync();return true;}catch(e){note(e.message);$('load').disabled=false;return false;}};
$('load').onclick=()=>loadingCore??=(loadCore().finally(()=>{loadingCore=null;}));
async function offerInstallation(){const saved=await readSavedROM().catch(()=>null);if(saved){note('이 PC에 이미 설치된 게임입니다.');if(!$('load').disabled)$('load').click();return;}$('installDialog').showModal();}
$('gameSelect').onclick=()=>safe(offerInstallation());$('installGame').onclick=()=>safe(offerInstallation());
$('cancelInstall').onclick=()=>$('installDialog').close();$('confirmInstall').onclick=async()=>{
 $('installDialog').close();$('installGame').disabled=true;$('gameSelect').disabled=true;note('설치 권한 확인 중…');$('romInfo').textContent='설치 준비 중…';
 try{pendingDownload=await downloadGame({member:{token:localStorage.getItem('nwProfileToken'),device:localStorage.getItem('nwProfileDevice')},headers:testHeaders(),onProgress:p=>{const message='게임 설치 다운로드 '+Math.round(p*100)+'%';note(message);$('romInfo').textContent=message;}});note('다운로드 검증 완료 · 게임 데이터 준비 중…');await $('load').onclick();}
 catch(e){pendingDownload=null;note(e.message);$('romInfo').textContent='설치가 완료되지 않았습니다. 게임 설치를 다시 눌러주세요.';}
 finally{$('installGame').disabled=false;$('gameSelect').disabled=false;}
};
$('rom').onchange=()=>{if($('rom').files[0])$('load').click();};
$('start').onclick=async()=>{
 if(launchBusy)return;
 const initial=!hasGame&&!completed;
 const problem=initial?checkLaunch({slot:session?.slot,viewer,roster,coreReady:coreReady&&!!engine}):null;
 if(problem){showRoomNotice(problem);return;}
 launchBusy=true;render();note(initial?'게임 시작 요청 중…':'게임 연결 요청 중…');
 // Audio permission must not block the server start request.
 void enableSound().catch(()=>note('소리는 소리 켜기 버튼으로 활성화할 수 있습니다.'));
 try{
  if(completed){if(session?.slot!==1)throw Error('HOST_ONLY');await flushCreditReceipts();await act({type:'native-reset'});return;}
  if(hasGame){if(viewer){setAway(false);return;}const self=roster.find(p=>p.slot===session.slot);if(['spectator','continue'].includes(self?.state))await revive();else{await act({type:'native-rejoin'});setAway(false);}}
  else {await verifyGameConnections();const result=await act({type:'start-native'});if(result?.phase==='native')await event({type:'native-start',players:result.players});note('연결 완료 · 각자 J를 눌러 시작해주세요.');}
 }catch(e){const message=startError(e.message);note(message);showRoomNotice(message);}
 finally{launchBusy=false;render();}
};
$('coin').onclick=()=>safe(buyCoin());$('rejoinGame').onclick=()=>safe(revive());
async function revive(){if(coins.balance<1){note('코인부터 넣어주세요. 코인 구매 버튼으로 충전할 수 있습니다.');return;}if(away){await act({type:'native-rejoin'});setAway(false);}await command('revive');}
$('waitingMusic').onclick=()=>{$('waitingMusic').textContent=lobbyAudio.toggle()?'대기 음악 끄기':'대기 음악 켜기';};
async function buyCoin(){
 if(purchaseBusy||!session||viewer)return;if(!hasGame&&roster.find(p=>p.slot===session.slot)?.ready){note('준비 취소 후 코인을 구매해주세요.');return;}purchaseBusy=true;$('coin').disabled=true;bits=0;
 const owner=session,key='nwCoopCoin:'+session.room+':'+session.slot;
 try{let saved=sessionStorage.getItem(key),pending;try{pending=saved?JSON.parse(saved):null;}catch{pending=saved?{id:saved,quantity:1}:null;}
  if(!pending){const quantity=await chooseCoinQuantity();if(!quantity)return;pending={id:crypto.randomUUID(),quantity};sessionStorage.setItem(key,JSON.stringify(pending));}
  const {id,quantity}=pending;coins.pendingQuantity=quantity;
  coins.pending=true;paintCredits();note('코인 구매 확인 중…');
  const r=await post(`/api/rooms/${session.room}/coin`,{requestId:id,quantity,member:{token:localStorage.getItem('nwProfileToken'),device:localStorage.getItem('nwProfileDevice')}});
  sessionStorage.removeItem(key);coins.pending=false;updateCoins({balance:r.credits,revision:r.revision});chime();render();window.dispatchEvent(new Event('nw-wallet-updated'));note(`코인 구매 완료 · 보유 ${r.credits}개`);
 }catch(e){if(e.retryable===false)sessionStorage.removeItem(key);note(e.message+' · 응답 지연 시 코인 구매를 다시 누르면 같은 요청을 확인합니다.');}
 finally{purchaseBusy=false;coins.pending=false;paintCredits();render();}
}
async function enableSound(){soundEnabled=true;await initAudio();$('sound').textContent='소리 켜짐';}
$('sound').onclick=()=>safe(enableSound());
function resetGameInput(){chatOpen=false;pendingChat=false;composing=false;enterHeld=false;bits=0;held.fill(0);lastSent=-1;lastTick=0;clock=0;$('chatForm').hidden=true;document.activeElement?.blur();$('gameSurface').focus({preventScroll:true});}
$('full').disabled=false;
$('full').onclick=()=>safe((async()=>{if(document.fullscreenElement)await document.exitFullscreen();else if(document.body.classList.contains('expanded-view')){document.body.classList.remove('expanded-view');$('full').textContent='전체화면';}else{try{await document.documentElement.requestFullscreen();}catch{document.body.classList.add('expanded-view');$('full').textContent='전체화면 해제';note('브라우저의 전체화면 허용을 받지 못해 창 안에서 화면을 확대했습니다.');}}})());
document.addEventListener('fullscreenchange',()=>{$('full').textContent=document.fullscreenElement?'전체화면 해제':'전체화면';if(document.body.classList.contains('in-game')&&!chatOpen)resetGameInput();});
function closeChat(){chatOpen=false;pendingChat=false;composing=false;$('chatForm').hidden=playing&&!away;$('chat').blur();bits=0;}
const chatPresentation=createChatPresentation({
 show:e=>{const li=document.createElement('li');li.dataset.messageId=e.messageId;li.dataset.slot=String(e.slot);li.textContent=`${e.audience?'[관전]':e.spectator?'[관전] P'+e.slot:'P'+e.slot} ${e.name}: ${e.text}`;const log=e.audience?$('viewerMessages'):$('messages'),follow=log.scrollHeight-log.scrollTop-log.clientHeight<40;log.append(li);while(log.children.length>100)log.firstChild.remove();if(follow)log.scrollTop=log.scrollHeight;if(!e.audience)bubbles.set(e.slot,{messageId:e.messageId,text:e.text,until:performance.now()+5000});},
 reject:(e,error)=>{if(bubbles.get(e.slot)?.messageId===e.messageId)bubbles.delete(e.slot);for(const li of [...$('messages').children,...$('viewerMessages').children])if(li.dataset.messageId===e.messageId&&li.dataset.slot===String(e.slot))li.textContent+=' (전송 실패)';}
});
function sendChat(){
 const text=$('chat').value.trim();$('chat').value='';closeChat();if(!text)return;
 const self=roster.find(p=>p.slot===session.slot),messageId=[...crypto.getRandomValues(new Uint8Array(16))].map(v=>v.toString(16).padStart(2,'0')).join('');
 const event={type:'chat',slot:session.slot,name:self?.name||`P${session.slot}`,spectator:self?.state==='spectator',text,messageId};
 previewChat(event);safe(chatPresentation.send(event,()=>act({type:'chat',text,messageId})));
}

$('chat').onfocus=()=>{chatOpen=true;bits=0;};
$('chatForm').onsubmit=e=>{e.preventDefault();if(composing)pendingChat=true;else sendChat();};$('chat').oncompositionstart=()=>composing=true;$('chat').oncompositionend=()=>{composing=false;if(pendingChat)queueMicrotask(()=>{if(chatOpen)sendChat();});};
window.addEventListener('keydown',e=>{if(!session||document.querySelector('dialog[open]'))return;if(viewer){if(e.key==='Enter'&&document.activeElement!==$('viewerInput')){e.preventDefault();$('viewerInput').focus();}return;}if(e.key==='Enter'){if(enterHeld||e.repeat)return;enterHeld=true;if(!chatOpen){e.preventDefault();chatOpen=true;bits=0;$('chatForm').hidden=false;$('chat').focus();}else if(composing||e.isComposing)pendingChat=true;else{e.preventDefault();sendChat();}return;}if(chatOpen){if(e.key==='Escape')closeChat();return;}if(completed||away||purchaseBusy||!playing||document.querySelector('dialog[open]')||/INPUT|SELECT/.test(e.target.tagName))return;if(keymap[e.code]){e.preventDefault();if(e.code==='KeyJ'&&!e.repeat){const p=engine?.players[session.slot-1];if(!roster.find(p=>p.slot===session.slot)?.started){safe(command('start'));return;}if(['continue','spectator'].includes(p?.state)){safe(command('continue'));return;}}bits|=keymap[e.code];}});
window.addEventListener('keyup',e=>{if(e.key==='Enter')enterHeld=false;bits&=~(keymap[e.code]||0);});window.addEventListener('blur',()=>{bits=0;enterHeld=false;});document.addEventListener('visibilitychange',()=>{bits=0;held.fill(0);enterHeld=false;lastTick=0;clock=0;audioNext=0;if(!document.hidden){ac?.resume().catch(()=>{});module?._nw_redraw?.();safe(recoverWindow());}});
setInterval(()=>{if(session&&transportAlive)safe(act({type:'ping'}));},5000);
let publishedState='',stateInFlight=false;
async function publishState(){if(!playing||!engine||stateInFlight)return;const scoring=['playing','complete'].includes(engine.phase);if(scoring&&(performance.now()-lastScoreRead>=1000||engine.phase==='complete'||scoreSample.length!==engine.playerCount)){scoreSample=readScores(engine);lastScoreRead=performance.now();}const state={type:'native-state',completed:engine.phase==='complete',...(scoring?{mission:engine.byte(0x10040c)}:{}),players:engine.players.slice(0,engine.playerCount).map(({state,lives},i)=>({state,lives,...(scoring?{score:scoreSample[i]||0}:{})}))},key=JSON.stringify(state);if(key===publishedState)return;stateInFlight=true;try{await act(state);publishedState=key;}catch(e){note(e.message);}finally{stateInFlight=false;}}
setInterval(publishState,400);
// Read-only diagnostics for reproducible browser checks; no state mutation endpoint.
window.newtOnlineDiagnostics=()=>({wallet:{balance:coins.balance,revision:coins.revision},hasGame,away,completed,bits,chatOpen,inputFocus:document.activeElement?.id,slot:session?.slot,coreReady,launchBusy,roomPhase,transportAlive,playing,state:engine?.state(),credits:engine?.byte(0x10fdb0),peers:[...peers].map(([slot,{pc}])=>({slot,state:pc.connectionState,ice:pc.iceConnectionState,signaling:pc.signalingState})),inputChannel:peers.get(1)?.channel?.readyState,execution:'local-input-lockstep',synced,syncFault,syncFrame:frameQueue?.frame,inputDelay:INPUT_DELAY,audioState:ac?.state,roster:roster.map(p=>({...p}))});

async function listenPoll(own=session,epoch=roomEpoch){let cursor=pollCursor;while(session===own&&epoch===roomEpoch){const r=await apiFetch(`/api/rooms/${own.room}/poll?after=${cursor}`,{headers:{Authorization:'Bearer '+own.token}}),d=await r.json();if(session!==own||epoch!==roomEpoch)return;if(!r.ok){if(d.error==='PLAYER_DISCONNECTED'){exitToChannel();showRoomNotice('접속이 끊겨 방에서 퇴장되었습니다. 다시 입장해주세요.');}else if(d.error==='KICKED_FROM_ROOM'){exitToChannel();showRoomNotice('방장에 의해 강퇴되었습니다. 이 방에는 다시 입장할 수 없습니다.');}else stop(d.error);return;}if(d.slot)session.slot=d.slot;roomPhase=d.phase||roomPhase;if(d.completed||roomPhase==='game-over')completed=true;if(d.snapshot)await event({type:'snapshot',...d.snapshot});for(const e of d.events){if(session!==own||epoch!==roomEpoch)return;await event(e);pollCursor=e.id;}roomPhase=d.phase||roomPhase;if(session!==own)return;if(d.players&&(!d.revision||d.revision>=rosterRevision))roster=d.players;if(d.viewers)viewers=d.viewers;if(d.phase==='native'&&!hasGame&&coreReady)await event({type:'native-start',players:roster});if(d.wallet)updateCoins(d.wallet);if(d.phase==='native'&&!completed&&!playing&&hasGame&&synced&&!syncFault){playing=true;lastTick=0;clock=0;}render();cursor=d.cursor;pollCursor=cursor;await new Promise(resolve=>setTimeout(resolve,120));}}
let creditReceiptFlush=null;
await refreshWallet().catch(()=>{});
function flushCreditReceipts(){if(creditReceiptFlush)return creditReceiptFlush;creditReceiptFlush=(async()=>{for(const [id,receipt]of creditReceipts){await act(receipt);creditReceipts.delete(id);}})().finally(()=>creditReceiptFlush=null);return creditReceiptFlush;}
setInterval(()=>{if(session&&creditReceipts.size)flushCreditReceipts().catch(()=>{});},1000);

$('viewerChatForm').onsubmit=e=>{e.preventDefault();const text=$('viewerInput').value.trim();if(!text)return;$('viewerInput').value='';const self=viewers.find(p=>p.slot===session.slot),messageId=crypto.randomUUID();const chat={type:'chat',text,messageId,slot:session.slot,name:self?.name||'관전자',audience:true};previewChat(chat);safe(chatPresentation.send(chat,()=>act({type:'chat',text,messageId})));};

const gameControls=document.createElement('div');gameControls.id='gameControls';for(const [label,id]of [['전체화면 / 해제','full'],['소리 켜기','sound'],['작전실','leaveRoom']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>$(id).click();if(id==='leaveRoom')b.id='gameLeave';gameControls.append(b);}$('playerChat').prepend(gameControls);

window.addEventListener('nw-site-blocked',()=>{playing=false;transportAlive=false;roomEpoch++;disposeGame();session=null;lobbyAudio.setWaiting(false);});

let recoveringWindow=false;
async function recoverWindow(){
 if(recoveringWindow||document.hidden||!session||completed)return;
 recoveringWindow=true;
 try{await act({type:'ping'});if(!transportAlive){transportAlive=true;const own=session,epoch=++roomEpoch;listenPoll(own,epoch).catch(e=>{if(session===own)stop('연결 복구 중: '+e.message);}).finally(()=>{if(session===own&&epoch===roomEpoch)transportAlive=false;});}if(session?.slot===1&&hasGame&&!completed){for(const p of [...roster,...viewers]){if(p.slot===1||p.departed||!p.connected)continue;const r=peers.get(p.slot);if(!r||['failed','closed'].includes(r.pc.connectionState)||(r.pc.connectionState==='disconnected'&&performance.now()-(r.stateChangedAt||0)>3000)||r.channel?.readyState==='closed'){discardPeer(p.slot);await makePeer(p.slot,true);}}}if(session?.slot===1&&roomPhase==='paused'&&roster.filter(p=>!p.departed).every(p=>p.connected)&&roster.filter(p=>p.slot!==1&&!p.departed).every(p=>peers.get(p.slot)?.channel?.readyState==='open'))await act({type:'native-resume'});}
 catch(e){if(!['PLAYERS_NOT_CONNECTED','NOT_PAUSED','SITE_SESSION_EXPIRED'].includes(e.message))note('게임 복귀 확인 중: '+e.message);}
 finally{recoveringWindow=false;}
}
setInterval(()=>{if(roomPhase==='paused'||!transportAlive||(hasGame&&session?.slot===1&&[...peers.values()].some(r=>['failed','closed','disconnected'].includes(r.pc.connectionState)||r.channel?.readyState==='closed')))recoverWindow();},2000);

async function refreshCareerRecords(){if(!session)return;const own=session,d=await post(`/api/rooms/${session.room}/records`,{});if(session!==own)return;careerRecords.clear();for(const p of d.records)careerRecords.set(p.slot,p);render();}
setInterval(()=>{if(session&&!document.hidden&&!document.body.classList.contains('in-game'))refreshCareerRecords().catch(()=>{});},10000);

function appendStaff(parent,role){if(!['방장','부방장','운영진'].includes(role))return;const badge=document.createElement('small');badge.className='staff-role';badge.textContent=role==='운영진'?'운영진':`운영진 (${role})`;parent.append(badge);}
function memberActions(p,transfer){const wrap=document.createElement('div');wrap.className='member-actions';for(const kind of transfer?['transfer-host','kick-member']:['kick-member']){const b=document.createElement('button');b.textContent=kind==='transfer-host'?'방장 넘기기':'강퇴';b.onclick=()=>safe((async()=>{if(!await NWUI.confirm({title:b.textContent,message:kind==='transfer-host'?`${p.name} 님에게 방장 권한을 넘기시겠습니까? 준비 상태는 해제됩니다.`:`${p.name} 님을 강퇴하시겠습니까? 이 방에는 다시 입장할 수 없습니다.`,accept:b.textContent}))return;try{await act({type:kind,targetSlot:p.slot,targetSeatId:p.seatId});}catch(e){const messages={HOST_ONLY:'방장만 사용할 수 있습니다.',LOBBY_ONLY:'게임 시작 전 작전실에서만 사용할 수 있습니다.',PURCHASE_IN_PROGRESS:'코인 구매 처리 중인 인원이 있습니다. 완료 후 다시 시도해주세요.',TARGET_CHANGED:'참가자 구성이 변경되었습니다. 다시 선택해주세요.'};showRoomNotice(messages[e.message]||e.message);}})());wrap.append(b);}return wrap;}

async function verifyGameConnections(){
 const own=session,targets=roster.filter(p=>p.slot!==1&&!p.departed);if(!targets.length)return;
 note('입력 동기화 연결을 확인하는 중…');const response=await apiFetch('/native-config?room='+own.room,{headers:{Authorization:'Bearer '+own.token}}),fresh=await response.json();if(!response.ok)throw Error(fresh.error||'TURN_SERVICE_UNAVAILABLE');if(session!==own)throw Error('ROOM_CHANGED');config=fresh;
 if(!config.relayConfigured)throw Error('TURN_NOT_CONFIGURED');
 await Promise.all(targets.map(async p=>{
  for(const mode of ['auto','tls']){
   if(session!==own)throw Error('ROOM_CHANGED');
   note(`${p.name} 님과 ${mode==='tls'?'보안 중계로 다시':'직접·중계 경로를'} 연결하는 중…`);
   const existing=peers.get(p.slot);if(mode==='auto'&&existing?.pc.connectionState==='connected'&&existing.channel?.readyState==='open'&&existing.coreReady)return;discardPeer(p.slot);const peer=await makePeer(p.slot,true,null,mode);
   try{await waitForConnection(peer,{requireMedia:false,valid:()=>session===own&&roster.some(q=>q.seatId===p.seatId&&q.connected)});return;}
   catch(e){const stage=connectionStage(peer);safe(act({type:'connection-report',to:p.slot,mode,stage:peer.pc.signalingState,ice:peer.pc.iceConnectionState,connection:peer.pc.connectionState,input:peer.channel?.readyState||'none',remoteDescription:!!peer.pc.remoteDescription,iceErrors:peer.iceErrors}));discardPeer(p.slot);if(e.message==='ROOM_CHANGED'||mode==='tls')throw Error(`${p.name}: ${stage} (${e.message})`);}
  }
 }));
 if(targets.some(p=>!peers.get(p.slot)?.coreReady))throw Error('모든 PC의 게임 설치와 준비가 완료되어야 합니다.');note('모든 PC의 게임 실행·입력 연결 준비 완료');
}

function sendControl(message){const r=peers.get(1),ch=r?.control;if(ch?.readyState==='open'){if(ch.bufferedAmount>=2*1024*1024){r.synced=false;synced=false;r.pc.close();note('입력 전송이 지연되어 연결을 다시 맞추는 중입니다.');return false;}ch.send(JSON.stringify(message));return true;}return false;}
function broadcastSync(message){const data=JSON.stringify(message);for(const r of peers.values())if(r.control?.readyState==='open'){if(r.control.bufferedAmount>=4*1024*1024){r.synced=false;r.pc.close();continue;}r.control.send(data);}}
function sendHello(r){if(r.control?.readyState==='open')r.control.send(JSON.stringify({type:'hello',protocol:PROTOCOL,ready:coreReady}));}
function requestSync(){if(coreReady&&hasGame)sendControl({type:'sync-request',bootHash:frameQueue?.frame===0?stateHash(engine):null});}
async function syncPeer(r){if(!r.requestedSync||!coreReady||!hasGame||!frameQueue||r.syncing||!r.coreReady||r.control?.readyState!=='open')return;r.syncing=true;r.synced=false;try{if(frameQueue.frame===0&&r.bootHash===stateHash(engine)){r.control.send(JSON.stringify({type:'sync-init',hash:r.bootHash}));return;}r.snapshotFrame=frameQueue.frame;await sendSnapshot(r.control,captureState(module,engine,r.snapshotFrame),{protocol:PROTOCOL,handled:[...handledCommands],approved:[...startApprovals]});for(const [f,packet]of sequencer.history)if(f>=r.snapshotFrame)r.control.send(JSON.stringify(packet));}finally{r.syncing=false;}}
function failSync(message){syncFault=true;stop(message);if(session.slot===1)broadcastSync({type:'sync-fault',message});}
function bindControl(record,ch,slot){record.control=record.channel=ch;let lastChat=0;ch.onopen=()=>{sendHello(record);if(session.slot!==1)requestSync();};ch.onclose=()=>{record.synced=false;if(session?.slot!==1){synced=false;note('입력 연결이 끊겼습니다. 게임 상태 복구 중…');}};ch.onmessage=async e=>{if(peers.get(slot)!==record||typeof e.data!=='string'||e.data.length>100000)return;let m;try{m=JSON.parse(e.data);}catch{return;}try{
 if(m.type==='hello'){if(m.protocol!==PROTOCOL){note('게임 버전이 다릅니다. 모두 새로고침해주세요.');return;}record.coreReady=m.ready===true;if(session.slot===1&&hasGame&&record.requestedSync)await syncPeer(record);return;}
 if(session?.slot===1){
  if(m.type==='input'&&slot<=5&&record.synced)sequencer?.submit(slot,m.frame,m.bits);
  if(m.type==='sync-request'){record.requestedSync=true;record.bootHash=m.bootHash;await syncPeer(record);}
  if(m.type==='sync-ready'&&Number.isSafeInteger(m.frame)){record.synced=true;for(let f=sequencer?.frame||0;f<m.frame+INPUT_DELAY;f++)sequencer?.submit(slot,f,0);}
  if(m.type==='hash'){const expected=hashes.get(m.frame);if(expected&&expected!==m.hash)failSync(`P${slot} 게임 상태 불일치 · 게임을 중지했습니다. 새 방에서 다시 시작해주세요.`);}
  if(m.type==='command-proof'&&slot<=5){const grant=await verifyCommand(config.commandProofKey,session.room,m.proof,slot);if(grant&&peers.get(slot)===record&&hasGame&&!roster.find(p=>p.slot===slot)?.departed)await event(grant);}
  if(m.type==='chat-preview'&&typeof m.text==='string'&&m.text.trim()&&[...m.text].length<=120&&typeof m.messageId==='string'&&m.messageId.length<=80&&performance.now()-lastChat>=300){const p=[...roster,...viewers].find(p=>p.slot===slot);if(!p||p.departed)return;lastChat=performance.now();const chat={type:'chat',slot,name:p.name,text:m.text.trim(),messageId:m.messageId,audience:slot>5,spectator:p.state==='spectator'};chatPresentation.receive(chat);broadcastChat(chat);}
 }else if(slot===1){
  if(m.type==='sync-init'&&frameQueue?.frame===0&&m.hash===stateHash(engine)){synced=true;syncFault=false;sendControl({type:'sync-ready',frame:0});$('gameLoading').hidden=true;note('내 PC에서 게임 실행 중 · J로 시작/선택 확정');}
  if(m.type==='frame'){frameQueue?.receive(m);}
  if(m.type==='hash'){const expected=hashes.get(m.frame);if(expected&&expected!==m.hash)failSync('게임 상태가 일치하지 않아 중지했습니다. 새 방에서 다시 시작해주세요.');}
  if(m.type==='sync-fault')failSync(m.message);
  if(m.type.startsWith('snapshot-')){if(m.type==='snapshot-start'){synced=false;$('gameLoading').hidden=false;record.snapshotFrame=m.frame;}const state=record.receiver.receive(m);if(state){restoreState(module,engine,state);const old=frameQueue;frameQueue=new FrameQueue(state.frame);for(const packet of old?.pending.values()||[])frameQueue.receive(packet);handledCommands.clear();for(const id of state.handled||[])handledCommands.add(id);startApprovals.clear();for(const id of state.approved||[])startApprovals.add(id);synced=true;syncFault=false;lastTick=clock=0;hashes.clear();sendControl({type:'sync-ready',frame:frameQueue.frame});module._nw_redraw();$('gameLoading').hidden=true;note('내 PC에서 게임 실행 중 · J로 시작/선택 확정');}}
  if(m.type==='chat-preview'&&m.chat)chatPresentation.receive(m.chat);
 }
 }catch(err){failSync('동기화 오류: '+err.message);}};}
function broadcastChat(chat){broadcastSync({type:'chat-preview',chat});}
function previewChat(chat){if(session.slot===1)broadcastChat(chat);else sendControl({type:'chat-preview',text:chat.text,messageId:chat.messageId});}
let warmingPeers=false;
setInterval(async()=>{if(warmingPeers||session?.slot!==1||!coreReady||hasGame)return;warmingPeers=true;try{await Promise.all([...roster,...viewers].filter(p=>p.slot!==1&&p.connected&&!p.departed&&!peers.has(p.slot)).map(p=>makePeer(p.slot,true)));}catch(e){note('연결 준비 중: '+e.message);}finally{warmingPeers=false;}},1500);
