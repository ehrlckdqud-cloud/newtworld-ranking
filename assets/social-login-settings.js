(function(){
 'use strict';
 const $=id=>document.getElementById(id),labels={google:'Google',kakao:'카카오',naver:'네이버'};
 const fieldsets=new Map();let saving=false,redirectUri='';
 function secretFields(){return [...document.querySelectorAll('[data-secret]')];}
 function clearSecrets(){secretFields().forEach(input=>{input.value='';});}
 function adminError(result){
  const error=String(result?.error||result?.code||'');
  if(/관리자 인증|ADMIN_AUTH|UNAUTHORIZED|FORBIDDEN/.test(error))return Error('관리자 인증이 필요합니다.');
  return Error('로그인 설정을 확인하지 못했어요. 잠시 후 다시 시도해주세요.');
 }
 function render(providers){
  const box=$('providerSettings');box.replaceChildren();fieldsets.clear();
  for(const id of ['google','kakao','naver']){
   const provider=providers.find(p=>p.id===id)||{id};
   const card=document.createElement('section');card.className='provider-card';
   const heading=document.createElement('h2');heading.textContent=labels[id];
   const badge=document.createElement('span');badge.className='badge';badge.textContent=provider.enabled===true?'사용 중':provider.configured===true?'연결 준비됨':'키 설정 필요';heading.append(badge);
   const note=document.createElement('p');note.className='hint provider-note';note.textContent=id==='kakao'?'카카오디벨로퍼스의 REST API 키와 Client Secret을 입력하세요.':'개발자 앱의 웹 로그인용 Client ID와 Client Secret을 입력하세요.';
   function field(labelText,type,name){const label=document.createElement('label');label.className='field';const span=document.createElement('span');span.textContent=labelText;const input=document.createElement('input');input.type=type;input.name=id+'-'+name;input.autocomplete=type==='password'?'new-password':'off';input.spellcheck=false;input.maxLength=1024;label.append(span,input);card.append(label);return {label,input};}
   card.append(heading,note);
   const client=field(id==='kakao'?'REST API 키':'Client ID','text','client-id');client.input.value=typeof provider.clientId==='string'?provider.clientId:'';
   const secret=field('Client Secret','password','client-secret');secret.input.dataset.secret=id;secret.input.placeholder=provider.secretConfigured?'저장된 키 유지 · 변경할 때만 입력':'발급받은 비밀키 입력';
   const help=document.createElement('small');help.textContent=provider.secretConfigured?'비밀키가 저장되어 있습니다.':'아직 저장된 비밀키가 없습니다.';secret.label.append(help);
   const toggle=document.createElement('label');toggle.className='toggle';const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=provider.enabled===true;enabled.name=id+'-enabled';const title=document.createElement('span');title.textContent=labels[id]+' 로그인 사용';toggle.append(enabled,title);card.append(toggle);
   fieldsets.set(id,{card,client:client.input,secret:secret.input,enabled,secretConfigured:provider.secretConfigured===true});box.append(card);
  }
 }
 async function load(){
  const result=await window.NWContent.call('contentSocialAdminRead',{guestToken:''});
  if(!result?.ok||!Array.isArray(result.providers))throw adminError(result);
  try{const u=new URL(result.redirectUri);if(u.protocol!=='https:'||u.hostname!=='script.google.com'||!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname)||u.username||u.password||u.hash)throw Error('redirect');redirectUri=u.href;}catch(_){throw Error('로그인 서버 주소를 확인하지 못했어요. 관리자에게 설정 확인이 필요합니다.');}
  $('redirectUri').textContent=redirectUri;render(result.providers);
 }
 $('copyRedirect').onclick=async()=>{try{await navigator.clipboard.writeText(redirectUri);$('copyStatus').textContent='주소를 복사했어요.';}catch(_){$('copyStatus').textContent='위 주소를 길게 누르거나 선택해서 복사해주세요.';}};
 $('loginSettings').onsubmit=async event=>{
  event.preventDefault();if(saving)return;
  const providers=[];
  for(const [id,fields]of fieldsets){
   const clientId=fields.client.value.trim(),clientSecret=fields.secret.value.trim();
   if(fields.enabled.checked&&(!clientId||(!fields.secretConfigured&&!clientSecret))){$('saveStatus').textContent=labels[id]+'의 키를 입력한 뒤 로그인을 켜주세요.';(!clientId?fields.client:fields.secret).focus();return;}
   providers.push({id,clientId,clientSecret,enabled:fields.enabled.checked});
  }
  saving=true;let saved=false;$('saveSettings').disabled=true;$('saveStatus').textContent='로그인 설정을 저장하고 있어요.';
  for(const input of $('loginSettings').querySelectorAll('input'))input.disabled=true;
  try{
   const result=await window.NWContent.call('contentSocialAdminSave',{providers,guestToken:''});
   if(!result?.ok)throw adminError(result);
   saved=true;clearSecrets();await load();$('saveStatus').textContent='로그인 설정을 저장했어요. 로그인 화면에서 실제 연결을 확인해주세요.';
  }catch(error){
   $('saveStatus').textContent=saved?'설정은 저장했지만 최신 상태를 불러오지 못했어요. 새로고침하여 확인해주세요.':error.message==='관리자 인증이 필요합니다.'?'관리자 인증이 만료되었어요. 관리자 로그인 후 다시 저장해주세요.':'저장 결과를 확인하지 못했어요. 비밀키는 입력란에서 지웠습니다. 설정을 다시 확인한 후 시도해주세요.';
   if(error.message==='관리자 인증이 필요합니다.'){sessionStorage.removeItem('nwAdminToken');$('adminStatus').textContent='관리자 인증이 만료되었어요. 다시 로그인해주세요.';$('adminBody').hidden=true;$('adminRetry').hidden=false;}
  }finally{
   clearSecrets();providers.forEach(p=>{p.clientSecret='';});saving=false;$('saveSettings').disabled=false;
   for(const input of $('loginSettings').querySelectorAll('input'))input.disabled=false;
  }
 };
 window.addEventListener('pagehide',clearSecrets);
 if(!window.NWAdminAccess||!window.NWUI){$('adminStatus').textContent='관리자 로그인 화면을 불러오지 못했어요. 새로고침 후 다시 시도해주세요.';return;}
 window.NWAdminAccess.initialize({load,status:$('adminStatus'),body:$('adminBody'),retry:$('adminRetry')});
})();
