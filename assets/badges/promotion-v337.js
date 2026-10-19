/* Authenticated, per-browser celebration of a server-recorded promotion. */
(function(){
 'use strict';
 if(window.NWPromotion337Loaded)return;window.NWPromotion337Loaded=true;
 const style=document.createElement('link');style.rel='stylesheet';style.href='assets/badges/promotion-v337.css';document.head.append(style);
 const dialog=document.createElement('dialog');dialog.className='nw-promotion';dialog.setAttribute('aria-labelledby','nwPromotionTitle337');
 dialog.innerHTML='<p class="nw-promo-kicker">NEWT WORLD · LEVEL UP</p><h2 id="nwPromotionTitle337"></h2><p class="nw-promo-name"></p><div class="nw-promo-stage"><img alt=""></div><p class="nw-promo-threshold"></p><div class="nw-promo-actions"><button type="button" class="nw-promo-replay">효과 다시 보기 · ♪</button><button type="button" class="nw-promo-confirm" autofocus>확인</button></div><p class="nw-promo-audio-note"></p>';
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
 function played(){if(!audio||audio.state!=='running')return false;const start=audio.currentTime+.015;[[523.25,0,.18],[659.25,.10,.20],[783.99,.20,.22],[1046.5,.34,.62]].forEach(([hz,delay,duration])=>{const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.value=hz;g.gain.setValueAtTime(0,start+delay);g.gain.linearRampToValueAtTime(.10,start+delay+.025);g.gain.exponentialRampToValueAtTime(.001,start+delay+duration);o.connect(g);g.connect(audio.destination);o.start(start+delay);o.stop(start+delay+duration+.03)});return true;}
 function unlockAudio(){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;if(!audio)audio=new Audio();if(audio.state==='suspended')void audio.resume().catch(()=>{});}catch(_){}}
 document.addEventListener('pointerdown',unlockAudio,{passive:true});document.addEventListener('keydown',unlockAudio);
 function celebrate(force=false){if(active?.celebrated&&!force)return;if(active)active.celebrated=true;dialog.removeAttribute('data-celebrate');void dialog.offsetWidth;dialog.setAttribute('data-celebrate','');note.textContent=played()?'':'소리가 들리지 않으면 ‘효과 다시 보기’를 눌러주세요.';}
 function close(){if(dialog.open)dialog.close();}
 dialog.querySelector('.nw-promo-replay').addEventListener('click',()=>{unlockAudio();setTimeout(()=>celebrate(true),50)});
 dialog.querySelector('.nw-promo-confirm').addEventListener('click',close);
 dialog.addEventListener('close',()=>{
  document.documentElement.style.overflow=overflow;
  if(active){if(!active.cancelled&&same(active.auth)){memory.add(active.key);write(active.key,'1');}release(active.key);active=null;}
  dialog.removeAttribute('data-celebrate');image.removeAttribute('src');if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});schedule();
 });
 function show(data,auth){
  const event=data.event,level=event&&Number(event.level),badge=window.NWGrades?.levels[level-1];
  if(!badge||!Number.isInteger(level)||!data.memberId||!event.id||!same(auth))return;
  const key=seenKey(data.memberId,event.id);if(memory.has(key)||read(key)||!claim(key))return;
  if(document.querySelector('dialog[open]')){release(key);return;}
  active={key,auth};previousFocus=document.activeElement;overflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
  dialog.querySelector('h2').textContent='축하합니다! '+badge.name+' 달성!';dialog.querySelector('.nw-promo-name').textContent=(data.nickname||'회원')+'님';dialog.querySelector('.nw-promo-threshold').textContent='누적 '+Number(event.score||badge.threshold).toLocaleString('ko-KR')+'점 · 새로운 등급을 달성했어요';
  image.alt=badge.name+' 등급 배지';image.onload=()=>{if(active?.key===key&&dialog.open)celebrate()};image.onerror=()=>{note.textContent='배지를 불러오지 못했어요. 효과 다시 보기를 눌러주세요.'};image.src=badge.image;
  dialog.showModal();if(image.complete&&image.naturalWidth)celebrate();
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
  pending=true;lastCheck=Date.now();try{const data=await request(auth);if(data?.ok&&data.auth&&data.event&&same(auth)){
   const run=()=>show(data,auth);if(navigator.locks?.request)await navigator.locks.request('nwPromotion337:'+auth.device,{mode:'exclusive'},run);else run();
  }}finally{pending=false;schedule()}
 }
 function resume(){if(!document.hidden&&Date.now()-lastCheck>15000)void check();else schedule()}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else resume()});window.addEventListener('pageshow',resume);window.addEventListener('focus',resume);window.addEventListener('storage',event=>{if(active&&(event.key==='nwProfileToken'||event.key==='nwProfileDevice')&&!same(active.auth)){active.cancelled=true;close();}});
 Promise.resolve(window.NWConfigReady).then(check);
})();
