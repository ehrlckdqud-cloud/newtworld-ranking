/* Enlarge only badges which have been unlocked; never expose a locked original. */
(function(){
 'use strict';
 // Upgrade rendered grade controls without changing the public HTML payload.
 const rankRoots=['tb','cards'].map(id=>document.getElementById(id)).filter(Boolean);
 function hydrateRankingBadges(){
  rankRoots.forEach(root=>root.querySelectorAll('.member-grade:not(button)').forEach(node=>{
   const src=node.querySelector('img')?.getAttribute('src');
   const index=window.NWGrades?.levels.findIndex(b=>b.image===src);
   if(index==null||index<0)return;
   const button=document.createElement('button');button.type='button';button.className='member-grade nw-member-grade-zoom';button.dataset.badgeIndex=index;
   button.setAttribute('aria-label',window.NWGrades.levels[index].name+' 등급 배지 확대');button.setAttribute('aria-haspopup','dialog');
   button.append(...node.childNodes);node.replaceWith(button);
  }));
 }
 hydrateRankingBadges();
 if(typeof MutationObserver==='function'){
  const observer=new MutationObserver(hydrateRankingBadges);
  rankRoots.forEach(root=>observer.observe(root,{childList:true}));
 }
 const grid=document.getElementById('badgeGrid');
 if(!grid)return;
 const dialog=document.createElement('dialog');dialog.className='nw-badge-zoom';dialog.setAttribute('aria-labelledby','nwBadgeZoomTitle');
 dialog.innerHTML='<div class="nw-badge-zoom-head"><h2 id="nwBadgeZoomTitle"></h2><button type="button" class="nw-badge-zoom-close" autofocus aria-label="등급 배지 확대 닫기">✕ 닫기</button></div><img class="nw-badge-zoom-image" alt=""><p class="nw-badge-zoom-caption"></p>';
 document.body.append(dialog);
 const image=dialog.querySelector('img'),title=dialog.querySelector('h2'),caption=dialog.querySelector('p'),close=dialog.querySelector('button');
 let origin=null,openedIndex=-1,previousOverflow='';
 function open(card){
  const index=Number(card.dataset.badgeIndex),badge=window.NWGrades?.levels[index];
  if(!badge||!window.unlockState?.()[index])return;
  origin=card;openedIndex=index;title.textContent=badge.name+' 등급 배지';caption.textContent=Number(badge.threshold).toLocaleString('ko-KR')+'점 이상 · 해금 완료';
  image.alt=badge.name+' 등급 배지 전체 이미지';image.src=badge.image;
  if(!dialog.open){previousOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';dialog.showModal();}
 }
 function activate(event){
  const selector=event.type==='keydown'?'.badge-card.unlocked[data-badge-index]':'.badge-card.unlocked[data-badge-index],button.nw-member-grade-zoom[data-badge-index]';
  const card=event.target.closest?.(selector);if(!card)return;
  if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
  event.preventDefault();open(card);
 }
 document.addEventListener('click',activate);document.addEventListener('keydown',activate);
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 dialog.addEventListener('close',()=>{
  document.documentElement.style.overflow=previousOverflow;image.removeAttribute('src');
  const target=origin?.isConnected?origin:grid.querySelector('[data-badge-index="'+openedIndex+'"].unlocked');target?.focus({preventScroll:true});origin=null;openedIndex=-1;
 });
})();
