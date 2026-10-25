/* Server-authoritative wallet API. Credentials travel in POST bodies, never URLs. */
(function(){
 'use strict';
 const base=new URL('../',document.currentScript.src);let configJob,lastStatus;
 function device(){let d=localStorage.getItem('nwProfileDevice');if(!d){d=crypto.randomUUID();localStorage.setItem('nwProfileDevice',d);}return d;}
 function credentials(){return {token:localStorage.getItem('nwProfileToken')||'',device:device(),guestToken:localStorage.getItem('nwCustomerToken')||'',adminToken:sessionStorage.getItem('nwAdminToken')||''};}
 function endpoint(){return configJob??=new Promise((resolve,reject)=>{function done(){const u=new URL(window.NW_CONFIG.appScriptUrl);if(u.hostname!=='script.google.com'||u.protocol!=='https:')return reject(Error('서버 주소 오류'));resolve(u.href);}if(window.NW_CONFIG)return done();const s=document.createElement('script');s.src=new URL('site-config.js',base);s.onload=done;s.onerror=()=>reject(Error('서버 설정을 불러오지 못했습니다.'));document.head.append(s);});}
 async function call(action,params={}){const url=await endpoint();return new Promise((resolve,reject)=>{
  const nonce=crypto.randomUUID(),frame=document.createElement('iframe'),form=document.createElement('form');frame.name='nwContent'+nonce;frame.hidden=true;form.hidden=true;form.method='POST';form.action=url;form.target=frame.name;
  const input=document.createElement('input');input.name='payload';input.value=JSON.stringify({...credentials(),...params,action,nonce});form.append(input);
  const cleanup=()=>{clearTimeout(timer);window.removeEventListener('message',receive);frame.remove();form.remove();};
  function receive(e){const parentRelay=e.origin===location.origin&&e.source===window.parent;if(!parentRelay&&!/^https:\/\/([a-z0-9-]+\.)?googleusercontent\.com$/.test(e.origin)&&e.origin!=='https://script.google.com')return;if(e.data?.channel!=='nw-content'||e.data.nonce!==nonce)return;cleanup();resolve(e.data.result);}
  const timer=setTimeout(()=>{cleanup();reject(Error('응답이 지연됩니다. 같은 요청으로 다시 확인해주세요.'));},25000);window.addEventListener('message',receive);document.body.append(frame,form);form.submit();
 });}
 async function status(){lastStatus=await call('contentStatus');return lastStatus;}
 let starting=false;
 async function start(game,adminToken=''){
  if(starting)return false;starting=true;
  try{
   const s=await status();if(!s.ok)throw Error(s.error);const g=s.config.games[game];
   if(s.kind!=='admin'&&!adminToken&&(!s.config.enabled||!g.public))throw Error('현재 관리자 전용 콘텐츠입니다.');
   const scope=[s.memberId,game].join(':'),key='nwPendingRun:'+scope;let id=sessionStorage.getItem(key);
   if(!id){const info=s.kind==='member'?g.price+'젬을 사용합니다.':s.kind==='guest'&&s.customer.mode==='uses'?'실행 횟수 1회를 사용합니다.':'이용권으로 실행합니다.';if(!adminToken&&!confirm(info+' 시작할까요?'))return false;id=crypto.randomUUID();sessionStorage.setItem(key,id);}
   const r=await call('contentStart',{game,requestId:id,...(adminToken?{adminToken,guestToken:''}:{})});
   if(!r.ok){sessionStorage.removeItem(key);throw Error(r.error);}sessionStorage.removeItem(key);window.dispatchEvent(new CustomEvent('nw-wallet-updated'));return true;
  }catch(e){alert(e.message);return false;}finally{starting=false;}
 }
 window.NWContent={call,status,start,credentials,base,get account(){return lastStatus?.memberId||'unknown';},async access(){try{return await status();}catch(e){return {ok:false,error:e.message};}}};
 document.addEventListener('DOMContentLoaded',()=>{
  if(document.getElementById('nwWallet')){
   async function render(){const root=document.getElementById('nwWallet');root.hidden=false;root.textContent='뉴트젬을 불러오는 중…';try{const r=await call('contentStatus',{guestToken:'',adminToken:''});if(!r.ok||r.kind!=='member')throw Error(r.error||'회원식별 후 뉴트젬을 확인할 수 있어요.');root.replaceChildren();const h=document.createElement('h3');h.textContent='내 뉴트젬';const gem=document.createElement('span');gem.setAttribute('aria-hidden','true');gem.style.cssText='display:inline-block;width:20px;height:20px;margin-right:9px;vertical-align:-3px;background:linear-gradient(135deg,#a7f3d0 0%,#34d399 40%,#059669 65%,#064e3b 100%);clip-path:polygon(25% 0,75% 0,100% 35%,50% 100%,0 35%)';h.prepend(gem);const b=document.createElement('strong');b.textContent=Number(r.wallet.balance).toLocaleString()+' 젬';const note=document.createElement('p');note.textContent=r.config.enabled?'랭킹 점수는 유지되고 콘텐츠 이용 시 뉴트젬만 차감됩니다.':'뉴트젬 서비스 준비 중';const list=document.createElement('ul');for(const x of (r.wallet.history||[]).slice(0,10)){const li=document.createElement('li');li.textContent=new Date(x.at).toLocaleDateString('ko-KR')+' · '+x.note+' · '+(x.amount>0?'+':'')+x.amount+' 젬';list.append(li);}root.append(h,b,note,list);}catch(e){root.hidden=false;root.textContent=e.message;const retry=document.createElement('button');retry.type='button';retry.className='btn';retry.textContent='뉴트젬 다시 불러오기';retry.onclick=render;root.append(retry);}}
   render();window.addEventListener('nw-wallet-updated',render);window.addEventListener('focus',render);
  }
  if(location.pathname.includes('/draw/')){const footer=document.createElement('div');footer.style.cssText='position:fixed;bottom:8px;right:12px;font-size:12px;z-index:30;color:#a9c8ba';status().then(r=>{if(r.ok&&r.config.contact){footer.textContent='이용 문의: '+r.config.contact;document.body.append(footer);}}).catch(()=>{});}
 });
})();
