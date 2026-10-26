/* Authenticated public-profile thumbnails; full-resolution zoom is fetched on demand. */
(function(){
 'use strict';
 const memory=new Map(),pendingIds=new Set(),failedUntil=new Map(),queue=new Map(),cacheKey='nwRankingPhotosV292';
 let meta=new Map(),scope='',generation=0,indexPending=false,active=0,pumpTimer=0,retryTimer=0,refreshTimer=0,lastIndex=0,metaUntil=0,metaExpiry=0,openedId='',openedRef='',previousFocus=null,zoomVersion=0;
 function auth(){try{return{token:localStorage.getItem('nwProfileToken')||'',device:localStorage.getItem('nwProfileDevice')||''};}catch(_){return{token:'',device:''};}}
 function scopeOf(a){return a.token+'|'+a.device;}
 function same(a){const b=auth();return a.token===b.token&&a.device===b.device;}
 function valid(src){return typeof src==='string'&&src.length<6000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(src);}
 function validRef(ref){return /^nw-avatar:[a-f0-9-]{36}$/i.test(String(ref||''));}
 function metaSave(){try{localStorage.setItem('nwRankingMeta297',JSON.stringify({scope,at:metaUntil-120000,items:[...meta]}));}catch(_){} }
 function metaExpire(){clearTimeout(metaExpiry);metaExpiry=setTimeout(()=>{if(Date.now()>=metaUntil){meta.clear();paint();}},Math.max(0,metaUntil-Date.now()));}
 function cacheRead(){try{const c=JSON.parse(localStorage.getItem('nwRankingMeta297')||'null');if(c&&c.scope===scope&&Date.now()-c.at>=0&&Date.now()-c.at<120000&&Array.isArray(c.items)){meta=new Map(c.items.filter(v=>Array.isArray(v)&&v.length===2&&typeof v[0]==='string'&&v[1]&&(validRef(v[1].ref)||(v[1].external===true&&/^https:\/\//i.test(v[1].ref)))));metaUntil=c.at+120000;metaExpire();}}catch(_){}
 try{const c=JSON.parse(localStorage.getItem(cacheKey)||'null');if(c&&c.scope===scope&&Array.isArray(c.items))for(const v of c.items.slice(0,80))if(v&&valid(v.src)&&validRef(v.ref)&&Date.now()-v.at>=0&&Date.now()-v.at<86400000)memory.set(v.id,v);}catch(_){} }
 function cacheSave(){try{localStorage.setItem(cacheKey,JSON.stringify({scope,items:[...memory.values()].slice(-80)}));}catch(_){} }
 function remember(v){memory.delete(v.id);memory.set(v.id,{...v,at:Date.now()});while(memory.size>80)memory.delete(memory.keys().next().value);}
 function jsonp(action,params){return new Promise(resolve=>{
  const app=window.NW_CONFIG&&window.NW_CONFIG.appScriptUrl;if(!app){resolve({ok:false});return;}
  const name='nwRankPhoto_'+Date.now()+'_'+Math.random().toString(36).slice(2),script=document.createElement('script');let done=false,timer=0;
  function finish(data){if(done)return;done=true;clearTimeout(timer);script.remove();window[name]=function(){};setTimeout(()=>{delete window[name]},60000);resolve(data||{ok:false});}
  window[name]=finish;script.async=true;script.onerror=()=>finish(null);script.src=app+(app.includes('?')?'&':'?')+new URLSearchParams({action,callback:name,_:Date.now(),...params});timer=setTimeout(()=>finish(null),20000);document.head.appendChild(script);
 });}
 function identity(){const a=auth(),next=scopeOf(a);if(next!==scope){scope=next;generation++;meta.clear();memory.clear();queue.clear();pendingIds.clear();failedUntil.clear();if(openedId)closeZoom();cacheRead();}return a;}
 function source(id,ref){if(/^https:\/\//i.test(ref))return ref;const full=window.NWMemberAvatar?.get(id,ref);if(full)return full;const v=memory.get(id);return v&&v.ref===ref?v.src:'';}
 function enqueue(id){const m=meta.get(id);if(!m||source(id,m.ref)||pendingIds.has(id)||(failedUntil.get(id)||0)>Date.now())return;queue.set(id,m.ref);clearTimeout(pumpTimer);pumpTimer=setTimeout(pump,0);}
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const id=decodeURIComponent(entry.target.dataset.rankingAvatar);enqueue(id);}}, {rootMargin:'240px'}):null;
 function paint(){
  identity();if(metaUntil&&Date.now()>=metaUntil)meta.clear();if(observer)observer.disconnect();
  document.querySelectorAll('[data-ranking-avatar]').forEach(slot=>{
   const id=decodeURIComponent(slot.dataset.rankingAvatar),m=meta.get(id);
   if(!m){slot.hidden=slot.classList.contains('nw-ranking-avatar-mobile');slot.classList.remove('nw-ranking-avatar-loading');slot.replaceChildren();if(!slot.hidden)slot.textContent='미등록';return;}
   slot.hidden=false;const src=source(id,m.ref);
   if(src){
    const old=slot.querySelector('img');if(old?.getAttribute('src')===src)return;
    const button=document.createElement('button');button.type='button';button.className='nw-ranking-avatar-button';button.dataset.rankingPhoto=id;button.setAttribute('aria-label',m.name+' 대표사진 확대');
    const image=document.createElement('img');image.alt=m.name+' 대표사진';image.width=image.height=32;image.decoding='async';image.src=src;
    image.onerror=()=>{if(meta.get(id)?.ref!==m.ref)return;memory.delete(id);failedUntil.set(id,Date.now()+30000);slot.replaceChildren();slot.classList.add('nw-ranking-avatar-loading');};
    button.append(image);slot.replaceChildren(button);slot.classList.remove('nw-ranking-avatar-loading');
   }else{
    slot.replaceChildren();slot.classList.add('nw-ranking-avatar-loading');
    if(observer)observer.observe(slot);else if(slot.getClientRects().length)enqueue(id);
   }
  });
 }
 async function pump(){
  const a=identity();if(!a.token||!a.device)return;
  while(active<2&&queue.size){
   const currentGeneration=generation,ids=[];
   for(const [id,ref] of queue){queue.delete(id);if(meta.get(id)?.ref!==ref||pendingIds.has(id)||source(id,ref))continue;ids.push(id);pendingIds.add(id);if(ids.length>=20)break;}
   if(!ids.length)break;active++;
   void jsonp('drawAvatarImages',{...a,ids:JSON.stringify(ids),size:'thumb'}).then(data=>{
    if(currentGeneration!==generation||!same(a))return;
    if(data.auth===false){meta.clear();metaUntil=0;metaSave();memory.clear();cacheSave();closeZoom();return;}
    const received=new Set();
    if(data.ok&&Array.isArray(data.images))for(const v of data.images){if(ids.includes(v.id)&&meta.get(v.id)?.ref===v.ref&&valid(v.src)){remember(v);received.add(v.id);failedUntil.delete(v.id);}}
    for(const id of ids)if(!received.has(id))failedUntil.set(id,Date.now()+30000);
    cacheSave();
   }).finally(()=>{
    active--;if(currentGeneration===generation)for(const id of ids)pendingIds.delete(id);
    paint();pump();clearTimeout(retryTimer);retryTimer=setTimeout(()=>paint(),31000);
   });
  }
 }
 async function refreshIndex(){
  const a=identity();if(indexPending||document.hidden)return;
  if(!a.token||!a.device){meta.clear();metaUntil=0;metaSave();paint();return;}
  indexPending=true;lastIndex=Date.now();const currentGeneration=generation;
  try{
   const visible=[...document.querySelectorAll('[data-ranking-avatar]')].filter(el=>el.getClientRects().length&&el.getBoundingClientRect().top<innerHeight+240&&el.getBoundingClientRect().bottom>-240).map(el=>decodeURIComponent(el.dataset.rankingAvatar));
   const ids=[...new Set(visible)].slice(0,20);
   const data=await jsonp('drawAvatarIndex',{...a,includeExternal:'1',ids:JSON.stringify(ids)});if(currentGeneration!==generation||!same(a))return;
   if(data.ok&&Array.isArray(data.avatars)){
    const next=new Map();for(const v of data.avatars)if(typeof v.id==='string'&&(validRef(v.ref)||(v.external===true&&/^https:\/\//i.test(v.ref)&&v.ref.length<=1500)))next.set(v.id,{ref:v.ref,name:String(v.name||'회원'),external:v.external===true});
    meta=next;metaUntil=Date.now()+120000;metaSave();metaExpire();
    if(Array.isArray(data.images))for(const v of data.images)if(meta.get(v.id)?.ref===v.ref&&valid(v.src))remember(v);
    for(const [id,v] of memory)if(meta.get(id)?.ref!==v.ref)memory.delete(id);cacheSave();
    if(openedId&&meta.get(openedId)?.ref!==openedRef)closeZoom();
   }else if(data.auth===false){meta.clear();metaUntil=0;metaSave();memory.clear();cacheSave();closeZoom();}
  }finally{indexPending=false;paint();clearTimeout(refreshTimer);if(!document.hidden)refreshTimer=setTimeout(refreshIndex,60000);}
 }
 const overlay=document.createElement('div');overlay.className='nw-photo-lightbox';overlay.hidden=true;
 const panel=document.createElement('section');panel.className='nw-photo-lightbox-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','회원 대표사진 확대');
 const close=document.createElement('button');close.type='button';close.className='nw-photo-lightbox-close';close.textContent='✕ 닫기';
 const title=document.createElement('h2'),photo=document.createElement('img'),status=document.createElement('p');photo.alt='회원 대표사진';panel.append(close,title,photo,status);overlay.append(panel);document.body.append(overlay);
 function closeZoom(){zoomVersion++;openedId='';openedRef='';overlay.hidden=true;document.body.classList.remove('nw-photo-zoom-open');photo.removeAttribute('src');if(previousFocus?.isConnected)previousFocus.focus();}
 async function openZoom(id){
  const a=identity(),m=meta.get(id);if(!m||!a.token||!a.device)return;
  previousFocus=document.activeElement;const version=++zoomVersion;openedId=id;openedRef=m.ref;title.textContent=m.name+' 대표사진';photo.alt=m.name+' 대표사진';overlay.hidden=false;document.body.classList.add('nw-photo-zoom-open');close.focus();
  if(m.external){photo.src=m.ref;status.textContent='';return;}
  const cached=window.NWMemberAvatar?.get(id,m.ref),thumb=source(id,m.ref);if(cached||thumb)photo.src=cached||thumb;else photo.removeAttribute('src');status.textContent=cached?'':'사진을 선명하게 불러오는 중…';
  const result=cached?{ok:true,imageUrl:m.ref,src:cached}:await window.NWMemberAvatar?.prefetch(id,m.ref);
  if(version!==zoomVersion||!same(a)||meta.get(id)?.ref!==m.ref)return;
  if(result?.ok&&result.imageUrl===m.ref&&window.NWMemberAvatar?.validSrc(result.src)){photo.src=result.src;status.textContent='';}
  else if(result?.auth===false||result?.ok&&!result.src){closeZoom();void refreshIndex();}
  else status.textContent='큰 사진을 불러오지 못했어요. 잠시 후 다시 열어주세요.';
 }
 photo.onerror=()=>{if(openedId)status.textContent='사진을 불러오지 못했어요. 잠시 후 다시 열어주세요.';};
 close.onclick=closeZoom;overlay.addEventListener('click',e=>{if(e.target===overlay)closeZoom();});
 document.addEventListener('keydown',e=>{if(overlay.hidden)return;if(e.key==='Escape'){e.preventDefault();closeZoom();}else if(e.key==='Tab'){e.preventDefault();close.focus();}});
 document.addEventListener('click',e=>{const button=e.target.closest?.('[data-ranking-photo]');if(button){e.preventDefault();e.stopPropagation();void openZoom(button.dataset.rankingPhoto);}});
 window.NWPaintRankingAvatars=paint;
 window.addEventListener('storage',e=>{if(['nwProfileToken','nwProfileDevice'].includes(e.key))void refreshIndex();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(refreshTimer);else if(Date.now()-lastIndex>15000)void refreshIndex();});
 window.addEventListener('focus',()=>{if(Date.now()-lastIndex>15000)void refreshIndex();});
 paint();if(window.NWConfigReady)window.NWConfigReady.then(refreshIndex);else void refreshIndex();
})();
