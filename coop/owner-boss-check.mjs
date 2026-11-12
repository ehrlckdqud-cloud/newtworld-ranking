const profileEndpoint='https://script.google.com/macros/s/AKfycbx3ksT0dBFpJELZPolxhi2GsrzHEMdkrd4xqerH33IdeImOPWsXV4BKDLAxEb2XliD-eg/exec';
const expectedHash='f41962b55bdd187c0e523a0cf161cbcda669193a23d24e30c7e1a2b8050d4756';
export function verifyOwner(member){
 return new Promise((resolve,reject)=>{
  const callback='nwBossOwner'+crypto.randomUUID().replaceAll('-','');
  const tag=document.createElement('script');
  const timer=setTimeout(()=>finish(false),24000);
  function finish(ok){
   clearTimeout(timer);tag.remove();delete window[callback];
   if(ok)resolve();else reject(Error('방장 계정 확인이 필요합니다.'));
  }
  window[callback]=data=>finish(data?.ok===true&&data.auth===true&&data.profile?.role==='방장');
  const url=new URL(profileEndpoint);
  url.search=new URLSearchParams({action:'profileCore',token:member.token,device:member.device,callback});
  tag.referrerPolicy='no-referrer';tag.src=url.href;tag.onerror=()=>finish(false);document.head.append(tag);
 });
}
export function selectCheckpoint(dialog,close,signal){
 return new Promise((resolve,reject)=>{
  const label=document.createElement('label'),input=document.createElement('input');
  label.textContent='최종 보스 저장 파일 ';input.type='file';input.accept='.nwstate';label.append(input);close.parentElement.before(label);
  const cancel=()=>{label.remove();reject(Error('저장 지점 선택이 취소되었습니다.'));};
  signal.addEventListener('abort',cancel,{once:true});
  input.onchange=async()=>{
   const file=input.files[0];if(!file)return;
   try{
    if(file.size!==415155)throw Error('메탈슬러그 2 전용 저장 파일을 선택하세요.');
    const bytes=new Uint8Array(await file.arrayBuffer());
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
    if(hash!==expectedHash)throw Error('저장 파일이 일치하지 않습니다.');
    label.remove();signal.removeEventListener('abort',cancel);resolve(bytes);
   }catch(error){dialog.querySelector('[data-status]').textContent=error.message;input.value='';}
  };
 });
}
