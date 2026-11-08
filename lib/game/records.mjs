import {ProtocolError} from './room.mjs';
export async function ensureRecords(db){await db.prepare('CREATE TABLE IF NOT EXISTS game_records (run_id TEXT NOT NULL, member_id TEXT NOT NULL, name TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, star INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL, PRIMARY KEY(run_id,member_id))').run();}
export function beginRecord(n){n.recordRun=crypto.randomUUID();n.recordMission=-1;n.recordValid=true;for(const p of n.room.players){p.recordMask=0;p.recordEntered=false;p.recordScore=0;}}
export function observeRecord(n,m){
 if(!n.recordRun||m.mission===undefined)return;
 if(!Number.isInteger(m.mission)||m.mission<0||m.mission>5||m.players.some(p=>!Number.isSafeInteger(p.score)||p.score<0||p.score>99999999))throw new ProtocolError('INVALID_RECORD');
 if(m.completed&&m.mission!==5)throw new ProtocolError('INVALID_RECORD');
 const eligible=p=>p.started&&!p.away&&!p.departed&&['active','continue','selecting'].includes(p.state);
 for(const p of n.room.players)if(p.recordEntered&&!eligible(p))p.recordEntered=false;
 const before=n.recordMission,next=m.mission,changed=before!==next;
 if(changed){if(next!==before+1)n.recordValid=false;for(const p of n.room.players){if(before>=0&&before<5&&p.recordEntered&&eligible(p))p.recordMask|=1<<before;p.recordEntered=next<5&&eligible(p);}n.recordMission=next;}
 const awarded=[];n.recordWrites=[];
 n.room.players.forEach((p,i)=>{const score=Math.max(p.recordScore||0,p.started?m.players[i].score:0),star=!!(m.completed&&!n.completed&&n.recordValid&&next===5&&p.recordMask===31&&eligible(p));if(score>(p.recordScore||0)||star){p.recordScore=score;n.recordWrites.push({member:p.memberId,name:p.name,score,star:star?1:0});}if(star)awarded.push({slot:p.slot,name:p.name});});
 if(awarded.length)n.room.emit('completion-stars',{players:awarded,runId:n.recordRun});
}
export function recordCommit(db,r,n,rev,nonce,now){return (n.recordWrites||[]).map(p=>db.prepare('INSERT INTO game_records (run_id,member_id,name,score,star,updated) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM game_rooms WHERE id=? AND revision=? AND nonce=?) ON CONFLICT(run_id,member_id) DO UPDATE SET name=excluded.name,score=MAX(game_records.score,excluded.score),star=MAX(game_records.star,excluded.star),updated=excluded.updated').bind(n.recordRun,p.member,p.name,p.score,p.star,now,r.id,rev,nonce));}
export async function rankings(db,member,sort='stars'){
 const order=sort==='score'?'best_score DESC,stars DESC':'stars DESC,best_score DESC';
 const rows=await db.prepare(`SELECT member_id,(SELECT name FROM game_records latest WHERE latest.member_id=g.member_id ORDER BY updated DESC LIMIT 1) AS name,SUM(star) AS stars,MAX(score) AS best_score FROM game_records g GROUP BY member_id HAVING SUM(star)>0 OR MAX(score)>0 ORDER BY ${order},member_id LIMIT 100`).all();
 const mine=await db.prepare('SELECT SUM(star) AS stars,MAX(score) AS best_score FROM game_records WHERE member_id=?').bind(member).first();
 return {rows:rows.results.map(({member_id,...p},i)=>({...p,rank:i+1,self:member_id===member})),mine:{stars:mine?.stars||0,best_score:mine?.best_score||0}};
}
export async function roomRecords(db,players){const members=players.filter(p=>p.memberId);if(!members.length)return [];const rows=await db.prepare(`SELECT member_id,SUM(star) AS stars,MAX(score) AS best_score FROM game_records WHERE member_id IN (${members.map(()=>'?').join(',')}) GROUP BY member_id`).bind(...members.map(p=>p.memberId)).all();return members.map(p=>{const r=rows.results.find(v=>v.member_id===p.memberId);return {slot:p.slot,stars:r?.stars||0,best_score:r?.best_score||0};});}
