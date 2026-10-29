import {gatherDescription,peerOptions,connectionStage} from './peer-connection.mjs?v=66';
import {createCandidateBatcher} from './candidate-batcher.mjs?v=66';
import {waitForConnection} from './connection-check.mjs?v=66';
import {createRoomActions} from './room-actions.mjs?v=66';
import {startError,checkLaunch} from './start-flow.mjs?v=66';
import {starLabel,showCompletionStar} from './rankings.mjs?v=66';
import {readScores} from './native/score-reader.mjs?v=66';
import {chooseCoinQuantity} from './coin-purchase.mjs?v=66';
import {READY_REQUIRED,needsReady,showRoomNotice} from './room-feedback.mjs?v=66';
import {MemberCoins} from './member-coins.mjs?v=53';
import {lobbyAudio} from './lobby-audio.mjs?v=51';
import {downloadGame} from './download-game.mjs?v=50';
import {testHeaders} from './test-access.mjs?v=66';
import {readSavedROM,saveROM} from './rom-cache.mjs';
const API='https://newtworld-ms3-coop-5p.pluckypeach517.chatgpt.site';
const apiFetch=(path,options={})=>fetch(API+path,{...options,signal:options.signal||AbortSignal.timeout(15000),headers:{...options.headers,...testHeaders()}});
import {createChatPresentation} from './chat-presentation.mjs';
import {drawClearLabels,DISPLAY_SCALE} from './clear-labels.mjs';
import {inputReceiver} from './input-channel.mjs';
import {makeResults} from './native-results.mjs';
import {drawFiveSelection,drawFiveContinue} from './native-selection.mjs?v=48';
import {makeHUD} from './native-hud.mjs';
import {FiveSession} from './native/five-session.mjs?v=66';
import {prepareCoopROM} from './native/prepare-coop.mjs';
const $=id=>document.getElementById(id),BUILD='nw-ms3-online-lab-v55';
const colors=['#ff6464','#65afff','#68dc83','#ffc45e','#c892ff'],keymap={KeyW:1,KeyS:2,KeyA:4,KeyD:8,KeyJ:16,KeyK:32,KeyU:64};
let renderedAudience=null,renderedCards=null,coreGeneration=0;const hostChanges=new Set();const careerRecords=new Map();let lastScoreRead=0,scoreSample=[];
let launchBusy=false,coreReady=false;
let pendingDownload=null,away=false,purchaseBusy=false,hasGame=false,roomPhase='lobby',roomEpoch=0,pollCursor=0;
const coins=new MemberCoins();
const coinSound=new Audio('../draw/space-assets/coin-insert-v27.wav');coinSound.preload='auto';
function chime(){coinSound.currentTime=0;coinSound.play().catch(()=>{});}
function paintCredits(){const value=coins.balance;$('creditCount').textContent='보유 코인 '+value+(coins.pending?` (+${coins.pendingQuantity||1}개 결제 확인 중)`:'');syncNativeCredits();}
function updateCoins(data){if(coins.update(data)){paintCredits();const ch=peers.get(1)?.channel;if(session?.slot!==1&&ch?.readyState==='open')ch.send(JSON.stringify({type:'wallet-display',balance:coins.balance,revision:coins.revision}));}}
async function refreshWallet(){const w=await post('/api/wallet',{member:{token:localStorage.getItem('nwProfileToken'),device:localStorage.getItem('nwProfileDevice')}});updateCoins(w);}

let viewers=[],viewer=false,entryRole='player',commandBusy=false,gameReady=false;const handledCommands=new Set(),startApprovals=new Set();
let session,roster=[],module,engine,profile,stream,ac,audioOut,audioNext=0,playing=false,completed=false,seq=0,bits=0,lastSent=-1,lastSentAt=0,lastTick=0,clock=0,chatOpen=false,composing=false,pendingChat=false,enterHeld=false,transportAlive=false,config;
const creditReceipts=new Map();
const peers=new Map(),held=[0,0,0,0,0],heldAt=[0,0,0,0,0],bubbles=new Map();
const canvas=$('screen'),displayCtx=canvas.getContext('2d',{alpha:false}),nativeCanvas=document.createElement('canvas'),ctx=nativeCanvas.getContext('2d',{alpha:false});let pixels,paintHUD,paintResults;
const note=s=>$('status').textContent=({PURCHASE_IN_PROGRESS:'코인 결제 확인 중입니다. 구매 버튼으로 결과를 확인한 뒤 준비해주세요.',UNREADY_BEFORE_PURCHASE:'준비 취소 후 코인을 구매해주세요.',SPECTATOR_INPUT:'관전자는 게임 조작이나 코인 사용을 할 수 없습니다.',ALL_PRESENT_READY_REQUIRED:'현재 입장한 인원이 모두 준비를 눌러주세요.',CLIENT_UPDATE_REQUIRED:'새 버전이 적용되었습니다. 새로고침한 뒤 방을 다시 만들어주세요.',BUILD_MISMATCH:'새로고침한 뒤 방을 다시 만들어주세요.',ALL_PLAYERS_NEED_COIN:'모든 참가자가 코인을 1개 이상 구매해야 출동할 수 있습니다.',PAID_COIN_REQUIRED:'보유 코인이 없습니다. 채팅창 옆 코인 구매 버튼을 눌러주세요.',CONTINUE_NOT_AVAILABLE:'지금은 컨티뉴를 사용할 수 없습니다.'}[s]||s);
async function post(path,data){const r=await apiFetch(path,{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token}:{})},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw Object.assign(Error(d.error),{retryable:d.retryable});if(d.wallet)updateCoins(d.wallet);return d;}
let queuedActions=null;
const act=data=>{const own=session;if(!own)return Promise.reject(Error('NOT_IN_ROOM'));if(!queuedActions||queuedActions.owner!==own)queuedActions={owner:own,send:createRoomActions(message=>{if(session!==own)throw Error('ROOM_CHANGED');return post(`/api/rooms/${own.room}/action`,message);})};return queuedActions.send(data);};
async function command(command){if(commandBusy)return;commandBusy=true;try{const r=await act({type:'native-command',command,...(session.slot===1&&engine&&command!=='start'?{players:engine.players.slice(0,engine.playerCount).map(({state,lives})=>({state,lives}))}:{})});if(r.event&&session.slot===1)await event(r.event);return r;}finally{commandBusy=false;}}
function safe(p){return Promise.resolve(p).catch(e=>{note(e.message);if(e.message==='ALL_PRESENT_READY_REQUIRED')showRoomNotice(READY_REQUIRED);});}
function render(){document.body.classList.toggle('has-viewers',viewers.length>0);const cardsKey=JSON.stringify([roster,[...careerRecords],session?.slot,hasGame]);if(cardsKey!==renderedCards){renderedCards=cardsKey;const list=$('players');list.replaceChildren();for(let i=0;i<5;i++){const p=roster[i],a=document.createElement('article');a.className='player-card'+(!p?' empty-seat':'');if(!p){a.textContent='대원 대기 중';list.append(a);continue;}const slot=document.createElement('div');slot.className='slot';slot.textContent=`P${p.slot}`;slot.style.color=colors[i];const name=document.createElement('b');name.textContent=p.name;appendStaff(name,p.staffRole);const state=document.createElement('small');state.textContent=p.slot===1?'방장 · '+['Marco','Tarma','Eri','Fio'][p.character]:['Marco','Tarma','Eri','Fio'][p.character];a.append(slot,name,state);const record=careerRecords.get(p.slot),stars=document.createElement('span');stars.className='completion-stars';stars.textContent=record?starLabel(record.stars):'☆';stars.title=record?`누적 완주 ${record.stars}회 · 최고 ${record.best_score.toLocaleString()}점`:'완주 기록 확인 중';a.append(stars);const grades=[1000,3000,10000,30000,50000,100000,200000],names=['입문자','초보자','중급자','숙련자','전문가','마스터','레전드'];let gi=grades.findLastIndex(v=>Number(p.gradeScore)>=v);if(gi>=0){const badge=document.createElement('img');badge.className='grade-badge';badge.src=`../assets/badges/v335/rank-${gi+1}.webp`;badge.alt=names[gi]+' 등급';badge.title=badge.alt;a.append(badge);}if(p.ready||playing){const ready=document.createElement('span');ready.className='ready';ready.textContent=playing?(p.away?'작전실 대기':p.state==='spectator'?'관전 중':'플레이 중'):'READY';a.append(ready);}if(session?.slot===1&&!hasGame&&p.slot!==1)a.append(memberActions(p,true));list.append(a);}}const self=roster.find(p=>p.slot===session?.slot);$('ready').textContent=self?.ready?'READY 취소':'READY';$('ready').hidden=hasGame||viewer;$('character').disabled=hasGame||viewer;paintCredits();$('start').textContent=completed?'새 게임 준비':hasGame?'도중 참가하기':'GAME START';$('start').hidden=completed?session?.slot!==1:hasGame?!away:session?.slot!==1;$('start').disabled=launchBusy;if($('gameLeave'))$('gameLeave').textContent=solo()&&!completed&&!viewer?'게임 포기하기':'작전실';$('leaveRoom').textContent=document.body.classList.contains('in-game')?(solo()&&!completed?'게임 포기하기':'작전실로 나가기'):'방 나가기';$('rejoinGame').hidden=viewer||!hasGame||completed;$('rejoinGame').disabled=!['spectator','continue'].includes(self?.state);$('coin').hidden=viewer;$('coin').disabled=purchaseBusy||(!hasGame&&!!self?.ready);$('coin').title=self?.ready&&!hasGame?'준비 취소 후 코인을 구매해주세요.':'';const audienceKey=JSON.stringify([session?.slot,hasGame,viewers.map(p=>[p.slot,p.name,p.staffRole])]);if(audienceKey!==renderedAudience){renderedAudience=audienceKey;const audience=$('audienceList');audience.replaceChildren();if(!viewers.length){const empty=document.createElement('li');empty.textContent='관전자 없음';audience.append(empty);}for(const p of viewers){const li=document.createElement('li');li.textContent=p.name;appendStaff(li,p.staffRole);if(session?.slot===1&&!hasGame)li.append(memberActions(p,false));audience.append(li);}$('gameAudienceCount').textContent=`관전자 ${viewers.length}명`;const gameAudience=$('gameAudienceList');gameAudience.replaceChildren(...[...audience.children].map(li=>li.cloneNode(true)));}$('viewerChatForm').hidden=!viewer;$('chatForm').hidden=viewer||(playing&&!away&&!chatOpen);$('startHint').textContent=self?.started?'동료들의 J 시작을 기다리는 중…':'J를 눌러 시작 · 코인 1개';if(engine?.selection&&engine.phase==='attract'){const waiting=engine.selection.slice(0,engine.playerCount).flatMap((p,i)=>p.confirmed?[]:[roster[i]?.name||`P${i+1}`]);$('startHint').textContent=waiting.length?`캐릭터 선택: A / D · J 확정 — 대기: ${waiting.join(', ')}`:'모든 대원 선택 완료 · 출동 중…';}$('startHint').hidden=viewer||!hasGame||away||completed||(!engine?.selection&&roster.every(p=>p.started))||engine?.phase==='playing';$('start').hidden=viewer?(!hasGame||!away):$('start').hidden;if(viewer)$('start').textContent='관전하기';}

function solo(){return roster.filter(p=>!p.departed).length===1;}
async function join(create){if(session)throw Error('ALREADY_IN_ROOM');const name=$('name').value;let path='/api/rooms',data={name,role:entryRole,build:BUILD,...(window.nwLobbyConfig?.()||{}),member:{token:localStorage.getItem('nwProfileToken'),device:localStorage.getItem('nwProfileDevice')}};if(!create){const [room,invite]=$('invite').value.trim().split('.');if(!/^[a-f0-9]{16}$/.test(room||'')||!invite)throw Error('초대 코드를 확인하세요');path+=`/${room}/join`;data.invite=invite;}session=await post(path,data);hostChanges.clear();viewer=session.role==='viewer';document.body.classList.toggle('is-viewer',viewer);$('viewerChat').hidden=false;handledCommands.clear();startApprovals.clear();const joined=session,epoch=++roomEpoch;pollCursor=0;hasGame=false;roomPhase='lobby';completed=false;away=false;await refreshWallet();careerRecords.clear();safe(refreshCareerRecords());const configResponse=await apiFetch('/native-config?room='+session.room,{headers:{Authorization:'Bearer '+session.token}});config=await configResponse.json();if(!configResponse.ok)throw Error(config.error||'연결 설정을 읽을 수 없습니다');$('joinForm').hidden=true;$('controls').hidden=false;$('host').hidden=session.slot!==1;if(session.invite)$('code').textContent=session.room+'.'+session.invite;$('start').hidden=session.slot!==1;$('coin').hidden=false;$('coin').disabled=false;window.nwEnterRoom?.(window.nwPendingRoomTitle||data.title);transportAlive=true;listenPoll(joined,epoch).catch(e=>{if(session===joined)stop('연결 중단: '+e.message);}).finally(()=>{if(session===joined&&epoch===roomEpoch)transportAlive=false;});note('모든 대원이 준비하면 방장이 출동할 수 있습니다.');if(session.slot===1){readSavedROM().then(data=>{if(data&&session===joined&&epoch===roomEpoch){$('romInfo').textContent='이 PC에 저장된 게임 데이터를 찾았습니다.';$('load').click();}}).catch(()=>{});}}
window.nwJoinPublic=(id,title,role='player')=>{entryRole=role;$('invite').value=id+'.public';window.nwPendingRoomTitle=title;return join(false);};
$('leaveRoom').onclick=()=>safe((async()=>{
 if(document.body.classList.contains('in-game')){bits=0;if(viewer){setAway(true);return;}if(session.slot<=5)held[session.slot-1]=0;if(solo()&&!completed){await flushCreditReceipts();await act({type:'native-abandon'});completed=true;stop('게임을 포기했습니다.');}else await act({type:'native-return'});setAway(true);return;}
 if(session.slot===1&&hasGame&&!completed&&roster.some(p=>p.slot!==1&&!p.departed)&&!await NWUI.confirm({title:'방 나가기',message:'방장이 방을 나가면 진행 중인 게임도 종료됩니다. 나가시겠습니까?'}))return;
 await flushCreditReceipts();await act({type:'leave'});exitToChannel();
})());
function disposeGame(){coreReady=false;for(const {pc,channel,media,candidates}of peers.values()){candidates?.cancel();pc.onconnectionstatechange=null;pc.onicecandidate=null;if(channel)channel.onclose=null;media?.getVideoTracks().forEach(t=>t.stop());pc.close();}peers.clear();stream?.getTracks().forEach(t=>t.stop());stream=null;$('video').srcObject=null;engine=null;module?._nw_close?.();module=null;held.fill(0);bits=0;creditReceipts.clear();publishedState='';}
function exitToChannel(){roomEpoch++;session=null;transportAlive=false;playing=false;hasGame=false;completed=false;away=false;disposeGame();roster=[];viewers=[];viewer=false;document.body.classList.remove('is-viewer','has-viewers');$('viewerMessages').replaceChildren();$('load').disabled=false;$('start').disabled=true;$('joinForm').hidden=false;$('controls').hidden=true;$('screen').hidden=true;$('video').hidden=true;$('messages').replaceChildren();bubbles.clear();window.nwBackToChannel?.();safe(refreshWallet());}
function setAway(value){away=value;bits=0;lastSent=-1;lastTick=0;clock=0;$('video').muted=value;
 if(value){if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});window.nwOperations?.();note(completed?'게임 종료 · 남은 코인은 회원 계정에 보관됩니다.':'작전실 복귀 · 동료들의 게임은 계속됩니다.');}
 else {playing=roomPhase==='native'&&!completed;const self=roster.find(p=>p.slot===session?.slot);if(self)self.away=false;window.nwGameStarted?.();resetGameInput();if(session.slot!==1)safe($('video').play());}
 render();
}

async function listen(){if(config.eventTransport==='poll'||new URLSearchParams(location.search).get('transport')==='poll')return listenPoll();const r=await apiFetch(`/api/rooms/${session.room}/events`,{headers:{Authorization:'Bearer '+session.token}});if(!r.ok)throw Error('EVENT_STREAM_FAILED');const reader=r.body.pipeThrough(new TextDecoderStream()).getReader();let b='';for(;;){const v=await reader.read();if(v.done){stop('연결이 끊겼습니다.');return;}b+=v.value;let n;while((n=b.indexOf('\n\n'))>=0){const row=b.slice(0,n);b=b.slice(n+2);const d=row.split('\n').find(x=>x.startsWith('data: '));if(d)await event(JSON.parse(d.slice(6)));}}}
function stop(reason){playing=false;held.fill(0);bits=0;lastSent=-1;audioNext=0;note(reason);}
async function event(e){
 if(e.type==='closed'){exitToChannel();note('방이 종료되어 대기실로 돌아왔습니다.');return;}
 if(e.type==='audience'){viewers=e.viewers;for(const [slot,r]of peers)if(slot>5&&!viewers.some(p=>p.slot===slot)){r.pc.onconnectionstatechange=null;r.media?.getVideoTracks().forEach(t=>t.stop());r.pc.close();peers.delete(slot);}render();if(session.slot===1&&hasGame)for(const p of viewers)if(!peers.has(p.slot))await makePeer(p.slot,true);}
 if(e.type==='snapshot'||e.type==='roster'){if(e.viewers)viewers=e.viewers;roster=e.players;if(e.completed)completed=true;render();}
 if(e.type==='host-changed'&&roomPhase==='lobby'&&!hasGame&&!hostChanges.has(e.id)){hostChanges.add(e.id);coreGeneration++;disposeGame();roster=e.players;careerRecords.clear();$('host').hidden=session.slot!==1;$('load').disabled=false;render();safe(refreshCareerRecords());note(`${e.host} 님에게 방장 권한이 이전되었습니다. 다시 READY를 눌러주세요.`);if(session.slot===1){const saved=await readSavedROM().catch(()=>null);if(saved&&session?.slot===1)$('load').click();}}
 if(e.type==='completion-stars'){if(e.players.some(p=>p.slot===session.slot))showCompletionStar(e.runId);safe(refreshCareerRecords());}
 if(e.type==='game-complete'){completed=true;render();bits=0;held.fill(0);note('MISSION ALL OVER · 채팅은 계속 이용할 수 있습니다.');}
 if(e.type==='game-over'){completed=true;stop('GAME OVER · 작전실로 돌아갈 수 있습니다.');render();}
 if(e.type==='paused'){roomPhase='paused';stop('잠시 일시정지 · 창으로 돌아와 연결이 확인되면 이어집니다.');}
 if(e.type==='native-resumed'){roomPhase='native';playing=!completed&&(session.slot===1||!away);lastTick=0;clock=0;bits=0;held.fill(0);audioNext=0;note('게임을 이어서 진행합니다.');if(!document.hidden){ac?.resume().catch(()=>{});if(session.slot!==1)$('video').play().catch(()=>{});module?._nw_redraw?.();}}
 if(e.type==='native-presence'){const p=roster.find(p=>p.slot===e.slot);if(p){p.away=e.away;if(e.departed)p.departed=true;}if(e.slot<=5)held[e.slot-1]=0;if(e.slot===session.slot)setAway(e.away);render();}
 if(e.type==='native-reset'){handledCommands.clear();startApprovals.clear();lastScoreRead=0;scoreSample=[];playing=false;hasGame=false;completed=false;away=true;disposeGame();roster=e.players;$('load').disabled=false;setAway(true);render();if(session.slot===1)await $('load').onclick();}
 if(e.type==='native-start'){
  if(hasGame)return;roster=e.players;hasGame=true;completed=false;roomPhase='native';playing=true;away=false;render();$('coin').disabled=false;$('full').disabled=false;window.nwGameStarted?.();resetGameInput();$('gameLoading').hidden=false;
  if(session.slot===1){if(!engine)throw Error('게임 준비를 다시 해주세요.');engine.playerCount=roster.length;engine.players.forEach((p,i)=>{p.character=roster[i]?.character??0;p.participating=i<roster.length;p.state=i<roster.length?'waiting':'spectator';p.lives=i<roster.length?3:0;});paintHUD=makeHUD(module,engine,ctx);paintResults=makeResults(module,engine,ctx);$('screen').hidden=false;module.onVideo=renderNativeVideo;syncNativeCredits();module.onAudio=audio;module._nw_redraw();gameReady=true;$('gameLoading').hidden=true;if(coins.balance>0)chime();lastTick=0;clock=0;for(const p of [...roster,...viewers])if(p.slot!==1)await makePeer(p.slot,true);}
  else {$('video').hidden=false;note('방장의 게임 영상 연결 중');}
 }
 if(e.type==='signal'&&e.to===session.slot){try{await signal(e.from,e.signal);}catch(err){note('영상 연결 오류: '+err.message);}}
 if(e.type==='native-input'&&session.slot===1){held[e.slot-1]=e.bits;heldAt[e.slot-1]=performance.now();}
 if(e.type==='native-command'&&session.slot===1&&engine){if(handledCommands.has(e.commandId))return;handledCommands.add(e.commandId);let accepted=true;try{if(e.command==='start'){startApprovals.add(e.slot);if(startApprovals.size===engine.playerCount&&engine.phase==='attract'&&!engine.pendingStart)engine.start();}if(e.command==='continue')engine.authorizeContinue(e.slot,'paid-'+e.id);if(e.command==='revive')engine.authorizeRejoin(e.slot,'paid-'+e.id);if(e.command==='select')engine.selectCharacter(e.slot,e.character);}catch(err){accepted=false;note(err.message);}if(['continue','revive'].includes(e.command)){creditReceipts.set(e.commandId,{type:'native-credit-result',slot:e.slot,commandId:e.commandId,accepted});await flushCreditReceipts().catch(()=>{});}}
 if(e.type==='chat')chatPresentation.receive(e);
}
async function makePeer(slot,offer=false,attempt=null,mode='auto'){if(peers.has(slot))return peers.get(slot);const pc=new RTCPeerConnection(peerOptions(config,mode));const record={pc,attempt:attempt||crypto.randomUUID(),mode,iceErrors:[],queue:[],chain:Promise.resolve(),channel:null,wallet:new MemberCoins(),surface:null,media:null};peers.set(slot,record);record.candidates=createCandidateBatcher(signal=>{if(peers.get(slot)!==record)return;return act({type:'signal',to:slot,signal:{...signal,attempt:record.attempt}});},e=>note('중계 신호 전송 실패: '+e.message));pc.onicecandidate=e=>record.candidates.add(e.candidate?.toJSON());pc.onicecandidateerror=e=>{record.iceErrors.push(e.errorCode);record.iceErrors=record.iceErrors.slice(-8);};pc.onconnectionstatechange=()=>{if(['failed','disconnected','closed'].includes(pc.connectionState))note(config.relayConfigured?`P${slot} 영상 연결 실패 · 중계 연결 상태를 확인해야 합니다.`:`P${slot} 영상 연결 실패 · 현재 TURN 중계가 설정되지 않아 다른 네트워크의 PC와 연결되지 않을 수 있습니다.`);};pc.ondatachannel=e=>{if(session.slot!==1&&slot===1&&e.channel.label==='input')bindInput(record,e.channel,slot);else e.channel.close();};pc.ontrack=e=>{$('video').srcObject=e.streams[0];safe($('video').play());$('video').onplaying=()=>{$('gameLoading').hidden=true;gameReady=true;};note('게임 연결됨');};if(offer){bindInput(record,pc.createDataChannel('input',{ordered:false,maxRetransmits:0}),slot);record.surface=slot<=5?document.createElement('canvas'):null;if(record.surface){record.surface.width=canvas.width;record.surface.height=canvas.height;}record.media=new MediaStream([...(record.surface||canvas).captureStream(30).getVideoTracks(),...audioOut.stream.getAudioTracks()]);for(const t of record.media.getTracks())pc.addTrack(t,record.media);await pc.setLocalDescription(await pc.createOffer());const description=await gatherDescription(pc);if(peers.get(slot)!==record)throw Error('PEER_REPLACED');await act({type:'signal',to:slot,signal:{...description,attempt:record.attempt,mode}});lastPeerPaint=0;module?._nw_redraw?.();}return record;}
function bindInput(record,channel,slot){
 record.channel=channel;
 if(session.slot===1){if(slot>5){channel.onmessage=()=>{};return;}const receive=inputReceiver({slot,enabled:()=>playing&&!completed&&!roster[slot-1]?.away&&engine?.players[slot-1]?.state!=='spectator',accept:(seat,value,t)=>{held[seat-1]=value;heldAt[seat-1]=t;}});channel.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch{return;}if(m.type==='wallet-display'){if(record.wallet.update(m))syncNativeCredits();return;}receive(e.data);};}
 if(session.slot!==1)channel.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==='live-state'&&Array.isArray(m.players)){for(const p of m.players){const q=roster.find(q=>q.slot===p.slot);if(q){q.state=p.state;q.lives=p.lives;}}render();}}catch{}};
 channel.onopen=()=>{lastSent=-1;if(session?.slot!==1)channel.send(JSON.stringify({type:'wallet-display',balance:coins.balance,revision:coins.revision}));note('게임 입력 연결됨');};
 channel.onclose=()=>{if(!session||!hasGame||slot>5||roster[slot-1]?.departed)return;if(session.slot===1){held[slot-1]=0;safe(act({type:'native-pause'}));}roomPhase='paused';stop('게임 연결을 복구하는 중입니다.');};
}
function discardPeer(slot){const r=peers.get(slot);if(!r)return;r.candidates?.cancel();r.pc.onconnectionstatechange=null;r.pc.onicecandidate=null;if(r.channel)r.channel.onclose=null;r.media?.getVideoTracks().forEach(t=>t.stop());r.pc.close();peers.delete(slot);}
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

async function initAudio(){ac??=new AudioContext();if(!audioOut){audioOut=ac.createMediaStreamDestination();}await ac.resume();}
function audio(ptr,n){if(!playing||!ac||ac.state!=='running'||!n)return;const src=module.HEAP16.subarray(ptr/2,ptr/2+n*2),b=ac.createBuffer(2,n,module._nw_rate());for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=src[i*2+c]/32768;}if(audioNext<ac.currentTime||audioNext>ac.currentTime+.25)audioNext=ac.currentTime+.04;const node=ac.createBufferSource();node.buffer=b;if(!away)node.connect(ac.destination);node.connect(audioOut);node.start(audioNext);audioNext+=n/module._nw_rate();}
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

let renderingCreditView=false,lastPeerPaint=0;
function syncNativeCredits(){if(!engine||!module?._nw_credits)return;module._nw_credits(coins.balance);if(!renderingCreditView&&engine.frame>1100){lastPeerPaint=0;module._nw_redraw();}}
function renderNativeVideo(...args){paint(...args);if(renderingCreditView){present(renderingCreditView);return;}present();const now=performance.now();if(now-lastPeerPaint<32)return;lastPeerPaint=now;
 try{for(const [slot,r] of peers){if(!r.surface)continue;const p=roster.find(p=>p.slot===slot);if(p)r.wallet.update({balance:p.credits,revision:p.creditsRevision});module._nw_credits(Math.max(0,r.wallet.balance));renderingCreditView=r.surface;module._nw_redraw();}}
 finally{renderingCreditView=false;module._nw_credits(coins.balance);}
}

function tick(t){requestAnimationFrame(tick);if(!playing||!engine||session?.slot!==1)return;if(engine.phase==='attract'&&!engine.pendingStart){lastTick=0;clock=0;return;}if(roster.length&&roster.every(p=>p.away)){lastTick=0;clock=0;return;}if(!lastTick)lastTick=t;clock+=Math.min(100,t-lastTick);lastTick=t;const dt=1000/module._nw_fps();let n=0;try{while(clock>=dt&&n++<5){for(let i=1;i<5;i++)if(t-heldAt[i]>500)held[i]=0;held[0]=away?0:bits;for(let i=0;i<roster.length;i++)if(roster[i].away)held[i]=0;engine.step(held);clock-=dt;}if(clock>dt*5)clock=dt*5;}catch(e){stop('실행 오류: '+e.message);}}
requestAnimationFrame(tick);
$('create').onclick=()=>{entryRole='player';safe(join(true));};$('joinForm').onsubmit=e=>{e.preventDefault();safe(join(false));};$('ready').onclick=()=>safe(act({type:'ready',ready:!roster.find(p=>p.slot===session.slot)?.ready,character:+$('character').value}));$('character').onchange=()=>safe(act({type:'ready',ready:false,character:+$('character').value}));$('select').onclick=()=>safe(act({type:'native-command',command:'select',character:+$('character').value}));
$('load').onclick=async()=>{const owner=session,epoch=roomEpoch,generation=coreGeneration;try{if(!crypto.subtle)throw Error('게임 실행은 HTTPS 주소에서 가능합니다. 배포된 사이트를 열어주세요.');const f=$('rom').files[0],downloaded=pendingDownload;pendingDownload=null;const source=downloaded||(f?await f.arrayBuffer():await readSavedROM());if(!source)throw Error('게임을 선택하고 설치해주세요.');$('load').disabled=true;void initAudio();profile=await(await fetch('./native/profile.json')).json();const loadedModule=await createMS3({print:()=>{},printErr:()=>{}});await prepareCoopROM(loadedModule,source,profile,v=>note('준비 '+Math.round(v*100)+'%'));if(session!==owner||epoch!==roomEpoch||generation!==coreGeneration||session?.slot!==1){loadedModule._nw_close?.();return false;}module=loadedModule;if(!module._nw_load())throw Error('CORE_LOAD_FAILED');engine=new FiveSession(module,profile,{characters:[0,1,2,3,0],playerCount:5,sharedSelection:true,paid:true});note('게임 시작 화면 준비 중…');for(let block=0;block<50;block++){for(let i=0;i<40;i++)engine.step([0,0,0,0,0]);if(engine.frame>=1400&&engine.byte(0x10fdb0)>0)break;await new Promise(r=>setTimeout(r,0));if(generation!==coreGeneration||session!==owner)return false;}canvas.width=304*DISPLAY_SCALE;canvas.height=224*DISPLAY_SCALE;stream=canvas.captureStream(30);for(const t of audioOut.stream.getAudioTracks())stream.addTrack(t);await act({type:'native-loaded',loaded:true});coreReady=true;$('start').disabled=false;let stored=!f&&!downloaded;if(f||downloaded){try{await saveROM(source);stored=true;$('romInfo').textContent='이 PC에 저장 완료 · 다음부터 자동으로 준비됩니다.';}catch{$('romInfo').textContent='브라우저 저장 공간이 부족합니다. 다음 접속 시 다시 선택해주세요.';}}$('installGame').textContent=stored?'설치 완료':'실행 준비 완료 · 저장 안 됨';note('게임 준비 완료 · 대원들이 준비하면 출동하세요.');return true;}catch(e){note(e.message);$('load').disabled=false;return false;}};
async function offerInstallation(){if(session?.slot!==1){note('참가자는 별도 데이터 설치 없이 방장의 게임에 연결됩니다.');return;}const saved=await readSavedROM().catch(()=>null);if(saved){note('이 PC에 이미 설치된 게임입니다.');if(!$('load').disabled)$('load').click();return;}$('installDialog').showModal();}
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
 void initAudio().catch(()=>note('소리는 소리 켜기 버튼으로 활성화할 수 있습니다.'));
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
$('sound').onclick=()=>safe(session?.slot===1?initAudio():($('video').muted=false,$('video').play()));
function resetGameInput(){chatOpen=false;pendingChat=false;composing=false;enterHeld=false;bits=0;held.fill(0);lastSent=-1;lastTick=0;clock=0;$('chatForm').hidden=true;document.activeElement?.blur();$('gameSurface').focus({preventScroll:true});}
$('full').disabled=false;
$('full').onclick=()=>safe((async()=>{if(document.fullscreenElement)await document.exitFullscreen();else if(document.body.classList.contains('expanded-view')){document.body.classList.remove('expanded-view');$('full').textContent='전체화면';}else{try{await document.documentElement.requestFullscreen();}catch{document.body.classList.add('expanded-view');$('full').textContent='전체화면 해제';note('브라우저의 전체화면 허용을 받지 못해 창 안에서 화면을 확대했습니다.');}}})());
document.addEventListener('fullscreenchange',()=>{$('full').textContent=document.fullscreenElement?'전체화면 해제':'전체화면';if(document.body.classList.contains('in-game')&&!chatOpen)resetGameInput();});
function closeChat(){chatOpen=false;pendingChat=false;composing=false;$('chatForm').hidden=playing&&!away;$('chat').blur();bits=0;}
const chatPresentation=createChatPresentation({
 show:e=>{const li=document.createElement('li');li.dataset.messageId=e.messageId;li.dataset.slot=String(e.slot);li.textContent=`${e.audience?'[관전]':e.spectator?'[관전] P'+e.slot:'P'+e.slot} ${e.name}: ${e.text}`;const log=e.audience?$('viewerMessages'):$('messages'),follow=log.scrollHeight-log.scrollTop-log.clientHeight<40;log.append(li);while(log.children.length>100)log.firstChild.remove();if(follow)log.scrollTop=log.scrollHeight;if(!e.audience)bubbles.set(e.slot,{messageId:e.messageId,text:e.text,until:performance.now()+5000});},
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
window.addEventListener('keydown',e=>{if(!session||document.querySelector('dialog[open]'))return;if(viewer){if(e.key==='Enter'&&document.activeElement!==$('viewerInput')){e.preventDefault();$('viewerInput').focus();}return;}if(e.key==='Enter'){if(enterHeld||e.repeat)return;enterHeld=true;if(!chatOpen){e.preventDefault();chatOpen=true;bits=0;$('chatForm').hidden=false;$('chat').focus();}else if(composing||e.isComposing)pendingChat=true;else{e.preventDefault();sendChat();}return;}if(chatOpen){if(e.key==='Escape')closeChat();return;}if(completed||away||purchaseBusy||!playing||document.querySelector('dialog[open]')||/INPUT|SELECT/.test(e.target.tagName))return;if(keymap[e.code]){e.preventDefault();if(e.code==='KeyJ'&&!e.repeat){const p=session.slot===1&&engine?engine.players[0]:roster.find(p=>p.slot===session.slot);if(!roster.find(p=>p.slot===session.slot)?.started){safe(command('start'));return;}if(['continue','spectator'].includes(p?.state)){safe(command('continue'));return;}}bits|=keymap[e.code];}});
window.addEventListener('keyup',e=>{if(e.key==='Enter')enterHeld=false;bits&=~(keymap[e.code]||0);});window.addEventListener('blur',()=>{bits=0;enterHeld=false;});document.addEventListener('visibilitychange',()=>{bits=0;held.fill(0);enterHeld=false;lastTick=0;clock=0;audioNext=0;if(!document.hidden){ac?.resume().catch(()=>{});if(session?.slot!==1)$('video').play().catch(()=>{});module?._nw_redraw?.();safe(recoverWindow());}});
setInterval(()=>{if(viewer||!session||!playing||completed||away||roster[session.slot-1]?.state==='spectator')return;const t=performance.now();if(bits!==lastSent||t-lastSentAt>150){lastSent=bits;lastSentAt=t;if(config.inputTransport==='webrtc'){if(session.slot!==1){const ch=peers.get(1)?.channel;if(ch?.readyState==='open'&&ch.bufferedAmount<4096)ch.send(JSON.stringify({type:'input',bits,sequence:seq++}));}}else safe(act({type:'native-input',bits,sequence:seq++}));}},35);
setInterval(()=>{if(session&&transportAlive)safe(act({type:'ping'}));},5000);
let publishedState='',stateInFlight=false;
async function publishState(){if(!playing||!engine||session?.slot!==1||stateInFlight)return;const scoring=['playing','complete'].includes(engine.phase);if(scoring&&(performance.now()-lastScoreRead>=1000||engine.phase==='complete'||scoreSample.length!==engine.playerCount)){scoreSample=readScores(engine);lastScoreRead=performance.now();}const state={type:'native-state',completed:engine.phase==='complete',...(scoring?{mission:engine.byte(0x10040c)}:{}),players:engine.players.slice(0,engine.playerCount).map(({state,lives},i)=>({state,lives,...(scoring?{score:scoreSample[i]||0}:{})}))},key=JSON.stringify(state);if(key===publishedState)return;for(const {channel}of peers.values())if(channel?.readyState==='open')channel.send(JSON.stringify({type:'live-state',players:state.players.map((p,i)=>({...p,slot:i+1}))}));stateInFlight=true;try{await act(state);publishedState=key;}catch(e){note(e.message);}finally{stateInFlight=false;}}
setInterval(publishState,80);
// Read-only diagnostics for reproducible browser checks; no state mutation endpoint.
window.newtOnlineDiagnostics=()=>({wallet:{balance:coins.balance,revision:coins.revision},hasGame,away,completed,bits,chatOpen,inputFocus:document.activeElement?.id,slot:session?.slot,coreReady,launchBusy,roomPhase,transportAlive,playing,state:engine?.state(),credits:engine?.byte(0x10fdb0),peers:[...peers].map(([slot,{pc}])=>({slot,state:pc.connectionState,ice:pc.iceConnectionState,signaling:pc.signalingState})),inputChannel:peers.get(1)?.channel?.readyState,videoFrames:$('video').getVideoPlaybackQuality?.().totalVideoFrames||0,audioState:ac?.state,roster:roster.map(p=>({...p}))});

async function listenPoll(own=session,epoch=roomEpoch){let cursor=pollCursor;while(session===own&&epoch===roomEpoch){const r=await apiFetch(`/api/rooms/${own.room}/poll?after=${cursor}`,{headers:{Authorization:'Bearer '+own.token}}),d=await r.json();if(session!==own||epoch!==roomEpoch)return;if(!r.ok){if(d.error==='KICKED_FROM_ROOM'){exitToChannel();showRoomNotice('방장에 의해 강퇴되었습니다. 이 방에는 다시 입장할 수 없습니다.');}else stop(d.error);return;}if(d.slot)session.slot=d.slot;roomPhase=d.phase||roomPhase;if(d.completed||roomPhase==='game-over')completed=true;if(d.snapshot)await event({type:'snapshot',...d.snapshot});for(const e of d.events){if(session!==own||epoch!==roomEpoch)return;await event(e);pollCursor=e.id;}roomPhase=d.phase||roomPhase;if(session!==own)return;if(d.players)roster=d.players;if(d.viewers)viewers=d.viewers;if(d.phase==='native'&&!hasGame)await event({type:'native-start',players:roster});if(d.wallet)updateCoins(d.wallet);if(d.phase==='native'&&!completed&&!away&&!playing&&hasGame&&(session.slot===1||peers.get(1)?.channel?.readyState==='open')){playing=true;lastTick=0;clock=0;}render();cursor=d.cursor;pollCursor=cursor;await new Promise(resolve=>setTimeout(resolve,120));}}
let creditReceiptFlush=null;
await refreshWallet().catch(()=>{});
function flushCreditReceipts(){if(creditReceiptFlush)return creditReceiptFlush;creditReceiptFlush=(async()=>{for(const [id,receipt]of creditReceipts){await act(receipt);creditReceipts.delete(id);}})().finally(()=>creditReceiptFlush=null);return creditReceiptFlush;}
setInterval(()=>{if(session&&creditReceipts.size)flushCreditReceipts().catch(()=>{});},1000);

$('viewerChatForm').onsubmit=e=>{e.preventDefault();const text=$('viewerInput').value.trim();if(!text)return;$('viewerInput').value='';safe(act({type:'chat',text,messageId:crypto.randomUUID()}));};

const gameControls=document.createElement('div');gameControls.id='gameControls';for(const [label,id]of [['전체화면 / 해제','full'],['소리 켜기','sound'],['작전실','leaveRoom']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>$(id).click();if(id==='leaveRoom')b.id='gameLeave';gameControls.append(b);}$('playerChat').prepend(gameControls);

window.addEventListener('nw-site-blocked',()=>{playing=false;transportAlive=false;roomEpoch++;disposeGame();session=null;lobbyAudio.setWaiting(false);});

let recoveringWindow=false;
async function recoverWindow(){
 if(recoveringWindow||document.hidden||!session||completed)return;
 recoveringWindow=true;
 try{await act({type:'ping'});if(!transportAlive){transportAlive=true;const own=session,epoch=++roomEpoch;listenPoll(own,epoch).catch(e=>{if(session===own)stop('연결 복구 중: '+e.message);}).finally(()=>{if(session===own&&epoch===roomEpoch)transportAlive=false;});}if(session?.slot===1&&roomPhase==='paused'){for(const p of [...roster,...viewers]){if(p.slot===1||p.departed||!p.connected)continue;const r=peers.get(p.slot);if(!r||['failed','closed'].includes(r.pc.connectionState)||r.channel?.readyState==='closed'){discardPeer(p.slot);await makePeer(p.slot,true);}}}if(session?.slot===1&&roomPhase==='paused'&&roster.filter(p=>!p.departed).every(p=>p.connected)&&roster.filter(p=>p.slot!==1&&!p.departed).every(p=>peers.get(p.slot)?.channel?.readyState==='open'))await act({type:'native-resume'});}
 catch(e){if(!['PLAYERS_NOT_CONNECTED','NOT_PAUSED','SITE_SESSION_EXPIRED'].includes(e.message))note('게임 복귀 확인 중: '+e.message);}
 finally{recoveringWindow=false;}
}
setInterval(()=>{if(roomPhase==='paused'||!transportAlive)recoverWindow();},2000);

async function refreshCareerRecords(){if(!session)return;const own=session,d=await post(`/api/rooms/${session.room}/records`,{});if(session!==own)return;careerRecords.clear();for(const p of d.records)careerRecords.set(p.slot,p);render();}
setInterval(()=>{if(session&&!document.hidden&&!document.body.classList.contains('in-game'))refreshCareerRecords().catch(()=>{});},10000);

function appendStaff(parent,role){if(!['방장','부방장','운영진'].includes(role))return;const badge=document.createElement('small');badge.className='staff-role';badge.textContent=role==='운영진'?'운영진':`운영진 (${role})`;parent.append(badge);}
function memberActions(p,transfer){const wrap=document.createElement('div');wrap.className='member-actions';for(const kind of transfer?['transfer-host','kick-member']:['kick-member']){const b=document.createElement('button');b.textContent=kind==='transfer-host'?'방장 넘기기':'강퇴';b.onclick=()=>safe((async()=>{if(!await NWUI.confirm({title:b.textContent,message:kind==='transfer-host'?`${p.name} 님에게 방장 권한을 넘기시겠습니까? 준비 상태는 해제됩니다.`:`${p.name} 님을 강퇴하시겠습니까? 이 방에는 다시 입장할 수 없습니다.`,accept:b.textContent}))return;try{await act({type:kind,targetSlot:p.slot,targetSeatId:p.seatId});}catch(e){const messages={HOST_ONLY:'방장만 사용할 수 있습니다.',LOBBY_ONLY:'게임 시작 전 작전실에서만 사용할 수 있습니다.',PURCHASE_IN_PROGRESS:'코인 구매 처리 중인 인원이 있습니다. 완료 후 다시 시도해주세요.',TARGET_CHANGED:'참가자 구성이 변경되었습니다. 다시 선택해주세요.'};showRoomNotice(messages[e.message]||e.message);}})());wrap.append(b);}return wrap;}

async function verifyGameConnections(){
 const own=session,targets=roster.filter(p=>p.slot!==1&&!p.departed);if(!targets.length)return;
 note('중계 접속 설정을 확인하는 중…');const response=await apiFetch('/native-config?room='+own.room,{headers:{Authorization:'Bearer '+own.token}}),fresh=await response.json();if(!response.ok)throw Error(fresh.error||'TURN_SERVICE_UNAVAILABLE');if(session!==own)throw Error('ROOM_CHANGED');config=fresh;
 if(!config.relayConfigured)throw Error('TURN_NOT_CONFIGURED');
 await Promise.all(targets.map(async p=>{
  for(const mode of ['auto','tls']){
   if(session!==own)throw Error('ROOM_CHANGED');
   note(`${p.name} 님과 ${mode==='tls'?'보안 중계로 다시':'직접·중계 경로를'} 연결하는 중…`);
   discardPeer(p.slot);const peer=await makePeer(p.slot,true,null,mode);
   try{await waitForConnection(peer,{valid:()=>session===own&&roster.some(q=>q.seatId===p.seatId&&q.connected)});return;}
   catch(e){const stage=connectionStage(peer);safe(act({type:'connection-report',to:p.slot,mode,stage:peer.pc.signalingState,ice:peer.pc.iceConnectionState,connection:peer.pc.connectionState,input:peer.channel?.readyState||'none',remoteDescription:!!peer.pc.remoteDescription,iceErrors:peer.iceErrors}));discardPeer(p.slot);if(e.message==='ROOM_CHANGED'||mode==='tls')throw Error(`${p.name}: ${stage} (${e.message})`);}
  }
 }));
 note('모든 참가자의 중계·입력 연결 확인 완료');
}
