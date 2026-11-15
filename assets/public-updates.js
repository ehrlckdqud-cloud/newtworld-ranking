function readNewtPublicUpdates(){
 return new Promise((resolve,reject)=>{
   const callback='nwUpdates_'+crypto.randomUUID().replace(/-/g,'');
   const script=document.createElement('script');
   const cleanup=()=>{clearTimeout(timer);delete window[callback];script.remove()};
   const fail=()=>{cleanup();reject(Error('업데이트 목록을 불러오지 못했어요.'))};
   const timer=setTimeout(fail,20000);
   window[callback]=result=>{if(!result.ok||!Array.isArray(result.items))return fail();cleanup();resolve(result.items)};
   script.onerror=fail;
   script.src=window.NW_CONFIG.appScriptUrl+'?'+new URLSearchParams({action:'publicUpdates',callback});
   document.head.append(script);
 });
}
