(()=>{
 const section=document.getElementById('featureSettings'),admin=document.getElementById('adminBody');
 const buttons=Array.from(section.querySelectorAll('[data-switch]'));
 const status=section.querySelector('[role=status]'),retry=section.querySelector('[data-retry]');
 let flags;
 async function update(feature){
  buttons.forEach(button=>button.disabled=true);
  retry.hidden=true;
  status.textContent=feature?'저장 중…':'설정을 확인하고 있어요.';
  try{
   const result=feature?await NWContent.call('contentServiceFeatureSet',{feature,enabled:!flags[feature]}):await NWContent.call('contentServiceFeatures');
   if(!result.ok||typeof result.login!=='boolean'||typeof result.ai!=='boolean')throw Error(result.error||'운영 설정을 확인하지 못했어요.');
   flags=result;
   for(const button of buttons){
    const key=button.dataset.switch,on=flags[key];
    button.textContent=on?'켜짐 · 끄기':'꺼짐 · 켜기';
    button.setAttribute('aria-label',(key==='ai'?'AI비서':'간편 로그인')+(on?' 끄기':' 켜기'));
    button.disabled=false;
   }
   status.textContent=feature?'저장했습니다.':'';
  }catch(error){status.textContent=error.message;retry.hidden=false;}
 }
 buttons.forEach(button=>button.onclick=()=>update(button.dataset.switch));
 retry.onclick=()=>update();
 if(!admin.hidden){update();return;}
 const observer=new MutationObserver(()=>{if(!admin.hidden){observer.disconnect();update();}});
 observer.observe(admin,{attributes:true,attributeFilter:['hidden']});
})();
