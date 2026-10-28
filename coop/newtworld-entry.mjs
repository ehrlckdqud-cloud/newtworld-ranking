const form=document.getElementById('joinForm');
for(const element of form.elements)element.disabled=true;
const token=localStorage.getItem('nwProfileToken'),device=localStorage.getItem('nwProfileDevice');
const status=document.getElementById('status');
try{
 if(!token||!device)throw Error('auth');
 const response=await new Promise((resolve,reject)=>{
  const script=document.createElement('script'),callback='nwCoopMemberCheck';
  const cleanup=()=>{clearTimeout(timer);script.remove();delete window[callback];};
  const timer=setTimeout(()=>{cleanup();reject(Error('timeout'));},15000);
  window[callback]=data=>{cleanup();resolve(data);};script.onerror=()=>{cleanup();reject(Error('network'));};
  script.src='https://script.google.com/macros/s/AKfycbx3ksT0dBFpJELZPolxhi2GsrzHEMdkrd4xqerH33IdeImOPWsXV4BKDLAxEb2XliD-eg/exec?'+new URLSearchParams({action:'profileData',token,device,callback});document.head.append(script);
 });
 if(!response?.ok||!response.auth||!response.profile?.nickname)throw Error('auth');
 document.getElementById('name').value=response.profile.nickname;
 if(typeof window.createMS3!=='function')throw Error('CORE_LOAD');
 await import('./play.mjs');
 for(const element of form.elements)element.disabled=false;
 status.textContent='회원 확인 완료 · 방을 만들거나 초대 코드로 입장하세요.';
}catch(error){status.textContent='회원 확인을 완료하지 못했습니다. 뉴트월드 회원식별 상태를 확인하고 새로고침해주세요.';document.getElementById('memberHelp').hidden=false;}
