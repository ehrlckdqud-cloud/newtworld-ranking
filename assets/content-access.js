/* Profile-compatible status reads; all mutations use POST plus receipt polling. */
(function(){
 'use strict';
 const base=new URL('../',document.currentScript.src);let configJob,lastStatus;
 function device(){let d=localStorage.getItem('nwProfileDevice');if(!d){d=crypto.randomUUID();localStorage.setItem('nwProfileDevice',d);}return d;}
 function credentials(){return {token:localStorage.getItem('nwProfileToken')||'',device:device(),guestToken:localStorage.getItem('nwCustomerToken')||'',adminToken:sessionStorage.getItem('nwAdminToken')||''};}
 function endpoint(){return configJob??=new Promise((resolve,reject)=>{function done(){const u=new URL(window.NW_CONFIG.appScriptUrl);if(u.hostname!=='script.google.com'||u.protocol!=='https:')return reject(Error('서버 주소 오류'));resolve(u.href);}if(window.NW_CONFIG)return done();const s=document.createElement('script');s.src=new URL('site-config.js',base);s.onload=done;s.onerror=()=>reject(Error('서버 설정을 불러오지 못했습니다.'));document.head.append(s);});}
 let gameAdminToken='';
 async function call(action,params={}){const url=await endpoint();if(action==='contentStatus')return readStatus(url,params);return new Promise((resolve,reject)=>{
  const nonce=crypto.randomUUID(),payload=JSON.stringify({...credentials(),...params,action,nonce});let done=false,pollTimer,script,callback,frame,form;
  const cleanup=()=>{clearTimeout(timer);clearTimeout(pollTimer);script?.remove();if(callback)delete window[callback];window.removeEventListener('message',receive);frame?.remove();form?.remove();};
  const finish=r=>{if(done)return;done=true;cleanup();resolve(r);};
  function receive(e){const parentRelay=e.origin===location.origin&&e.source===window.parent;if(!parentRelay&&!/^https:\/\/([a-z0-9-]+\.)?googleusercontent\.com$/.test(e.origin)&&e.origin!=='https://script.google.com')return;if(e.data?.channel==='nw-content'&&e.data.nonce===nonce)finish(e.data.result);}
  function poll(){if(done)return;script?.remove();if(callback)delete window[callback];callback='nwReceipt_'+crypto.randomUUID().replace(/-/g,'');script=document.createElement('script');script.referrerPolicy='no-referrer';window[callback]=r=>{if(r.done)finish(r.result);else pollTimer=setTimeout(poll,1500);};script.onerror=()=>{pollTimer=setTimeout(poll,1500);};script.src=url+'?'+new URLSearchParams({action:'contentReceipt',nonce,callback,_:Date.now()});document.head.append(script);}
  function fallback(){if(done||form)return;frame=document.createElement('iframe');frame.name='nwContent'+nonce;frame.hidden=true;form=document.createElement('form');form.hidden=true;form.method='POST';form.action=url;form.target=frame.name;const input=document.createElement('input');input.name='payload';input.value=payload;form.append(input);document.body.append(frame,form);form.submit();}
  const timer=setTimeout(()=>{if(done)return;done=true;cleanup();reject(Error('응답이 지연됩니다. 같은 요청으로 다시 확인해주세요.'));},45000);
  window.addEventListener('message',receive);
  fallback();
  pollTimer=setTimeout(poll,1000);
 });}
 function readStatus(url,params){return new Promise((resolve,reject)=>{const cb='nwContentRead_'+crypto.randomUUID().replace(/-/g,''),script=document.createElement('script');let done=false;const clean=()=>{clearTimeout(timer);script.remove();delete window[cb];};window[cb]=r=>{if(done)return;done=true;clean();resolve(r);};script.onerror=()=>{if(done)return;done=true;clean();reject(Error('회원 확인 서버에 연결하지 못했습니다.'));};const timer=setTimeout(()=>{if(done)return;done=true;clean();reject(Error('회원 확인 응답이 지연됩니다. 다시 확인해주세요.'));},30000);script.referrerPolicy='no-referrer';script.src=url+'?'+new URLSearchParams({...credentials(),...params,adminToken:'',action:'contentStatus',callback:cb,_:Date.now()});document.head.append(script);});}
 let statusJob=null,statusScope='';
 async function status(){const scope=JSON.stringify([credentials(),gameAdminToken]);if(statusJob&&scope===statusScope)return statusJob;statusScope=scope;const job=(async()=>{lastStatus=await call('contentStatus',{adminToken:'',...(gameAdminToken?{gameAdminToken,guestToken:''}:{})});if(!lastStatus.ok&&gameAdminToken){gameAdminToken='';window.dispatchEvent(new Event('nw-game-mode'));}window.dispatchEvent(new Event('nw-content-status'));return lastStatus;})();statusJob=job;try{return await job;}finally{if(statusJob===job)statusJob=null;}}
 function courseKey(game,course){return game+':'+(course??(game==='marble'?String(Number(document.getElementById('map')?.value)||0):game==='factory'?'4':'default'));}
 function coursePrice(config,game,course){return config.courses?.[courseKey(game,course)]??config.games[game].price;}
 let starting=false;
 async function start(game,adminToken='',course=null){
  if(starting)return false;starting=true;
  try{
   const s=await status();if(!s.ok)throw Error(s.error);const g={...s.config.games[game],price:coursePrice(s.config,game,course)};course=courseKey(game,course).split(':')[1];
   if(s.kind!=='admin'&&!adminToken&&(!s.config.enabled||!g.public))throw Error('현재 관리자 전용 콘텐츠입니다.');
   const scope=[s.memberId,s.kind,game,course].join(':'),key='nwPendingRun:'+scope;let id=sessionStorage.getItem(key);
   if(!id){const info=s.kind==='member'?g.price+'젬을 사용합니다.':s.kind==='guest'&&s.customer.mode==='uses'?'실행 횟수 1회를 사용합니다.':s.kind==='admin'?'관리자모드로 실행합니다. 젬은 차감되지 않습니다.':'이용권으로 실행합니다.';if(!adminToken&&!await window.NWUI.confirm({title:'생존추첨 시작',cost:s.kind==='member'?g.price:null,message:info+' 진행하시겠습니까?'}))return false;id=crypto.randomUUID();sessionStorage.setItem(key,id);}
   const r=await call('contentStart',{game,course,expectedCost:g.price,requestId:id,adminToken:'',...(gameAdminToken?{gameAdminToken,guestToken:''}:{}),...(adminToken?{adminToken,guestToken:''}:{})});
   if(!r.ok){sessionStorage.removeItem(key);throw Error(r.error);}sessionStorage.removeItem(key);window.dispatchEvent(new CustomEvent('nw-wallet-updated'));return true;
  }catch(e){alert(e.message);return false;}finally{starting=false;}
 }
 window.NWContent={call,status,start,credentials,base,get account(){return lastStatus?.memberId||'unknown';},async access(){try{return await status();}catch(e){return {ok:false,error:e.message};}}};
 document.addEventListener('DOMContentLoaded',()=>{

  const startButton=document.getElementById('start');
  if(startButton&&window.NWUI){
   function paintCost(){
    const game=Number(document.getElementById('map')?.value)===4?'factory':'marble',g=lastStatus?.config?.games?.[game];
    const label=gameAdminToken?'면제':game!=='marble'?'관리자 전용':lastStatus?.kind==='guest'?'이용권':g?String(coursePrice(lastStatus.config,game)): '—';
    let badge=startButton.querySelector('.nw-start-cost');if(!badge){badge=document.createElement('span');badge.className='nw-start-cost';startButton.append(badge);}
    if(badge.dataset.label===label)return;badge.dataset.label=label;badge.replaceChildren();if(/^\d+$/.test(label))badge.append(window.NWUI.gem());badge.append(document.createTextNode(label));badge.setAttribute('aria-label',/^\d+$/.test(label)?label+'젬 차감':label);
   }
   new MutationObserver(paintCost).observe(startButton,{childList:true});document.getElementById('map')?.addEventListener('change',paintCost);window.addEventListener('nw-content-status',paintCost);paintCost();
  }

  const modeButton=document.getElementById('nwGameAdminMode');
  if(modeButton){
   function paint(){modeButton.textContent=gameAdminToken?'관리자모드 ON · 차감 없음':'관리자모드';modeButton.setAttribute('aria-pressed',String(!!gameAdminToken));}
   window.addEventListener('nw-game-mode',paint);
   status().then(r=>{modeButton.hidden=!(r.ok&&r.canUseGameAdmin);paint();}).catch(()=>{});
   modeButton.onclick=async()=>{
    if(starting)return;
    if(gameAdminToken){const old=gameAdminToken;gameAdminToken='';paint();window.dispatchEvent(new Event('nw-content-status'));try{await call('contentGameAdminOff',{gameAdminToken:old,guestToken:'',adminToken:''});}catch(_){}return;}
    const dialog=document.createElement('dialog');dialog.innerHTML='<form><h2>관리자모드</h2><p>인증 후에는 젬을 차감하지 않습니다.</p><input type="password" autocomplete="current-password" placeholder="관리자 비밀번호" required aria-label="관리자 비밀번호"><p role="alert"></p><button type="button">취소</button><button type="submit">인증</button></form>';dialog.style.cssText='background:#10242b;color:#effff6;border:1px solid #396457;border-radius:16px;padding:24px;max-width:calc(100vw - 48px)';document.body.append(dialog);
    const form=dialog.querySelector('form'),input=dialog.querySelector('input'),error=dialog.querySelector('[role=alert]'),submit=dialog.querySelector('[type=submit]');
    dialog.querySelector('[type=button]').onclick=()=>{input.value='';dialog.close();dialog.remove();};dialog.addEventListener('cancel',()=>{input.value='';dialog.remove();});
    form.onsubmit=async e=>{e.preventDefault();if(submit.disabled)return;submit.disabled=true;try{const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input.value));input.value='';const hash=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');const r=await call('contentGameAdmin',{hash,guestToken:'',adminToken:''});if(!r.ok)throw Error(r.error);gameAdminToken=r.gameAdminToken;paint();window.dispatchEvent(new Event('nw-content-status'));dialog.close();dialog.remove();}catch(e){error.textContent=e.message;submit.disabled=false;}};
    dialog.showModal();input.focus();
   };
  }

  if(location.pathname.includes('/draw/')){const footer=document.createElement('div');footer.style.cssText='position:fixed;bottom:8px;right:12px;font-size:12px;z-index:30;color:#a9c8ba';status().then(r=>{if(r.ok&&r.config.contact){footer.textContent='이용 문의: '+r.config.contact;document.body.append(footer);}}).catch(()=>{});}
 });
})();
