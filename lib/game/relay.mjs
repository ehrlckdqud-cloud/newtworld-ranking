import {roomProofKey,signCommand} from './command-proof.mjs';
import {turnConfig} from './turn-config.mjs';
import {ensureRecords,recordCommit,rankings,roomRecords} from './records.mjs';
import {ensureWalletSchema,migrateLegacy,hydrateWallets,wallet,walletCommit,grant} from './wallet.mjs';
const initialized=new WeakMap();
async function initialize(db,now){if(!initialized.has(db))initialized.set(db,(async()=>{await ensureWalletSchema(db);await ensureRecords(db);await migrateLegacy(db,now);})().catch(e=>{initialized.delete(db);throw e;}));return initialized.get(db);}
import {payCoin} from './coin-payment.mjs';
import {Room,BUILD,ProtocolError} from './room.mjs';
import {NativeRoom} from './native-room.mjs';
const fail=c=>{throw new ProtocolError(c)},json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const digest=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(v=>v.toString(16).padStart(2,'0')).join('');
const allowed=new Set(['launch-begin','launch-failed','native-heartbeat','ping','ready','chat','native-loaded','native-reset','native-abandon','start-native','native-pause','native-resume','transfer-host','kick-member','connection-report','signal','native-state','native-command','native-credit-result','native-return','native-rejoin','leave']);
// Only games with an installed server engine belong in this catalog.
const supportedChannels = new Map([['mslug3', new Set([1, 3])]]);
function acceptsGame(channel, game) {
 return supportedChannels.get(game)?.has(channel) === true;
}
function assertChannelGame(channel, game) {
 if (![1, 2, 3].includes(channel)) fail('INVALID_CHANNEL');
 if (!acceptsGame(channel, game)) fail('GAME_NOT_AVAILABLE_IN_CHANNEL');
}
function playerLimit(channel) { return channel === 3 ? 1 : 5; }
function encode(r,n){return JSON.stringify({room:{protocol:r.protocol||'nw-input-lockstep-v78',launch:r.launch||null,hostSlot:r.hostSlot||1,hostEpoch:r.hostEpoch||0,nativeCommands:r.nativeCommands||[],kickedMembers:r.kickedMembers||[],kickedTokens:r.kickedTokens||[],walletVersion:1,title:r.title,channel:r.channel,listed:r.listed,game:r.game,build:r.build,id:r.id,invite:r.invite,nextViewer:r.nextViewer,viewers:(r.viewers||[]).map(p=>({...p,coinIds:[...p.coinIds],chatIds:[...p.chatIds]})),players:r.players.map(p=>({...p,coinIds:[...p.coinIds],chatIds:[...p.chatIds]})),phase:r.phase,frame:r.frame,seq:r.seq,lastActivity:r.lastActivity,nativeCommandId:r.nativeCommandId},native:{recordRun:n.recordRun,recordMission:n.recordMission,recordValid:n.recordValid,loaded:n.loaded,completed:n.completed,lastSeq:[...n.lastSeq],rates:[...n.rates]}});}
function decode(raw,now){const d=JSON.parse(raw);if(d.room.build!==BUILD)fail('CLIENT_UPDATE_REQUIRED');const r=Object.assign(Object.create(Room.prototype),d.room,{now:()=>now,events:[],listeners:new Set(),pending:new Map(),hashes:new Map()});r.players=r.players.map(p=>({...p,coinIds:new Set(p.coinIds),chatIds:new Map(p.chatIds)}));r.viewers=(r.viewers||[]).map(p=>({...p,coinIds:new Set(p.coinIds),chatIds:new Map(p.chatIds)}));r.nextViewer=r.nextViewer||6;r.owner=r.players[0];const n=Object.assign(new NativeRoom(r),d.native);n.lastSeq=new Map(d.native.lastSeq);n.rates=new Map(d.native.rates);return {r,n};}
async function commit(db,row,r,n,now){const nonce=crypto.randomUUID(),rev=row.revision+1,w=walletCommit(db,r,nonce,rev,now);const statements=[db.prepare('UPDATE game_rooms SET revision=?,nonce=?,state=?,updated=? WHERE id=? AND revision=?'+w.conditions).bind(rev,nonce,encode(r,n),now,r.id,row.revision,...w.values),...w.writes,...recordCommit(db,r,n,rev,nonce,now)];for(const e of r.events)statements.push(db.prepare('INSERT INTO game_events (key,room,seq,target,payload,created) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM game_rooms WHERE id=? AND revision=? AND nonce=?)').bind(r.id+':'+e.id,r.id,e.id,e.type==='signal'?e.to:null,JSON.stringify(e),now,r.id,rev,nonce));const result=await db.batch(statements);return result[0].meta.changes===1;}
async function mutate(db,id,token,operation,now,heartbeat=null){for(let retry=0;retry<12;retry++){const row=await db.prepare('SELECT * FROM game_rooms WHERE id=? AND expires>?').bind(id,now).first();if(!row)fail('ROOM_NOT_FOUND');const {r,n}=decode(row.state,now);await hydrateWallets(db,r);const p=token?r.auth(token):null;if(p&&heartbeat?.epoch===(r.hostEpoch||0)&&Number.isSafeInteger(heartbeat.frame)&&heartbeat.frame>=0)p.lastClockAt=now;r.tick(!n.completed);const result=await operation(r,n,p);n.resetIfEmpty();if(await commit(db,row,r,n,now))return p?.memberId?{...result,wallet:await wallet(db,p.memberId)}:result;await new Promise(resolve=>setTimeout(resolve,20+Math.floor(Math.random()*80)));}fail('ROOM_BUSY_RETRY');}
export async function relay(request,env,{now=Date.now(),billingMember=null,pay=payCoin,siteMemberId=null}={}){try{
 const db=env.DB;if(!db)return json({error:'DATABASE_NOT_READY'},503);await initialize(db,now);
 const u=new URL(request.url),origin=request.headers.get('origin');if(origin&&origin!==u.origin)fail('ORIGIN_REJECTED');
 const rawToken=(request.headers.get('authorization')||'').replace(/^Bearer /,'');const token=rawToken?await digest(rawToken):'';
 const match=/^\/api\/rooms\/([a-f0-9]{16})\/(join|poll|action|coin|records)$/.exec(u.pathname);
 if(request.method==='GET'&&u.pathname==='/native-config'){
  const room=u.searchParams.get('room');if(!/^[a-f0-9]{16}$/.test(room||''))fail('ROOM_NOT_FOUND');
  const row=await db.prepare('SELECT state FROM game_rooms WHERE id=? AND expires>?').bind(room,now).first();if(!row)fail('ROOM_NOT_FOUND');const {r}=decode(row.state,now),p=r.auth(token);if(siteMemberId&&p.memberId!==siteMemberId)fail('MEMBER_MISMATCH');
  let ice;try{ice=await turnConfig(env,{room:r.id,slot:p.slot,now});}catch(e){return json({error:e.message},503);}
  const secret=env.CF_TURN_API_TOKEN||env.NW_GAME_PACKAGE_KEY;const commandProofKey=p.slot===(r.hostSlot||1)&&secret?await roomProofKey(secret,r.id):undefined;return json({hostSlot:r.hostSlot||1,hostEpoch:r.hostEpoch||0,...ice,commandProofKey,inputTransport:'lockstep',protocol:r.protocol||'nw-input-lockstep-v78',eventTransport:'poll',experimental:true,realGems:true});
 }
 if(request.method==='GET'&&u.pathname==='/health')return json({build:BUILD,mode:'local-input-lockstep',realInternetVerified:false,realGems:true});
 if(request.method==='GET'&&match?.[2]==='poll'){
  const row=await db.prepare('SELECT state FROM game_rooms WHERE id=? AND expires>?').bind(match[1],now).first();if(!row)fail('ROOM_NOT_FOUND');const {r,n}=decode(row.state,now);await hydrateWallets(db,r);const p=r.auth(token);if(siteMemberId&&p.memberId!==siteMemberId)fail('MEMBER_MISMATCH');const after=Number(u.searchParams.get('after')||0);if(!Number.isSafeInteger(after)||after<0||after>r.seq)fail('INVALID_CURSOR');
  const rows=await db.prepare('SELECT payload FROM game_events WHERE room=? AND seq>? AND seq<=? AND (target IS NULL OR target=?) ORDER BY seq LIMIT 500').bind(r.id,after,r.seq,p.slot).all();return json({launch:r.launch||null,commands:r.nativeCommands||[],hostSlot:r.hostSlot||1,hostEpoch:r.hostEpoch||0,slot:p.slot,wallet:await wallet(db,p.memberId),phase:r.phase,revision:r.seq,completed:n.completed,players:r.roster(),viewers:r.audience(),cursor:rows.results.length===500?JSON.parse(rows.results.at(-1).payload).id:r.seq,snapshot:after?undefined:{...r.view(),completed:n.completed},events:rows.results.map(x=>JSON.parse(x.payload))});
 }
 if(request.method!=='POST')return json({error:'NOT_FOUND'},404);
 if(!request.headers.get('content-type')?.startsWith('application/json'))fail('JSON_REQUIRED');
 if(Number(request.headers.get('content-length'))>65536)fail('BODY_TOO_LARGE');
 const reader=request.body?.getReader();let raw='',size=0;const decoder=new TextDecoder();if(!reader)fail('INVALID_JSON');for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();fail('BODY_TOO_LARGE');}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();let m;try{m=JSON.parse(raw)}catch{fail('INVALID_JSON')}if(!m||Array.isArray(m)||typeof m!=='object')fail('INVALID_MESSAGE');
 if(u.pathname==='/api/rankings'){if(!m.memberId)fail('MEMBER_REQUIRED');return json(await rankings(db,m.memberId,m.sort));}
 if(u.pathname==='/api/wallet'){if(!m.memberId)fail('MEMBER_REQUIRED');return json({ok:true,...await wallet(db,m.memberId)});}
 if(u.pathname==='/api/lobby'){
  const channel=Number(m.channel||1);if(![1,2,3].includes(channel))fail('INVALID_CHANNEL');
  const rows=await db.prepare('SELECT state FROM game_rooms WHERE expires>? AND updated>? ORDER BY updated DESC LIMIT 100').bind(now,now-30000).all();
  const rooms=[];for(const row of rows.results){try{const {r,n}=decode(row.state,now);if(!acceptsGame(channel,r.game)||!r.listed||r.channel!==channel||r.phase==='closed'||!r.players.find(p=>p.slot===(r.hostSlot||1))?.connected)continue;rooms.push({id:r.id,title:r.title,channel:r.channel,game:r.game,count:r.players.filter(p=>p.connected&&!p.departed).length,canJoin:channel!==3&&r.phase==='native'&&!n.completed&&(r.players.length<5||r.players.some(p=>p.departed&&!p.pendingContinue&&!p.purchasing)),canResume:r.phase==='native'&&r.players.some(p=>p.memberId===m.memberId&&p.departed),max:playerLimit(channel),viewers:r.audience().length,host:r.players.find(p=>p.slot===(r.hostSlot||1))?.name,status:n.completed?'complete':r.phase==='lobby'?'waiting':r.phase==='native'?'playing':'paused'});}catch{}}
  return json({channel,rooms});
 }
 if(u.pathname==='/api/rooms'){
  if(m.build!==BUILD)fail('BUILD_MISMATCH');
  const channel=Number(m.channel??1),game=m.game??'mslug3';
  assertChannelGame(channel,game);
  if(channel===3)fail('USE_LOCAL_ARCADE');
  // Bounded private test service. Cleanup is independent of a room's gameplay state.
  await db.batch([db.prepare('DELETE FROM game_events WHERE created<?').bind(now-86400000),db.prepare('DELETE FROM game_rooms WHERE expires<=?').bind(now)]);
  const count=await db.prepare('SELECT COUNT(*) AS n FROM game_rooms').first();if(count.n>=100)fail('SERVER_FULL');
  const r=new Room(m.name,{now:()=>now}),n=new NativeRoom(r),p=r.owner;r.protocol=['nw-input-lockstep-v82','nw-input-lockstep-v85'].includes(m.protocol)?m.protocol:'nw-input-lockstep-v78';r.channel=channel;r.title=typeof m.title==='string'?m.title.trim().slice(0,40):m.name+'의 작전실';r.listed=m.listed===true;r.game=game;p.memberId=m.memberId;p.seatId=crypto.randomUUID();p.gradeScore=m.gradeScore;p.staffRole=m.staffRole;await hydrateWallets(db,r);const result={room:r.id,invite:r.invite,slot:p.slot,token:p.token};r.invite=await digest(r.invite);p.token=await digest(p.token);p.connected=true;
  // Initial roster is served as a snapshot. No token/invite ever enters the event stream.
  r.events=[];r.seq=0;
  await db.prepare('INSERT INTO game_rooms (id,revision,nonce,state,updated,expires) VALUES (?,?,?,?,?,?)').bind(r.id,0,crypto.randomUUID(),encode(r,n),now,now+86400000).run();return json(result,201);
 }
 if(!match) return json({error:'NOT_FOUND'},404);
 if(match[2]==='join')return json(await mutate(db,match[1],null,async(r,n)=>{
  assertChannelGame(r.channel,r.game);
  if(r.channel===3 && m.role!=='viewer') fail('SOLO_ROOM');
  if(m.role!=='viewer'&&n.completed)fail('GAME_COMPLETED');if(r.phase==='native'&&(m.protocol||'nw-input-lockstep-v78')!==(r.protocol||'nw-input-lockstep-v78'))fail('CLIENT_UPDATE_REQUIRED');if((r.kickedMembers||[]).includes(m.memberId))fail('MEMBER_KICKED');if(!r.listed&&(typeof m.invite!=='string'||await digest(m.invite)!==r.invite))fail('INVITE_REJECTED');if([...r.players,...r.viewers].some(q=>q.memberId===m.memberId&&!q.departed))fail('MEMBER_ALREADY_IN_ROOM');const p=m.role==='viewer'?r.joinViewer(m.name,m.build):r.phase==='native'?r.joinRunning(m.memberId,m.name,m.build):r.join(m.name,m.build),result={room:r.id,slot:p.slot,role:p.role||'player',token:p.token,phase:r.phase};p.memberId=m.memberId;p.seatId=crypto.randomUUID();p.gradeScore=m.gradeScore;p.staffRole=m.staffRole;const w=await wallet(db,p.memberId);p.credits=w.balance;r.walletBefore.set(p.memberId,w);p.token=await digest(p.token);r.connect(p);r.emit('audience',{viewers:r.audience()});return {...result,cursor:r.seq};},now),201);
 if(match[2]==='records'){const row=await db.prepare('SELECT state FROM game_rooms WHERE id=? AND expires>?').bind(match[1],now).first();if(!row)fail('ROOM_NOT_FOUND');const {r}=decode(row.state,now),p=r.auth(token);if(siteMemberId&&p.memberId!==siteMemberId)fail('MEMBER_MISMATCH');return json({records:await roomRecords(db,r.players)});}
 if(match[2]==='coin'){
  const row=await db.prepare('SELECT state FROM game_rooms WHERE id=?').bind(match[1]).first();if(!row)fail('ROOM_NOT_FOUND');
  const {r}=decode(row.state,now),p=r.auth(token);if(siteMemberId&&p.memberId!==siteMemberId)fail('MEMBER_MISMATCH');
  if(!billingMember||p.memberId!==billingMember.memberId)fail('MEMBER_MISMATCH');
  if(!/^[a-zA-Z0-9-]{16,100}$/.test(m.requestId||''))fail('INVALID_REQUEST_ID');
  const quantity=m.quantity??1;if(!Number.isSafeInteger(quantity)||quantity<1||quantity>99)fail('INVALID_QUANTITY');
  const key='purchase:'+p.memberId+':'+m.requestId;
  const prior=await db.prepare('SELECT id,delta FROM game_coin_ledger WHERE id=?').bind(key).first();
  if(prior){if(prior.delta!==quantity)fail('PURCHASE_QUANTITY_MISMATCH');await mutate(db,match[1],token,(room,n,q)=>{if(q.purchasing===m.requestId){q.purchasing=null;q.purchaseQuantity=null;}return {};},now);const w=await wallet(db,p.memberId);return json({ok:true,replayed:true,credits:w.balance,revision:w.revision});}
  await mutate(db,match[1],token,(room,n,q)=>{if(q.role==='viewer')fail('SPECTATOR_INPUT');if(q.ready&&room.phase==='lobby')fail('UNREADY_BEFORE_PURCHASE');if(q.purchasing&&q.purchasing!==m.requestId)fail('PURCHASE_IN_PROGRESS');if(q.purchaseQuantity&&q.purchaseQuantity!==quantity)fail('PURCHASE_QUANTITY_MISMATCH');q.purchasing=m.requestId;q.purchaseQuantity=quantity;return {};},now);
  let receipt;try{receipt=await pay(billingMember,{requestId:m.requestId,room:r.id,slot:p.slot,quantity});}catch(e){if(e.definitive)await mutate(db,match[1],token,(room,n,q)=>{if(q.purchasing===m.requestId){q.purchasing=null;q.purchaseQuantity=null;}return {};},now);return json({error:e.message||'PAYMENT_PENDING_RETRY',retryable:!e.definitive},400);}
  const w=await grant(db,p.memberId,key,quantity,now);
  await mutate(db,match[1],token,(room,n,q)=>{q.purchasing=null;q.purchaseQuantity=null;return {};},now);
  return json({ok:true,credits:w.balance,revision:w.revision,balance:receipt.balance});
 }
 if(match[2]==='action'){const result=await mutate(db,match[1],token,(r,n,p)=>{
  if(!p)fail('UNAUTHORIZED');if(p.departed)fail('PLAYER_DISCONNECTED');if(siteMemberId&&p.memberId!==siteMemberId)fail('MEMBER_MISMATCH');if(['transfer-host','kick-member'].includes(m.type)){
   if(p.slot!==1||p.role==='viewer')fail('HOST_ONLY');if(r.phase!=='lobby')fail('LOBBY_ONLY');if(r.players.some(q=>q.purchasing))fail('PURCHASE_IN_PROGRESS');
   const q=[...r.players,...r.viewers].find(q=>q.slot===m.targetSlot);if(!q||q===p)fail('INVALID_TARGET');if(m.targetSeatId&&m.targetSeatId!==q.seatId)fail('TARGET_CHANGED');
   if(m.type==='transfer-host'){if(q.role==='viewer'||!q.connected)fail('INVALID_TARGET');const index=r.players.indexOf(q);[r.players[0],r.players[index]]=[q,p];r.players.forEach((v,i)=>v.slot=i+1);r.owner=q;n.loaded=false;n.lastSeq.clear();r.emit('host-changed',{players:r.roster(),host:q.name});}
   else{r.kickedMembers=[...(r.kickedMembers||[]),q.memberId];r.kickedTokens=[...(r.kickedTokens||[]),q.token];if(q.role==='viewer')r.viewers=r.viewers.filter(v=>v!==q);else{r.players=r.players.filter(v=>v!==q);r.players.forEach((v,i)=>v.slot=i+1);}r.emit('roster',{players:r.roster()});r.emit('audience',{viewers:r.audience()});}
   return {};
  }if(m.type==='leave'){
   if(p.role==='viewer'){r.viewers=r.viewers.filter(q=>q!==p);r.emit('audience',{viewers:r.audience()});}
   else if(['native','paused'].includes(r.phase)){r.depart(p,'LEFT');}
   else if(p.slot===(r.hostSlot||1)){r.phase='closed';r.emit('closed',{});}
   else if(r.phase==='lobby'){r.players.splice(p.slot-1,1);r.players.forEach((q,i)=>q.slot=i+1);r.emit('roster',{players:r.roster()});}
   else {p.away=true;p.departed=true;p.connected=false;p.state='spectator';p.lives=0;r.emit('native-presence',{slot:p.slot,away:true,departed:true});r.emit('roster',{players:r.roster()});}
   return {};
  }if(!allowed.has(m.type))fail('UNKNOWN_ACTION');
  if(r.launch?.status==='starting'&&now-r.launch.startedAt>90000){r.launch={...r.launch,status:'failed',message:'게임 시작 시간이 초과되었습니다. 다시 시도해주세요.'};r.emit('launch-state',{launch:r.launch});}
  if(r.launch?.status==='starting'&&['ready','transfer-host','kick-member'].includes(m.type))fail('LAUNCH_IN_PROGRESS');
  if(!p.connected&&['lobby','native','paused'].includes(r.phase))r.connect(p);
  if(['launch-begin','start-native'].includes(m.type)){
   assertChannelGame(r.channel,r.game);
   if(r.channel===3 && r.players.length!==1) fail('SOLO_ROOM');
  }
  if(m.type.startsWith('launch-')||m.type==='connection-report'||m.type==='signal'||m.type.startsWith('native-')||m.type==='start-native')return n.action(p,m);
  return r.action(p,m);
 },now,m.type==='native-heartbeat'?m:null);const secret=env.CF_TURN_API_TOKEN||env.NW_GAME_PACKAGE_KEY;if(result?.event?.type==='native-command'&&secret)result.proof=await signCommand(await roomProofKey(secret,match[1]),match[1],result.event);return json(result);}return json({error:'NOT_FOUND'},404);
 }catch(e){console.warn('coop-request-error',JSON.stringify({path:new URL(request.url).pathname,code:e instanceof ProtocolError?e.code:'INTERNAL_ERROR'}));return json({error:e instanceof ProtocolError?e.code:'INTERNAL_ERROR'},e instanceof ProtocolError?400:500);}}
