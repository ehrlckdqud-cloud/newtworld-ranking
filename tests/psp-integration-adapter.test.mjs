import test from 'node:test';
import assert from 'node:assert/strict';
import {createPspAdapter} from '../server/psp-integration-adapter.mjs';

function setup(){
 let time=1700000000000;
 const debits=new Map();
 const deps={
  secret:'this-is-a-test-secret-with-at-least-32-characters',
  now:()=>time,
  authenticate:async ({token,device})=>token==='valid'&&device==='browser'?{id:'user42'}:null,
  authorize:async()=>{},
  chargeOnce:async ({userId,game,launch,cost})=>{
   const key=[userId,game,launch].join(':');
   if(!debits.has(key))debits.set(key,{approved:true,cost});
   return debits.get(key);
  },
  readEntitlement:async ({userId,game,launch})=>debits.has([userId,game,launch].join(':'))?{state:'paid',cost:500}:null
 };
 return {adapter:createPspAdapter(deps),advance:(ms)=>time+=ms,debits};
}
const member={token:'valid',device:'browser'};
test('short-lived PSP access ticket is signed, expires and binds member',async()=>{
 const {adapter,advance}=setup();
 const manifest=await adapter.packageManifest({member,game:'mslug6'});
 assert.equal(manifest.game,'mslug6');
 const ticket=manifest.url.split('/').at(-1);
 assert.equal((await adapter.resolveTicket(ticket,member)).user.id,'user42');
 await assert.rejects(()=>adapter.resolveTicket(ticket.slice(0,-2)+'xx',member),/INVALID_TICKET/);
 await assert.rejects(()=>adapter.resolveTicket(ticket,{token:'invalid',device:'browser'}),/AUTH_REQUIRED/);
 advance(121000);
 await assert.rejects(()=>adapter.resolveTicket(ticket,member),/EXPIRED_TICKET/);
});
test('500-gem charge returns exact ID and stable receipt for repeated launch',async()=>{
 const {adapter,debits}=setup();
 const req={member,game:'mslug6',launch:'test-launch-01'};
 assert.deepEqual(await adapter.arcadeEntry(req),{ok:true,game:'mslug6',launch:'test-launch-01',cost:500});
 assert.deepEqual(await adapter.arcadeEntry(req),{ok:true,game:'mslug6',launch:'test-launch-01',cost:500});
 assert.equal(debits.size,1);
 assert.equal((await adapter.chargeStatus(req)).state,'paid');
 await assert.rejects(()=>adapter.arcadeEntry({...req,game:'mslug5'}),/UNSUPPORTED_GAME/);
});
test('incorrect auth and invalid launch are rejected before billing',async()=>{
 const {adapter,debits}=setup();
 await assert.rejects(()=>adapter.arcadeEntry({member:{token:'wrong',device:'browser'},game:'mslug6',launch:'test-launch-01'}),/AUTH_REQUIRED/);
 await assert.rejects(()=>adapter.arcadeEntry({member,game:'mslug6',launch:'x'}),/INVALID_LAUNCH/);
 assert.equal(debits.size,0);
});
