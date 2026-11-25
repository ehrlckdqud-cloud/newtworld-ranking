(function(){
 'use strict';
 const $=id=>document.getElementById(id),base=new URL('../',document.currentScript.src);
 const ATTEMPT_KEY='nwSocialLoginAttempt:v1',ATTEMPT_AGE=10*60*1000,TICKET=/^[A-Za-z0-9_-]{16,512}$/;
 const callback=window.NWSocialCallback||{};delete window.NWSocialCallback;
 const providers=new Map(),buttons=[...document.querySelectorAll('[data-provider]')];
 const inKakao=/KAKAOTALK/i.test(navigator.userAgent);
 let busy=false,configBusy=false,callbackBusy=false;
 function safeReturn(value){
  if(typeof value!=='string'||!value||value.length>1500||/^[\/\\]|[\u0000-\u0020\\]/.test(value))return 'index.html';
  try{const u=new URL(value,base);if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname))return 'index.html';
   const path=u.pathname.slice(base.pathname.length);
   if(!/^(?:(?:index|profile)\.html|(?:coop|draw)\/[a-zA-Z0-9_./-]+\.html)$/.test(path))return 'index.html';
   for(const key of [...u.searchParams.keys()])if(/token|ticket|secret|verifier|password|^code$|^state$/i.test(key))u.searchParams.delete(key);
   if(u.hash&&!/^#(?:draw|profile|members)$/.test(u.hash))u.hash='';
   return path+u.search+u.hash;
  }catch(_){return 'index.html';}
 }
 const params=new URLSearchParams(location.search);
 let returnTo=safeReturn(params.get('returnTo')||'index.html');
 function status(message,tone='info'){$('loginStatus').textContent=message;$('loginStatus').dataset.tone=tone;}
 function updateLinks(){
  $('memberContinue').href=new URL(returnTo,base).href;
  const profile=new URL('profile.html',base);profile.searchParams.set('loginReturn',returnTo);$('verifyMember').href=profile.href;
 }
 function paintButtons(){buttons.forEach(button=>{const enabled=providers.get(button.dataset.provider)===true;button.disabled=busy||callbackBusy||inKakao||!enabled;button.querySelector('.provider-state').textContent=enabled?'':'준비 중';});}
 function clearAttempt(){try{sessionStorage.removeItem(ATTEMPT_KEY);}catch(_){} }
 function readAttempt(){
  try{const a=JSON.parse(sessionStorage.getItem(ATTEMPT_KEY)||'null');if(!a||!/^[a-f0-9]{64}$/.test(a.verifier)||!['google','kakao','naver'].includes(a.provider)||!Number.isFinite(a.createdAt)||Date.now()-a.createdAt<0||Date.now()-a.createdAt>ATTEMPT_AGE||(a.ticket&&!TICKET.test(a.ticket)))return null;return {...a,returnTo:safeReturn(a.returnTo)};}catch(_){return null;}
 }
 function errorMessage(result){
  const code=String(result?.code||result?.error||'');
  if(code==='LOGIN_PAUSED')return '간편 로그인 운영을 잠시 중단했어요.';
  if(code.includes('MEMBER_LINK_REQUIRED'))return '처음 연결하는 계정이에요. 아래에서 기존 회원 인증을 완료한 뒤 로그인 계정을 연결해주세요.';
  if(/PROVIDER_NOT_READY|PROVIDER_DISABLED|PROVIDER_NOT_CONFIGURED|SOCIAL_NOT_CONFIGURED/.test(code))return '아직 준비 중인 로그인 방법이에요. 기존 회원 인증으로 이용해주세요.';
  if(/EXPIRED|INVALID_TICKET|INVALID_VERIFIER|STATE_INVALID|STATE_MISMATCH/.test(code))return '로그인 연결 시간이 지났거나 요청을 확인하지 못했어요. 같은 브라우저에서 다시 시도해주세요.';
  if(/MEMBER_LINK_CONFLICT|ACCOUNT_ALREADY_LINKED|ACCOUNT_CONFLICT|SOCIAL_ALREADY_LINKED/.test(code))return '다른 회원과 연결된 계정이에요. 본인의 다른 로그인 계정으로 다시 시도하거나 관리자에게 문의해주세요.';
  if(/LOGIN_CANCELED|access_denied|CANCELLED/.test(code))return '로그인이 취소되었어요. 원하는 방법으로 다시 로그인할 수 있어요.';
  if(code.includes('DEVICE_MISMATCH'))return '로그인을 시작한 브라우저의 연결 정보가 달라졌어요. 같은 브라우저에서 다시 로그인해주세요.';
  if(code.includes('MEMBER_INACTIVE'))return '현재 이용 가능한 회원으로 확인되지 않았어요. 관리자에게 회원 상태 확인을 요청해주세요.';
  if(code.includes('MEMBER_SESSION_CHANGED'))return '회원 연결이 변경되어 로그인을 마치지 못했어요. 기존 회원 인증 상태를 확인한 뒤 다시 시도해주세요.';
  if(code.includes('CONFIG_CHANGED'))return '로그인 설정이 변경되었어요. 아래에서 로그인 방법을 다시 선택해주세요.';
  if(code.includes('PROVIDER_UNAVAILABLE'))return '로그인 제공자에 일시적으로 연결하지 못했어요. 잠시 후 다시 확인해주세요.';
  if(code.includes('TOO_MANY_ATTEMPTS'))return '로그인 시도가 많아 잠시 제한되었어요. 잠시 기다린 뒤 다시 시도해주세요.';
  if(code.includes('LOGIN_PROCESSING'))return '로그인을 처리하고 있어요. 잠시 후 ‘로그인 다시 확인’을 눌러주세요.';
  return '로그인을 완료하지 못했어요. 잠시 후 다시 시도하거나 기존 회원 인증으로 이용해주세요.';
 }
 async function loadConfig(){
  if(configBusy)return;configBusy=true;$('retryConfig').hidden=true;
  try{const result=await window.NWContent.call('socialConfig');if(!result?.ok||!Array.isArray(result.providers))throw Error('config');
   providers.clear();result.providers.forEach(p=>{if(['google','kakao','naver'].includes(p.id))providers.set(p.id,p.enabled===true);});
   if($('providers'))$('providers').hidden=result.loginEnabled===false;
   if(result.loginEnabled===false){$('providerNotice').textContent='간편 로그인 운영을 잠시 중단했어요. 아래에서 기존 회원 인증을 이용할 수 있어요.';return;}
   const available=[...providers.values()].some(Boolean);
   $('providerNotice').textContent=available?'이미 연결한 계정으로 로그인하세요. 처음 연결하는 계정은 회원 인증 후 이용할 수 있어요.':'간편 로그인은 준비 중입니다. 지금은 아래의 기존 회원 인증으로 이용할 수 있어요.';
  }catch(_){providers.clear();$('providerNotice').textContent='로그인 방법을 불러오지 못했어요. 기존 회원 인증은 계속 이용할 수 있어요.';$('retryConfig').hidden=false;}
  finally{configBusy=false;paintButtons();}
 }
 function validAuthorizationUrl(value,provider){
  const allowed={google:['accounts.google.com',['/o/oauth2/v2/auth','/o/oauth2/auth']],kakao:['kauth.kakao.com',['/oauth/authorize']],naver:['nid.naver.com',['/oauth2.0/authorize','/oauth2/authorize']]};
  try{const u=new URL(value),entry=allowed[provider];if(!entry||u.protocol!=='https:'||u.hostname!==entry[0]||u.port||u.username||u.password||u.hash||!entry[1].includes(u.pathname))return null;return u.href;}catch(_){return null;}
 }
 async function start(provider){
  if(busy||callbackBusy||inKakao||providers.get(provider)!==true)return;
  busy=true;paintButtons();status('선택한 로그인 화면으로 연결하고 있어요…');
  try{
   const verifier=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
   const challenge=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))),n=>n.toString(16).padStart(2,'0')).join('');
   const attempt={provider,verifier,returnTo,createdAt:Date.now()};sessionStorage.setItem(ATTEMPT_KEY,JSON.stringify(attempt));
   const result=await window.NWContent.call('contentSocialStart',{provider,challenge,guestToken:'',adminToken:''});
   if(!result?.ok){clearAttempt();status(errorMessage(result),'error');return;}
   const authorizationUrl=validAuthorizationUrl(result.authorizationUrl,provider);if(!authorizationUrl)throw Error('untrusted redirect');
   window.top.location.assign(authorizationUrl);
  }catch(_){clearAttempt();status('로그인 화면에 연결하지 못했어요. 브라우저의 저장 공간을 허용한 뒤 다시 시도해주세요.','error');}
  finally{busy=false;paintButtons();}
 }
 async function finish(){
  if(callbackBusy)return;callbackBusy=true;$('retryFinish').hidden=true;paintButtons();
  try{
   const attempt=readAttempt();if(attempt){returnTo=attempt.returnTo;updateLinks();}
   if(callback.error){clearAttempt();status(errorMessage({error:callback.error}),'error');return;}
   const ticket=callback.ticket||attempt?.ticket;
   if(!attempt||!TICKET.test(ticket||'')){clearAttempt();status('이 브라우저에서 시작한 로그인 요청을 찾지 못했어요. 아래에서 다시 로그인해주세요.','error');return;}
   // Keep this bounded, tab-local recovery record until the member session is saved.
   attempt.ticket=ticket;sessionStorage.setItem(ATTEMPT_KEY,JSON.stringify(attempt));
   status('로그인을 확인하고 기존 회원 정보를 연결하고 있어요…');
   const result=await window.NWContent.call('contentSocialFinish',{ticket,verifier:attempt.verifier,guestToken:'',adminToken:''});
   if(!result?.ok){
    const code=String(result?.code||result?.error||'');
    const terminal=/LOGIN_PAUSED|MEMBER_LINK_REQUIRED|MEMBER_LINK_CONFLICT|MEMBER_SESSION_CHANGED|MEMBER_INACTIVE|LOGIN_EXPIRED|INVALID_TICKET|INVALID_VERIFIER|STATE_INVALID|STATE_MISMATCH|DEVICE_MISMATCH|CONFIG_CHANGED|PROVIDER_NOT_READY|LOGIN_CANCELED/.test(code);
    if(terminal)clearAttempt();else $('retryFinish').hidden=false;
    status(errorMessage(result),'error');return;
   }
   if(typeof result.token!=='string'||!result.token||typeof result.memberId!=='string'||!result.memberId)throw Error('invalid response');
   localStorage.setItem('nwProfileToken',result.token);
   if(localStorage.getItem('nwProfileToken')!==result.token)throw Error('storage');
   localStorage.removeItem('nwCustomerToken');
   localStorage.removeItem('nwProfileRequestId');localStorage.removeItem('nwProfileCode');
   clearAttempt();window.dispatchEvent(new CustomEvent('nw-wallet-updated'));
   $('memberState').hidden=false;$('memberState').textContent=(typeof result.nickname==='string'?result.nickname+'님, ':'')+'로그인되었습니다.';
   $('memberContinue').hidden=false;
   const welcome=result.welcome;let message='기존 뉴트젬과 기록으로 이어서 이용할 수 있어요.';
   if(welcome?.status==='paid'&&Number.isFinite(welcome.amount)&&welcome.amount>=0)message='첫 이용 보너스 '+Number(welcome.amount).toLocaleString('ko-KR')+'젬 지급 이력이 확인됐어요. 기존 잔액으로 이용할 수 있어요.';
   else if(welcome?.status==='held')message='첫 이용 보너스는 중복 지급 확인으로 보류됐어요. 로그인과 보유 뉴트젬 사용은 가능합니다.';
   else if(welcome?.status==='pending_device')message='로그인은 완료됐어요. 첫 이용 보너스 지급 여부는 회원 인증 확인 후 안내됩니다.';
   status(message);
   if(!welcome||!['held','pending_device'].includes(welcome.status))setTimeout(()=>window.top.location.replace(new URL(returnTo,base).href),1000);
  }catch(_){$('retryFinish').hidden=false;status('로그인 결과를 확인하거나 저장하지 못했어요. 브라우저 저장을 허용한 뒤 ‘로그인 다시 확인’을 눌러 이어서 확인해주세요.','error');}
  finally{callbackBusy=false;paintButtons();}
 }
 async function checkMember(){
  if(!localStorage.getItem('nwProfileToken')||!localStorage.getItem('nwProfileDevice'))return;
  try{const result=await window.NWContent.status();if(!result?.ok||result.kind!=='member'||!result.memberId)return;
   $('memberState').textContent='이 브라우저는 이미 회원 인증이 되어 있어요.';$('memberState').hidden=false;$('memberContinue').hidden=false;
  }catch(_){}
 }
 updateLinks();$('browserNotice').hidden=!inKakao;
 $('retryConfig').onclick=loadConfig;$('retryFinish').onclick=finish;buttons.forEach(button=>button.onclick=()=>start(button.dataset.provider));
 void loadConfig();if(callback.ticket||callback.error||readAttempt()?.ticket)void finish();else void checkMember();
})();
