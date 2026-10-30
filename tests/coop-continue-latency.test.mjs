import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {FiveSession} from '../coop/native/five-session.mjs';
function engine(count){const e=new FiveSession({_nw_fps:()=>60},{experiment:{}},{playerCount:count,characters:Array(count).fill(0),paid:true});e.phase='playing';e.frame=10;for(const p of e.players.slice(0,count))Object.assign(p,{state:'continue',deadline:610,continueLife:1});e.selectCharacter=(slot,character)=>Object.assign(e.players[slot-1],{state:'active',lives:3,character,deadline:null});return e;}
for(const count of [2,3,4,5])test(`${count} players: one J at 9 seconds protects deadline; signed grant revives in same application`,()=>{
 const replicas=Array.from({length:count},()=>engine(count));
 for(const e of replicas){e.continueInput([16,16,16,16,16],[0,0,0,0,0]);for(let i=0;i<600;i++){e.frame++;e.continueInput([0,0,0,0,0],[0,0,0,0,0]);}for(let slot=1;slot<=count;slot++){assert(e.players[slot-1].deadline>e.frame);assert.equal(e.players[slot-1].state,'continue');const frame=e.frame;assert.equal(e.quickContinue(slot,'grant-'+slot),true);assert.equal(e.frame,frame);assert.equal(e.players[slot-1].state,'active');assert.equal(e.players[slot-1].lives,3);assert.equal(e.quickContinue(slot,'grant-'+slot),false);}}
 assert(replicas.every(e=>JSON.stringify(e.checkpoint())===JSON.stringify(replicas[0].checkpoint())));
});
test('holding or pressing J again cannot extend pending protection forever',()=>{const e=engine(2);e.continueInput([16,0,0,0,0],[0,0,0,0,0]);const until=e.players[0].continueWaitUntil;for(let i=0;i<1500;i++){e.frame++;e.continueInput([i%2?16:0,0,0,0,0],[i%2?0:16,0,0,0,0]);}assert.equal(e.players[0].continueWaitUntil,until);assert(e.frame>e.players[0].deadline);});
test('failed request resumes countdown; late cancellation cannot affect a later life',()=>{const e=engine(2);e.continueInput([16,0,0,0,0],[0,0,0,0,0]);e.cancelContinueWait(1,0);assert(e.players[0].continueWaitUntil);e.cancelContinueWait(1,1);assert.equal(e.players[0].continueWaitUntil,null);const deadline=e.players[0].deadline;e.frame++;e.continueInput([16,0,0,0,0],[0,0,0,0,0]);assert.equal(e.players[0].deadline,deadline);});
test('a paid grant cannot revive an active player; caller can refund a rejected grant',()=>{const e=engine(2);e.players[0].state='active';assert.throws(()=>e.quickContinue(1,'bad'),/CONTINUE_EXPIRED/);assert.equal(e.approvedCredits.has('bad'),false);});
test('J sends immediate request once without first requesting a host state publication',async()=>{
 const source=readFileSync(new URL('../coop/play.mjs',import.meta.url),'utf8');let finish;const sent=[],controls=[];
 const c={commandBusy:false,continueInputPending:false,session:{slot:2},engine:engine(2),hostSlot:1,performance:{now:()=>1},note(){},act:message=>{sent.push(message);return new Promise(r=>finish=r);},requestContinue:send=>send(),hasGame:true,sendControl:m=>controls.push(m),diagnostics:{record(){}},roster:[],rosterRevision:0,resetGameInput(){}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('async function command('),source.indexOf('function render()')),c);
 const task=c.command('continue');await c.command('continue');assert.equal(sent.length,1);assert.equal(sent[0].immediate,true);assert.equal(controls.length,0);assert.equal(c.continueInputPending,true);finish({proof:{test:true},event:{id:1,commandId:1}});await task;assert.equal(controls[0].type,'command-proof');assert.equal(c.commandBusy,false);
});
