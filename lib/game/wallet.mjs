// Durable member credits, independent of room expiry. All debits join the room CAS transaction.
export async function ensureWalletSchema(db){
 await db.prepare('CREATE TABLE IF NOT EXISTS game_wallets (member_id TEXT PRIMARY KEY, balance INTEGER NOT NULL DEFAULT 0 CHECK(balance>=0), revision INTEGER NOT NULL DEFAULT 0)').run();
 await db.prepare('CREATE TABLE IF NOT EXISTS game_coin_ledger (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, delta INTEGER NOT NULL, nonce TEXT NOT NULL, created INTEGER NOT NULL)').run();
}
export async function wallet(db,member){
 if(!member)throw Error('MEMBER_REQUIRED');
 const existing=await db.prepare('SELECT balance,revision FROM game_wallets WHERE member_id=?').bind(member).first();if(existing)return existing;
 await db.prepare('INSERT OR IGNORE INTO game_wallets (member_id,balance,revision) VALUES (?,0,0)').bind(member).run();
 return db.prepare('SELECT balance,revision FROM game_wallets WHERE member_id=?').bind(member).first();
}
export async function grant(db,member,id,amount,now){
 await wallet(db,member);const nonce=crypto.randomUUID();
 await db.batch([
 db.prepare('INSERT OR IGNORE INTO game_coin_ledger (id,member_id,delta,nonce,created) VALUES (?,?,?,?,?)').bind(id,member,amount,nonce,now),
 db.prepare('UPDATE game_wallets SET balance=balance+?,revision=revision+1 WHERE member_id=? AND EXISTS (SELECT 1 FROM game_coin_ledger WHERE id=? AND nonce=?)').bind(amount,member,id,nonce)
 ]);return wallet(db,member);
}
export async function migrateLegacy(db,now){
 const rows=await db.prepare('SELECT id,state FROM game_rooms').all();
 for(const row of rows.results){const saved=JSON.parse(row.state).room;if(saved.walletVersion===1)continue;
  for(const p of saved.players||[])if(p.memberId&&Number.isSafeInteger(p.credits)&&p.credits>0)await grant(db,p.memberId,'legacy:'+row.id+':'+p.slot,p.credits,now);
 }
}
export async function hydrateWallets(db,r){
 r.walletBefore=new Map();
 const members=[...new Set(r.players.map(p=>p.memberId).filter(Boolean))];if(!members.length)return;
 const rows=await db.prepare('SELECT member_id,balance,revision FROM game_wallets WHERE member_id IN ('+members.map(()=>'?').join(',')+')').bind(...members).all();const balances=new Map(rows.results.map(w=>[w.member_id,w]));
 for(const p of r.players){if(!p.memberId)continue;const w=balances.get(p.memberId)||await wallet(db,p.memberId);p.credits=w.balance;p.creditsRevision=w.revision;r.walletBefore.set(p.memberId,w);}
}
export function walletCommit(db,r,nonce,rev,now){
 const changes=[];
 for(const [member,before] of r.walletBefore||[]){const p=r.players.find(p=>p.memberId===member);if(!p)continue;const delta=p.credits-before.balance;if(delta)changes.push({member,before,delta});}
 const conditions=changes.map(()=> ' AND EXISTS (SELECT 1 FROM game_wallets WHERE member_id=? AND revision=? AND balance>=?)').join('');
 const values=changes.flatMap(c=>[c.member,c.before.revision,Math.max(0,-c.delta)]);
 const writes=[];
 for(const c of changes){const id=r.id+':'+rev+':'+c.member;
  writes.push(db.prepare('UPDATE game_wallets SET balance=balance+?,revision=revision+1 WHERE member_id=? AND EXISTS (SELECT 1 FROM game_rooms WHERE id=? AND revision=? AND nonce=?)').bind(c.delta,c.member,r.id,rev,nonce));
  writes.push(db.prepare('INSERT INTO game_coin_ledger (id,member_id,delta,nonce,created) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM game_rooms WHERE id=? AND revision=? AND nonce=?)').bind(id,c.member,c.delta,nonce,now,r.id,rev,nonce));
 }
 return {conditions,values,writes};
}
