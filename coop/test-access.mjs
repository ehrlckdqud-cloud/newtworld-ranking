import {siteHeaders,claimSiteSession} from './site-session.mjs?v=72';
let password='';
export const testHeaders=()=>({...siteHeaders(),...(password?{'X-NW-Test-Password':password}:{})});
export function requestTestAccess(member){return new Promise(resolve=>{
 const dialog=document.getElementById('testAccessDialog'),form=document.getElementById('testAccessForm'),input=document.getElementById('testPassword'),error=document.getElementById('testAccessError'),button=document.getElementById('testAccessSubmit');
 dialog.addEventListener('cancel',e=>e.preventDefault());dialog.showModal();input.focus();
 form.onsubmit=async e=>{e.preventDefault();button.disabled=true;error.textContent='입장 확인 중…';
 try{await claimSiteSession(member);const r=await fetch('https://newtworld-ms3-coop-5p.pluckypeach517.chatgpt.site/api/test-access',{method:'POST',headers:{'content-type':'application/json','X-NW-Test-Password':input.value,...siteHeaders()},body:JSON.stringify({member})});const data=await r.json();if(!r.ok){const messages={TEST_PASSWORD_REQUIRED:'비밀번호가 맞지 않습니다.',TEST_ACCESS_RATE_LIMIT:'시도 횟수를 초과했습니다. 잠시 후 다시 입력해주세요.',NEWTWORLD_LOGIN_REQUIRED:'회원식별을 다시 확인해주세요.',SITE_SESSION_REQUIRED:'접속 정보가 전달되지 않았습니다.',SITE_SESSION_EXPIRED:'접속 정보가 만료되었습니다. 게임 탭을 닫고 다시 접속해주세요.',MEMBER_ALREADY_ONLINE:'같은 회원의 다른 게임 접속이 남아 있습니다. 다른 게임 탭을 닫아주세요.',MEMBER_VERIFICATION_UNAVAILABLE:'회원식별 서버가 응답하지 않았습니다. 잠시 후 다시 시도해주세요.',TEST_ACCESS_UNAVAILABLE:'서버의 테스트 입장 설정을 확인할 수 없습니다.'};throw Error((messages[data.error]||'입장 확인 요청이 거절되었습니다.')+` [${r.status} / ${data.error||'UNKNOWN_ERROR'} / v62]`);}password=input.value;input.value='';dialog.close();resolve();}
 catch(e){error.textContent=e.message;input.select();}finally{button.disabled=false;}
 };
});}
