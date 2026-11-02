import {siteHeaders} from './site-session.mjs?v=82';
// Membership and site-session validation remain server-side. No staff password
// is sent by the public client. The relay must deploy the matching public gate.
export const testHeaders = () => siteHeaders();
export async function requestTestAccess(member) {
 const response = await fetch('https://newtworld-ms3-coop-5p.pluckypeach517.chatgpt.site/api/test-access', {
  method:'POST', headers:{'content-type':'application/json', ...siteHeaders()},
  body:JSON.stringify({member}), signal:AbortSignal.timeout(15000)
 });
 const data = await response.json();
 if (!response.ok) {
  if (['TEST_PASSWORD_REQUIRED','TEST_ACCESS_UNAVAILABLE'].includes(data.error)) throw Error('MEMBER_RELEASE_PENDING');
  throw Error(data.error || 'MEMBER_ACCESS_DENIED');
 }
}
