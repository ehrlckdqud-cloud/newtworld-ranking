import {registerSocialMember} from './social.mjs';
// One live browser connection per verified member. Conditional writes serialize claims.
export const SESSION_TTL=90000;
const initialized=new WeakMap();
const digest=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(v=>v.toString(16).padStart(2,'0')).join('');
export async function siteSession(db,{action,token,connection,nextConnection,memberId,nickname,now=Date.now()}){
 if(!db)throw Error('DATABASE_NOT_READY');
 if(!/^[a-zA-Z0-9-]{32,100}$/.test(token||'')||!/^[a-zA-Z0-9-]{32,100}$/.test(connection||''))throw Error('SITE_SESSION_REQUIRED');
 if(!initialized.has(db))initialized.set(db,db.prepare('CREATE TABLE IF NOT EXISTS game_site_sessions (member_id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, connection TEXT NOT NULL, expires INTEGER NOT NULL)').run().catch(e=>{initialized.delete(db);throw e;}));await initialized.get(db);
 const hash=await digest(token);
 if(action==='claim'){
  if(!memberId)throw Error('NEWTWORLD_LOGIN_REQUIRED');
  await db.prepare('INSERT INTO game_site_sessions (member_id,token,connection,expires) VALUES (?,?,?,?) ON CONFLICT(member_id) DO UPDATE SET token=excluded.token,connection=excluded.connection,expires=excluded.expires WHERE game_site_sessions.token=excluded.token OR game_site_sessions.expires<=?').bind(memberId,hash,connection,now+SESSION_TTL,now).run();
  const row=await db.prepare('SELECT member_id,connection,expires FROM game_site_sessions WHERE member_id=? AND token=?').bind(memberId,hash).first();
  if(!row||row.connection!==connection)throw Error('MEMBER_ALREADY_ONLINE');
  if(nickname)await registerSocialMember(db,row.member_id,nickname);
  return {memberId:row.member_id,expires:row.expires};
 }
 if(action==='transfer'){
  if(!/^[a-zA-Z0-9-]{32,100}$/.test(nextConnection||''))throw Error('SITE_SESSION_REQUIRED');
  const updated=await db.prepare('UPDATE game_site_sessions SET connection=?,expires=? WHERE token=? AND connection=? AND expires>?').bind(nextConnection,now+SESSION_TTL,hash,connection,now).run();
  if(!updated.meta.changes)throw Error('SITE_SESSION_EXPIRED');
  return {ok:true};
 }
 if(action==='release'){
  await db.prepare('DELETE FROM game_site_sessions WHERE token=? AND connection=?').bind(hash,connection).run();return {ok:true};
 }
 const row=await db.prepare('SELECT member_id,expires FROM game_site_sessions WHERE token=? AND connection=? AND expires>?').bind(hash,connection,now).first();
 if(!row||(memberId&&memberId!==row.member_id))throw Error('SITE_SESSION_EXPIRED');
 if(row.expires-now>60000)return {memberId:row.member_id,expires:row.expires};
 const updated=await db.prepare('UPDATE game_site_sessions SET expires=? WHERE token=? AND connection=? AND expires>?').bind(now+SESSION_TTL,hash,connection,now).run();
 if(!updated.meta.changes)throw Error('SITE_SESSION_EXPIRED');return {memberId:row.member_id,expires:now+SESSION_TTL};
}
