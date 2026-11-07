import {attachGamePreview,hideGamePreview} from './game-preview.mjs?v=hover-sound';
import {openLocalArcade,arcadePrice} from './local-arcade.mjs?v=msx';
import {roomError} from './room-feedback.mjs?v=99';
import {lobbyAudio} from './lobby-audio.mjs?v=98';
import {testHeaders} from './test-access.mjs?v=98';
const $=id=>document.getElementById(id),API='https://newtworld-ms3-coop-5p.ehrlckdqud.chatgpt.site';
let channel=1,rooms=[],inside=false,requestId=0;
const channels={1:{name:'협동전',games:['mslug3']},2:{name:'대결전',games:[]},3:{name:'혼자하기',games:['mslug','mslug2','mslugx','mslug3','gunbird2','puyopuyo2']}};
const channelLabel=()=>String(channel).padStart(2,'0')+' '+channels[channel].name;
const credentials=()=>({token:localStorage.getItem('nwProfileToken'),device:localStorage.getItem('nwProfileDevice')});
const text=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;};
function render(){hideGamePreview();const list=$('roomList');list.replaceChildren();list.classList.toggle('arcade-catalog',channel===3);
 if(channel===3){
  $('roomCount').textContent=channelLabel();
  const titles={mslug:['메탈슬러그 1',API+'/arcade-runtime/mslug/card.webp'],mslug2:['메탈슬러그 2',API+'/arcade-runtime/mslug2/card.webp'],mslugx:['메탈슬러그 X',API+'/arcade-runtime/mslugx/card.webp'],mslug3:['메탈슬러그 3','./mslug3-logo.png'],gunbird2:['건버드 2',API+'/arcade-runtime/gunbird2/card.webp'],puyopuyo2:['뿌요뿌요 2',API+'/arcade-runtime/puyopuyo2/card.webp']};
  for(const id of channels[channel].games){
   const [name,art]=titles[id],button=document.createElement('button'),logo=document.createElement('img');
   button.className='room-card arcade-game-card';button.type='button';
   logo.src=art;logo.alt='';logo.className='arcade-card-logo';
   const detail=text('span','한 PC에서 1~2인 · ');detail.append(arcadePrice());
   button.append(logo,text('b',name),detail);
   attachGamePreview(button,id,name);
   button.onclick=()=>{hideGamePreview();openLocalArcade(id);};list.append(button);
  }
  return;
 }
 const shown=rooms.filter(r=>!$('waitingOnly').checked||r.status==='waiting');$('roomCount').textContent=`${channelLabel()} · ${rooms.length}개 방`;if(!channels[channel].games.length){list.append(text('p','아직 등록된 대결 게임이 없습니다.','empty'));return;}if(!shown.length){list.append(text('p','대기 중인 작전실이 없습니다. 첫 번째 방을 만들어보세요.','empty'));return;}
 for(const room of shown){const b=document.createElement('button');b.className='room-card';const top=text('div','METAL SLUG 3','room-top'),state={waiting:'대기 중',playing:'플레이 중',paused:'일시 중단',complete:'미션 완료'}[room.status];top.append(text('span',state,'badge '+(room.status==='waiting'?'':'playing')));b.append(top,text('b',room.title||room.host+'의 작전실'));const foot=document.createElement('footer');foot.append(text('span','방장 '+room.host),text('span',`${room.count} / ${room.max}`));b.append(foot);b.disabled=room.status==='paused';b.onclick=()=>window.nwChooseRole(room);list.append(b);}}
export async function refreshRooms(){
 if(inside||channel===3)return;
 const id=++requestId,selected=channel;
 if(!channels[selected].games.length){rooms=[];render();return;}
 try{
  const response=await fetch(API+'/api/lobby',{method:'POST',headers:{'content-type':'application/json',...testHeaders()},body:JSON.stringify({channel:selected,member:credentials()})});
  const data=await response.json();
  if(id!==requestId||inside)return;
  if(!response.ok)throw Error(data.error);
  rooms=data.rooms.filter(room=>channels[selected].games.includes(room.game));
  render();
 }catch{if(id===requestId&&!inside)$('roomList').replaceChildren(text('p','방 목록을 불러오지 못했습니다. 새로고침을 눌러주세요.','empty'));}
}
export function initLobby(name){$('memberName').textContent=name;$('openCreate').disabled=false;$('openCreate').onclick=()=>{$('roomTitle').value=name+'의 작전실';$('createFeedback').textContent='';$('joinForm').hidden=false;$('createDialog').showModal();};$('cancelCreate').onclick=()=>$('createDialog').close();$('createDialog').oncancel=e=>{if($('create').disabled)e.preventDefault();};$('refreshRooms').onclick=refreshRooms;$('waitingOnly').onchange=render;
 for(const b of document.querySelectorAll('[data-channel]'))b.onclick=()=>{channel=Number(b.dataset.channel);++requestId;rooms=[];$('openCreate').hidden=channel===3;$('waitingOnly').closest('label').hidden=channel===3;$('openCreate').disabled=!channels[channel].games.length;render();for(const x of document.querySelectorAll('[data-channel]'))x.classList.toggle('active',x===b);refreshRooms();};
 window.nwChooseRole=room=>{const dialog=$('roleDialog'),player=$('rolePlayer'),watcher=$('roleViewer'),cancel=$('roleCancel'),feedback=$('roleFeedback');let entering=false;const available=channel!==3&&(room.canResume||room.canJoin||(room.status==='waiting'&&room.count<room.max));player.disabled=!available;watcher.disabled=false;cancel.disabled=false;feedback.textContent='';const enter=async role=>{if(entering)return;entering=true;player.disabled=watcher.disabled=cancel.disabled=true;feedback.textContent='입장 확인 중…';try{await window.nwJoinPublic(room.id,room.title,role);dialog.close();}catch(error){feedback.textContent=roomError(error);}finally{entering=false;player.disabled=!available;watcher.disabled=cancel.disabled=false;}};player.onclick=()=>enter('player');watcher.onclick=()=>enter('viewer');cancel.onclick=()=>dialog.close();dialog.oncancel=e=>{if(entering)e.preventDefault();};dialog.showModal();};
 window.nwLobbyConfig=()=>({channel,game:'mslug3',title:$('roomTitle').value.trim()||name+'의 작전실',listed:true});window.nwEnterRoom=(title)=>{inside=true;$('playerColumn').append($('playerChat'));$('observerRail').append($('viewerChat'));$('viewerChat').hidden=false;$('createDialog').close();$('channelView').hidden=true;$('roomView').hidden=false;$('roomName').textContent=title||'작전 대기실';$('roomChannel').textContent=channelLabel();};
 window.nwBackToChannel=()=>{inside=false;window.nwOperations();$('roomView').hidden=true;$('channelView').hidden=false;refreshRooms();};
 window.nwOperations=()=>{document.body.classList.remove('in-game');$('gameView').hidden=true;$('playerColumn').append($('playerChat'));$('observerRail').append($('viewerChat'));$('viewerChat').hidden=false;$('chatForm').hidden=false;lobbyAudio.setWaiting(true);};
 window.nwGameStarted=()=>{lobbyAudio.setWaiting(false);document.body.classList.add('in-game');$('gameView').hidden=false;$('gameChatStack').append($('playerChat'),$('viewerChat'));$('viewerChat').hidden=false;};refreshRooms();setInterval(refreshRooms,5000);
}
