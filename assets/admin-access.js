(function(){
 'use strict';
 async function login(password){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(password));
  password='';
  const hash=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
  const url=new URL(window.NW_CONFIG.appScriptUrl);
  if(url.protocol!=='https:'||url.hostname!=='script.google.com')throw Error('서버 주소 오류');
  return new Promise((resolve,reject)=>{
   const callback='nwAdminLogin_'+crypto.randomUUID().replace(/-/g,''),script=document.createElement('script');
   let done=false;
   function finish(error,result){if(done)return;done=true;clearTimeout(timer);script.remove();delete window[callback];if(error)reject(error);else resolve(result);}
   const timer=setTimeout(()=>finish(Error('로그인 응답이 지연됩니다. 다시 시도해주세요.')),30000);
   window[callback]=result=>finish(null,result);
   script.onerror=()=>finish(Error('로그인 서버에 연결하지 못했습니다. 다시 시도해주세요.'));
   script.referrerPolicy='no-referrer';
   url.search=new URLSearchParams({action:'adminLogin',hash,callback,_:Date.now()});
   script.src=url.href;document.head.append(script);
  });
 }
 function initialize({load,status,body,retry}){
  let busy=false;
  const authError=e=>e.message==='관리자 인증이 필요합니다.';
  async function run(){
   if(busy)return;busy=true;retry.hidden=true;body.hidden=true;
   status.textContent='관리자 확인 중…';
   try{
    let needsLogin=!sessionStorage.getItem('nwAdminToken');
    if(!needsLogin){
     try{await load();}catch(e){
      if(!authError(e))throw e;
      sessionStorage.removeItem('nwAdminToken');needsLogin=true;
     }
    }
    if(needsLogin){
     let password=await window.NWUI.password();
     if(password===null){status.textContent='관리자 로그인이 취소되었습니다. 아래 버튼으로 다시 로그인해주세요.';return;}
     status.textContent='로그인 확인 중…';
     const result=await login(password);password='';
     if(!result?.ok||!result.token)throw Error(result?.error||'로그인에 실패했습니다.');
     sessionStorage.setItem('nwAdminToken',result.token);
     await load();
    }
    body.hidden=false;status.textContent='관리자 인증 완료';
   }catch(e){
    if(authError(e))sessionStorage.removeItem('nwAdminToken');
    body.hidden=true;status.textContent=e.message;
   }finally{busy=false;retry.hidden=!body.hidden;}
  }
  retry.onclick=run;
  return run();
 }
 window.NWAdminAccess={initialize};
})();
