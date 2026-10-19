/* Authenticated, per-browser celebration of a server-recorded promotion. */
(function(){
 'use strict';
 if(window.NWPromotion337Loaded)return;window.NWPromotion337Loaded=true;
 const style=document.createElement('link');style.rel='stylesheet';style.href='assets/badges/promotion-v337.css?v=340';
 const styleReady=new Promise(resolve=>{style.onload=resolve;style.onerror=resolve;setTimeout(resolve,5000)});document.head.append(style);
 const dialog=document.createElement('dialog');dialog.className='nw-promotion';dialog.setAttribute('aria-labelledby','nwPromotionTitle337');
 dialog.innerHTML='<p class="nw-promo-kicker">NEWT WORLD · LEVEL UP</p><h2 id="nwPromotionTitle337"></h2><p class="nw-promo-name"></p><div class="nw-promo-stage"><img alt=""></div><p class="nw-promo-threshold"></p><div class="nw-promo-actions"><button type="button" class="nw-promo-replay">재생</button><button type="button" class="nw-promo-confirm" autofocus>확인</button></div><p class="nw-promo-audio-note"></p>';
 document.body.append(dialog);
 const image=dialog.querySelector('img'),stage=dialog.querySelector('.nw-promo-stage'),note=dialog.querySelector('.nw-promo-audio-note');
 for(let i=0;i<22;i++){const star=document.createElement('i');star.className='nw-promo-star';star.textContent=i%3?'✦':'✧';star.setAttribute('aria-hidden','true');const a=i/22*Math.PI*2;star.style.setProperty('--sx',Math.cos(a)*(95+i%4*15)+'px');star.style.setProperty('--sy',Math.sin(a)*(90+i%4*12)+'px');star.style.setProperty('--delay',i%5*30+'ms');stage.append(star);}
 const owner=Math.random().toString(36).slice(2),memory=new Set();let active=null,pending=false,timer=0,lastCheck=0,audio=null,previousFocus=null,overflow='';
 function credentials(){try{return{token:localStorage.getItem('nwProfileToken')||'',device:localStorage.getItem('nwProfileDevice')||''}}catch(_){return{token:'',device:''}}}
 function same(a){const b=credentials();return a.token===b.token&&a.device===b.device;}
 function read(key){try{return localStorage.getItem(key)}catch(_){return null}}
 function write(key,value){try{localStorage.setItem(key,value)}catch(_){}}
 function seenKey(member,event){return 'nwPromotionSeen337:'+encodeURIComponent(member)+':'+encodeURIComponent(event);}
 function claim(key){const now=Date.now(),leaseKey=key+':lease';try{const old=JSON.parse(read(leaseKey)||'null');if(old&&old.until>now&&old.owner!==owner)return false;}catch(_){}write(leaseKey,JSON.stringify({owner,until:now+300000}));return true;}
 function release(key){try{const k=key+':lease',old=JSON.parse(read(k)||'null');if(old?.owner===owner)localStorage.removeItem(k);}catch(_){}}
 function played(){if(!audio)return false;try{audio.pause();audio.currentTime=0;Promise.resolve(audio.play()).then(()=>{if(dialog.open)note.textContent='';}).catch(()=>{if(dialog.open)note.textContent='소리가 재생되지 않으면 ‘재생’을 눌러주세요.'});return true;}catch(_){return false;}}
 function unlockAudio(){try{if(!audio&&typeof Audio==='function'){audio=new Audio('assets/badges/promotion-fanfare-v339.mp3');audio.preload='auto';audio.volume=1;}}catch(_){}}
 document.addEventListener('pointerdown',unlockAudio,{passive:true});document.addEventListener('keydown',unlockAudio);
 function animateBadge338(panel,explicit){
  // The requested celebration includes its entrance motion on automatic display too.
  panel.toggleAttribute?.('data-play-motion',true);
  const badge=panel.querySelector('img');
  const bounce=[{transform:'translateY(56px) scale(.12) rotate(-12deg)',opacity:0,offset:0},{transform:'translateY(-8px) scale(1.38) rotate(4deg)',opacity:1,offset:.32},{transform:'translateY(5px) scale(.86) rotate(-3deg)',opacity:1,offset:.58},{transform:'translateY(-2px) scale(1.07) rotate(1deg)',opacity:1,offset:.78},{transform:'translateY(0) scale(1) rotate(0)',opacity:1,offset:1}];
  badge.getAnimations?.().forEach(a=>a.cancel());
  if(badge.animate)badge.animate(bounce,{duration:1800,easing:'cubic-bezier(.2,.7,.25,1)',fill:'both'});
  panel.querySelectorAll?.('.nw-promo-star').forEach((star,i)=>{
   star.getAnimations?.().forEach(a=>a.cancel());
   const sx=star.style.getPropertyValue('--sx'),sy=star.style.getPropertyValue('--sy');
   star.animate?.([{transform:'translate(-50%,-50%) scale(.1)',opacity:0,offset:0},{transform:'translate(-50%,-50%) scale(1.4)',opacity:1,offset:.12},{transform:'translate(calc(-50% + '+sx+'),calc(-50% + '+sy+')) scale(.3) rotate(100deg)',opacity:0,offset:1}],{duration:1900,delay:350+i%5*35,easing:'ease-out',fill:'both'});
  });
 }
 function celebrate(force=false){if(!dialog.open||document.hidden)return;if(active?.celebrated&&!force)return;if(active)active.celebrated=true;dialog.removeAttribute('data-celebrate');void dialog.offsetWidth;dialog.setAttribute('data-celebrate','');animateBadge338(dialog,force);note.textContent=played()?'':'소리가 들리지 않으면 ‘재생’를 눌러주세요.';}
 // Wait for decoded pixels and two paint opportunities before the entrance starts.
 async function startAutomatic(key){
  if(!active||active.key!==key||active.celebrated||active.starting)return;
  const current=active;current.starting=true;
  try{
   if(image.decode)try{await image.decode()}catch(_){}
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   if(active!==current||!dialog.open||document.hidden||current.celebrated)return;
   image.style.visibility='';celebrate();
  }finally{if(active===current)current.starting=false;}
 }
 function close(){if(dialog.open)dialog.close();}
 dialog.querySelector('.nw-promo-replay').addEventListener('click',()=>{unlockAudio();image.style.visibility='';celebrate(true)});
 dialog.querySelector('.nw-promo-confirm').addEventListener('click',close);
 dialog.addEventListener('close',()=>{
  if(audio){audio.pause();audio.currentTime=0;}image.getAnimations?.().forEach(a=>a.cancel());
  document.documentElement.style.overflow=overflow;
  if(active){if(!active.cancelled&&same(active.auth)){memory.add(active.key);write(active.key,'1');}release(active.key);active=null;}
  dialog.removeAttribute('data-celebrate');image.style.visibility='';image.removeAttribute('src');if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});schedule();
 });
 async function show(data,auth){
  await styleReady;
  if(document.hidden)return;
  const event=data.event,level=event&&Number(event.level),badge=window.NWGrades?.levels[level-1];
  if(!badge||!Number.isInteger(level)||!data.memberId||!event.id||!same(auth))return;
  const key=seenKey(data.memberId,event.id);if(memory.has(key)||read(key)||!claim(key))return;
  if(document.querySelector('dialog[open]')){release(key);return;}
  active={key,auth};previousFocus=document.activeElement;overflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
  dialog.querySelector('h2').textContent='축하합니다! '+badge.name+' 달성!';dialog.querySelector('.nw-promo-name').textContent=(data.nickname||'회원')+'님';dialog.querySelector('.nw-promo-threshold').textContent='누적 '+Number(event.score||badge.threshold).toLocaleString('ko-KR')+'점 · 새로운 등급을 달성했어요';
  image.alt=badge.name+' 등급 배지';image.style.visibility='hidden';image.onload=()=>{if(active?.key===key&&dialog.open)void startAutomatic(key)};image.onerror=()=>{image.style.visibility='';note.textContent='배지를 불러오지 못했어요. 재생을 눌러주세요.'};image.src=badge.image;
  unlockAudio();dialog.showModal();
  // Record a successful display immediately, including refresh/exit before confirmation.
  memory.add(key);write(key,'1');
  if(image.complete&&image.naturalWidth)void startAutomatic(key);
 }
 function request(auth){return new Promise(resolve=>{
  const app=window.NW_CONFIG?.appScriptUrl;if(!app){resolve(null);return;}
  const cb='nwPromotion337_'+Date.now()+'_'+Math.random().toString(36).slice(2),script=document.createElement('script');let done=false,timeout;
  function finish(data){if(done)return;done=true;clearTimeout(timeout);script.remove();window[cb]=()=>{};setTimeout(()=>{delete window[cb]},60000);resolve(data)}
  window[cb]=finish;script.onerror=()=>finish(null);script.src=app+(app.includes('?')?'&':'?')+new URLSearchParams({action:'gradePromotion',callback:cb,...auth,_:Date.now()});timeout=setTimeout(()=>finish(null),18000);document.head.append(script);
 });}
 function schedule(){clearTimeout(timer);if(!document.hidden)timer=setTimeout(check,60000)}
 async function check(){
  const auth=credentials();if(active&&!same(active.auth)){active.cancelled=true;close();}
  if(pending||active||document.hidden){schedule();return;}if(!auth.token||!auth.device){schedule();return;}
  pending=true;lastCheck=Date.now();unlockAudio();try{const data=await request(auth);if(data?.ok&&data.auth&&data.event&&same(auth)){
   const run=()=>show(data,auth);if(navigator.locks?.request)await navigator.locks.request('nwPromotion337:'+auth.device,{mode:'exclusive'},run);else run();
  }}finally{pending=false;schedule()}
 }
 function resume(){if(!document.hidden&&active&&!active.celebrated&&image.complete&&image.naturalWidth)void startAutomatic(active.key);if(!document.hidden&&Date.now()-lastCheck>15000)void check();else schedule()}
 document.addEventListener('visibilitychange',()=>{dialog.getAnimations?.({subtree:true}).forEach(a=>{if(document.hidden&&a.playState==='running')a.pause();else if(!document.hidden&&a.playState==='paused')a.play()});if(document.hidden){clearTimeout(timer);audio?.pause()}else resume()});window.addEventListener('pageshow',resume);window.addEventListener('focus',resume);window.addEventListener('storage',event=>{if(active&&(event.key==='nwProfileToken'||event.key==='nwProfileDevice')&&!same(active.auth)){active.cancelled=true;close();}});
 Promise.resolve(window.NWConfigReady).then(check);
})();
