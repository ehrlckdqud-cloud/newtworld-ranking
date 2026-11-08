const schemas=new WeakMap();
export async function socialSchema(db){
 if(!schemas.has(db))schemas.set(db,db.batch([
  'CREATE TABLE IF NOT EXISTS social_members(id TEXT PRIMARY KEY,name TEXT NOT NULL,notify INTEGER NOT NULL DEFAULT 1)',
  'CREATE TABLE IF NOT EXISTS social_friends(a TEXT NOT NULL,b TEXT NOT NULL,requester TEXT NOT NULL,accepted INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(a,b))',
  'CREATE TABLE IF NOT EXISTS social_messages(id INTEGER PRIMARY KEY AUTOINCREMENT,sender TEXT NOT NULL,recipient TEXT NOT NULL,body TEXT NOT NULL,stamp INTEGER NOT NULL,seen INTEGER NOT NULL DEFAULT 0,nonce TEXT NOT NULL,UNIQUE(sender,nonce))',
  'CREATE INDEX IF NOT EXISTS social_inbox ON social_messages(recipient,seen,id)',
  'CREATE INDEX IF NOT EXISTS social_thread ON social_messages(sender,recipient,id)'
 ].map(sql=>db.prepare(sql))).catch(e=>{schemas.delete(db);throw e;}));
 await schemas.get(db);
}
export async function registerSocialMember(db,id,name){
 await socialSchema(db);
 await db.prepare('INSERT INTO social_members(id,name) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name').bind(id,String(name).slice(0,60)).run();
}
export async function social(request,db,me,now=Date.now()){
 const reply=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
 if(!me)return reply({error:'회원 인증이 필요합니다.'},401);
 if(request.method!=='POST')return reply({error:'METHOD'},405);
 let m;try{m=await request.json();}catch{return reply({error:'INVALID_JSON'},400);}
 if(!m||typeof m!=='object')return reply({error:'INVALID_REQUEST'},400);
 await socialSchema(db);
 const stmt=(sql,...args)=>db.prepare(sql).bind(...args);
 if(m.action==='state'){
  const [people,pref]=await db.batch([stmt(`WITH peers AS (
    SELECT id FROM social_members WHERE id IN(SELECT member_id FROM game_site_sessions WHERE expires>?)
    UNION SELECT CASE WHEN a=? THEN b ELSE a END FROM social_friends WHERE a=? OR b=?
    UNION SELECT sender FROM social_messages WHERE recipient=?
    UNION SELECT recipient FROM social_messages WHERE sender=?
   ), unread AS (SELECT sender,count(*) AS n FROM social_messages WHERE recipient=? AND seen=0 GROUP BY sender)
   SELECT p.id,p.name,CASE WHEN s.expires>? THEN 1 ELSE 0 END online,
    CASE WHEN f.accepted=1 THEN 'friend' WHEN f.requester=? THEN 'sent' WHEN f.requester IS NOT NULL THEN 'received' ELSE '' END relation,
    coalesce(u.n,0) unread, EXISTS(SELECT 1 FROM social_messages WHERE (sender=? AND recipient=p.id) OR (recipient=? AND sender=p.id)) hasChat
   FROM peers JOIN social_members p ON p.id=peers.id LEFT JOIN game_site_sessions s ON s.member_id=p.id
   LEFT JOIN social_friends f ON f.a=min(p.id,?) AND f.b=max(p.id,?) LEFT JOIN unread u ON u.sender=p.id WHERE p.id<>?`,now,me,me,me,me,me,me,now,me,me,me,me,me,me),
   stmt('SELECT notify FROM social_members WHERE id=?',me)]);
  return reply({people:people.results,notify:!!pref.results[0]?.notify});
 }
 if(m.action==='notify'){if(typeof m.enabled!=='boolean')return reply({error:'INVALID_SETTING'},400);await stmt('UPDATE social_members SET notify=? WHERE id=?',+m.enabled,me).run();return reply({ok:true});}
 const to=m.to;if(typeof to!=='string'||to===me||!await stmt('SELECT id FROM social_members WHERE id=?',to).first())return reply({error:'회원을 찾을 수 없습니다.'},400);
 const [a,b]=[me,to].sort();
 if(m.action==='request'){await stmt('INSERT OR IGNORE INTO social_friends(a,b,requester) VALUES(?,?,?)',a,b,me).run();return reply({ok:true});}
 if(m.action==='accept'){await stmt('UPDATE social_friends SET accepted=1 WHERE a=? AND b=? AND requester=?',a,b,to).run();return reply({ok:true});}
 if(m.action==='remove'){await stmt('DELETE FROM social_friends WHERE a=? AND b=?',a,b).run();return reply({ok:true});}
 if(m.action==='thread'){
  const rows=(await stmt('SELECT id,sender,body,stamp FROM social_messages WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?) ORDER BY id DESC LIMIT 100',me,to,to,me).all()).results.reverse();
  return reply({messages:rows});
 }
 if(m.action==='read'&&Number.isSafeInteger(m.through)){await stmt('UPDATE social_messages SET seen=1 WHERE recipient=? AND sender=? AND id<=? AND seen=0',me,to,m.through).run();return reply({ok:true});}
 if(m.action==='send'){
  const body=typeof m.text==='string'?m.text.trim():'';
  if(!body||[...body].length>500||typeof m.nonce!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(m.nonce))return reply({error:'메시지는 1~500자로 입력해주세요.'},400);
  if(await stmt('SELECT id FROM social_messages WHERE sender=? AND nonce=?',me,m.nonce).first())return reply({ok:true});
  const result=await stmt(`INSERT OR IGNORE INTO social_messages(sender,recipient,body,stamp,nonce)
    SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM game_site_sessions WHERE member_id=? AND expires>?)
    AND (SELECT count(*) FROM social_messages WHERE sender=? AND stamp>?)<20`,me,to,body,now,m.nonce,to,now,me,now-10000).run();
  return result.meta.changes?reply({ok:true}):reply({error:'상대가 오프라인이거나 전송이 너무 빠릅니다.'},409);
 }
 return reply({error:'INVALID_ACTION'},400);
}
