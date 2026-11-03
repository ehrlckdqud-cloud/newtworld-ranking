import {siteHeaders} from './site-session.mjs?v=98';
// Keep the shared request header API for existing room, wallet and game clients.
export const testHeaders=()=>siteHeaders();
// Compatibility for an older entry module: validate membership without a password dialog.
export async function requestTestAccess(member){
 const response=await fetch('https://newtworld-ms3-coop-5p.ehrlckdqud.chatgpt.site/api/test-access',{method:'POST',headers:{'content-type':'application/json',...siteHeaders()},body:JSON.stringify({member})});
 const data=await response.json();if(!response.ok||data.ok!==true)throw Error(data.error||'NEWTWORLD_LOGIN_REQUIRED');
}
