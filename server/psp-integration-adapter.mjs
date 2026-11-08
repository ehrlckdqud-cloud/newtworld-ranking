// Integration adapter, NOT the live Sites game server.
// The application must supply atomic billing and authenticated streaming adapters.
// No secret keys, ISO bytes, or real money/gem balances are stored here.
import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';

export const GAME='mslug6', COST=500;
const encoder=new TextEncoder();
const asBase64Url=value=>Buffer.from(value).toString('base64url');
function verifyId(value){if(typeof value!=='string'||!/^[-a-zA-Z0-9_]{8,100}$/.test(value))throw Error('INVALID_LAUNCH');return value;}
function verifyMember(member){if(!member||typeof member.token!=='string'||!member.token||typeof member.device!=='string'||!member.device)throw Error('INVALID_MEMBER');}
function verifyGame(game){if(game!==GAME)throw Error('UNSUPPORTED_GAME');}
function requireFn(value,name){if(typeof value!=='function')throw Error('Missing server adapter: '+name);}
function mac(secret,payload){return createHmac('sha256',secret).update(payload).digest('base64url');}
export function createPspAdapter({authenticate,authorize,chargeOnce,readEntitlement,secret,now=()=>Date.now(),ticketSeconds=120}){
 for(const [name,fn] of Object.entries({authenticate,authorize,chargeOnce,readEntitlement}))requireFn(fn,name);
 if(typeof secret!=='string'||Buffer.byteLength(secret)<32)throw Error('PSP_TICKET_SECRET must be at least 32 bytes');
 if(!Number.isInteger(ticketSeconds)||ticketSeconds<15||ticketSeconds>600)throw Error('INVALID_TICKET_TTL');

 async function account(member){
   verifyMember(member);
   const user=await authenticate(member);
   if(!user?.id)throw Error('AUTH_REQUIRED');
   await authorize(user,GAME);
   return user;
 }
 async function packageManifest({member,game}){
   verifyGame(game);
   const user=await account(member);
   // A manifest is not a proof of payment, and never contains raw ISO bytes.
   // Requesting it may validate access and file availability via authorize().
   const expires=now()+ticketSeconds*1000;
   const payload=asBase64Url(JSON.stringify({game,userId:String(user.id),exp:expires,nonce:randomUUID()}));
   const signature=mac(secret,payload);
   return {game,url:'/api/psp-package/stream/'+payload+'.'+signature,expires};
 }
 async function resolveTicket(ticket,member){
   verifyMember(member);
   if(typeof ticket!=='string'||ticket.length>2048)throw Error('INVALID_TICKET');
   const pieces=ticket.split('.');
   if(pieces.length!==2)throw Error('INVALID_TICKET');
   const [payload,signature]=pieces;
   if(!/^[a-zA-Z0-9_-]+$/.test(payload)||!/^[a-zA-Z0-9_-]+$/.test(signature))throw Error('INVALID_TICKET');
   const expected=mac(secret,payload);
   const a=Buffer.from(signature,'utf8'),b=Buffer.from(expected,'utf8');
   if(a.length!==b.length||!timingSafeEqual(a,b))throw Error('INVALID_TICKET');
   let detail;
   try{detail=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));}catch{throw Error('INVALID_TICKET');}
   if(detail.game!==GAME||!Number.isSafeInteger(detail.exp)||now()>=detail.exp)throw Error('EXPIRED_TICKET');
   const user=await account(member);
   if(String(user.id)!==detail.userId)throw Error('TICKET_MEMBER_MISMATCH');
   // Resolve a stream only AFTER authentication. Never redirect blindly to public files.
   return {user,game:GAME,expires:detail.exp};
 }
 async function arcadeEntry({member,game,launch}){
   verifyGame(game);
   verifyId(launch);
   const user=await account(member);
   // chargeOnce MUST atomically enforce unique (user.id,game,launch), balance>=500,
   // a single ledger debit and the exact recorded response on retries.
   // This module CANNOT guarantee it unless the host implementation does so.
   const result=await chargeOnce({userId:String(user.id),game:GAME,launch,cost:COST});
   if(result?.approved!==true)throw Error(result?.error||'PAYMENT_REJECTED');
   return {ok:true,game:GAME,launch,cost:COST};
 }
 async function chargeStatus({member,game,launch}){
   verifyGame(game);verifyId(launch);
   const user=await account(member);
   const receipt=await readEntitlement({userId:String(user.id),game:GAME,launch});
   return {game:GAME,launch,state:receipt?.state??'unknown',cost:receipt?.cost??null};
 }
 return {packageManifest,resolveTicket,arcadeEntry,chargeStatus};
}
