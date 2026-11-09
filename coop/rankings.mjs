import {testHeaders} from './test-access.mjs?v=98';
const API='https://newtworld-ms3-coop-5p.ehrlckdqud.chatgpt.site';
export const starLabel=n=>n>5?`★ × ${n}`:n>0?'★'.repeat(n):'☆';
async function fetchRanks(channel,game,sort){
 const r=await fetch(API+'/api/rankings',{method:'POST',headers:{'content-type':'application/json',...testHeaders()},body:JSON.stringify({sort,channel,game,member:{token:localStorage.getItem('nwProfileToken'),device:localStorage.getItem('nwProfileDevice')}})});const d=await r.json();if(!r.ok)throw Error(d.error);return d;
}
export function initRankings(){
 initRankRail();
 const dialog=document.getElementById('rankingsDialog'),body=document.getElementById('rankRows'),status=document.getElementById('rankStatus');const game=document.getElementById('rankGame'), tabs=dialog.querySelector('.rank-tabs'), table=dialog.querySelector('.rank-scroll'), note=dialog.querySelector('.muted');
 let request=0, channel=1, selectedSort='stars';
 async function load(sort='stars'){const id=++request;selectedSort=sort;status.textContent='기록을 불러오는 중…';body.replaceChildren();for(const b of dialog.querySelectorAll('[data-sort]'))b.setAttribute('aria-pressed',String(b.dataset.sort===sort));
  if(channel===2){status.textContent='등록된 대결전 게임이 없습니다.';return;}
  try{const d=await fetchRanks(channel,game.value,sort);if(id!==request)return;
  status.textContent=`내 기록 · 완주 별 ${d.mine.stars}개 · 개인 최고점 ${d.mine.best_score.toLocaleString()}점`;
  for(const p of d.rows){const tr=document.createElement('tr');if(p.self)tr.className='my-rank';for(const value of [p.rank,p.name,starLabel(p.stars),p.best_score.toLocaleString()]){const td=document.createElement('td');td.textContent=value;tr.append(td);}tr.children[2].className='completion-stars';tr.children[2].title=`누적 완주 ${p.stars}회`;body.append(tr);}if(!d.rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.textContent='첫 번째 기록의 주인공이 되어보세요.';tr.append(td);body.append(tr);}
  }catch(e){if(id===request)status.textContent='기록을 불러오지 못했습니다. 잠시 후 다시 열어주세요.';}
 }
 document.querySelectorAll('[data-open-rankings]').forEach(b=>b.onclick=()=>{channel=b.closest('#roomView')?1:Number(document.querySelector('[data-channel].active')?.dataset.channel||1);
 document.getElementById('rankChannel').textContent=['','협동전 · 메탈슬러그 3','대결전','혼자하기'][channel];
 document.getElementById('rankGameLabel').hidden=channel!==3;tabs.hidden=channel===2;table.hidden=channel===2;note.hidden=channel!==1;
 if(channel===3){const prev=game.value;game.replaceChildren(...Array.from(document.querySelectorAll('#roomList .arcade-game-card b'),title=>new Option(title.textContent,title.parentElement.dataset.game)));if([...game.options].some(o=>o.value===prev))game.value=prev;}
 dialog.showModal();load();});game.onchange=()=>load(selectedSort);dialog.querySelector('[data-close-rankings]').onclick=()=>dialog.close();dialog.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>load(b.dataset.sort));
}
export function showCompletionStar(run){const key='nwCompletionStar:'+run;if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1');const box=document.getElementById('completionAward');box.hidden=false;box.classList.remove('celebrate');void box.offsetWidth;box.classList.add('celebrate');setTimeout(()=>{box.hidden=true;},5000);}

function initRankRail(){
 const lobby=document.getElementById('channelView'),room=document.getElementById('roomView');
 const rail=document.createElement('aside');
 rail.id='rankRail';rail.hidden=true;rail.setAttribute('aria-label','채널 게임 순위');
 rail.innerHTML='<h2></h2><label>게임 <select aria-label="혼자하기 순위 게임"></select></label><p class="rail-status" role="status"></p><div class="rail-lists"></div>';
 const pick=rail.querySelector('select'),content=rail.querySelector('.rail-lists'),status=rail.querySelector('.rail-status');
 const snapshots=new Map();
 let active='',generation=0;
 function sync(){
  const channel=!room.hidden?1:Number(document.querySelector('[data-channel].active')?.dataset.channel);
  const target=!room.hidden?room:lobby;
  const visible=!target.hidden&&!document.body.classList.contains('in-game')&&!document.hidden&&
   !document.querySelector('.arcade-local[open]')&&(channel===1||channel===3);
  if(!visible){if(!rail.hidden){rail.hidden=true;generation++;active='';}return;}
  if(target!==rail.parentNode)target.append(rail);
  rail.hidden=false;
  rail.style.setProperty('--rail-top',target.getBoundingClientRect().top+window.scrollY+'px');
  rail.querySelector('h2').textContent=channel===3?'혼자하기 순위':'협동전 순위';
  pick.parentElement.hidden=channel!==3;
  if(channel===3){
   const cards=[...lobby.querySelectorAll('.arcade-game-card[data-game]')];
   if(cards.map(b=>b.dataset.game).join()!==[...pick.options].map(o=>o.value).join()){
    const previous=pick.value;pick.replaceChildren(...cards.map(b=>new Option(b.querySelector('b').textContent,b.dataset.game)));
    if(cards.some(b=>b.dataset.game===previous))pick.value=previous;
   }
  }
  const game=channel===3?pick.value:'mslug3',key=channel+'-'+game;
  if(!game)return;
  if(active===key)return;
  active=key;const id=++generation;
  content.replaceChildren();status.textContent='순위를 불러오는 중…';
  if(!snapshots.has(key))snapshots.set(key,Promise.all(['stars','score'].map(sort=>fetchRanks(channel,game,sort))));
  snapshots.get(key).then(results=>{
   if(id!==generation)return;
   const blocks=results.map((result,i)=>{
    const section=document.createElement('section'),heading=document.createElement('h3');
    heading.textContent=i?'개인 최고점':'완주 별';section.append(heading);
    const rows=result.rows.filter(p=>i?p.best_score>0:p.stars>0).slice(0,3);
    if(!rows.length){const p=document.createElement('p');p.textContent='아직 기록이 없습니다.';section.append(p);}
    for(const row of rows){const line=document.createElement('div');line.className='rail-row'+(row.self?' my-rank':'');
     for(const value of [row.rank+'위',row.name,i?row.best_score.toLocaleString()+'점':'★ '+row.stars]){
      const span=document.createElement('span');span.textContent=value;line.append(span);
     }section.append(line);
    }return section;
   });
   content.replaceChildren(...blocks);status.textContent='';
  }).catch(()=>{if(id===generation)status.textContent='순위를 불러오지 못했습니다.';});
 }
 pick.onchange=sync;
 const observer=new MutationObserver(sync);
 for(const node of [room,lobby,document.body])observer.observe(node,{attributes:true,attributeFilter:['hidden','class'],childList:node===document.body});
 for(const node of lobby.querySelectorAll('[data-channel]'))observer.observe(node,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',sync);window.addEventListener('resize',sync);
 function refresh(){snapshots.clear();active='';generation++;sync();}
 document.getElementById('refreshRooms').addEventListener('click',refresh);
 window.addEventListener('pageshow',event=>{if(event.persisted)refresh();});
 sync();
}
