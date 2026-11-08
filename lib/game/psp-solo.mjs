import {siteSession} from './site-session.mjs';
import xxAssets from './pspxx-assets.json' with {type:'json'};
import xxManifest from './mslugxx-psp.json' with {type:'json'};
import sixAssets from './psp-assets.json' with {type:'json'};
import sixManifest from './mslug6-psp.json' with {type:'json'};
import {gateway, NEWTWORLD_ORIGIN} from './newtworld-gateway.mjs';

const price=500;

const charset=new TextEncoder();
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const decode=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const headers={'cache-control':'no-store','referrer-policy':'no-referrer','cross-origin-opener-policy':'same-origin','cross-origin-embedder-policy':'require-corp','x-content-type-options':'nosniff','x-frame-options':'DENY'};
const message=(error,status)=>Response.json({error},{status,headers});
async function derive(master,label){
 const key=await crypto.subtle.importKey('raw',decode(master),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return new Uint8Array(await crypto.subtle.sign('HMAC',key,charset.encode(label)));
}
async function sessionKey(master){
 return crypto.subtle.importKey('raw',await derive(master,'session:mslug6:v1'),'AES-GCM',false,['encrypt','decrypt']);
}
async function seal(master,session){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},await sessionKey(master),charset.encode(JSON.stringify(session)));
 return encode(iv)+'.'+encode(new Uint8Array(ciphertext));
}
async function open(master,value){
 const [iv,cipher]=value.split('.');
 const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv)},await sessionKey(master),decode(cipher));
 return JSON.parse(new TextDecoder().decode(raw));
}
function page(title,body,extra={}){
 return new Response('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><link rel="stylesheet" href="/arcade-runtime/mslug6/player.css?v=xx1"><body><main><h1>'+title+'</h1>'+body+'</main></body></html>',{headers:{...headers,'content-type':'text/html; charset=utf-8',...extra}});
}
function playerPage(session,game,title,extra={}){
 return page(title,'<section id="cabinet" data-game="'+game+'" data-launch="'+session.launch+'"><div id="screen" inert><div id="game"></div></div><p id="status" role="status">실행 환경 확인 중…</p><button id="start" disabled>게임 시작 · 500 뉴트젬</button><button id="fullscreen" hidden>전체화면</button><button id="exit">나가기</button><script type="module" src="/arcade-runtime/mslug6/player.mjs?v=dot2"></script></section>',extra);
}
export async function pspSolo(request,env,verify=gateway){
 const url=new URL(request.url),origin=request.headers.get('origin');
 const xx=url.pathname.startsWith('/pspxx/'),route=xx?'/pspxx/':'/psp6/';
 const game=xx?'mslugxx':'mslug6',title=xx?'메탈슬러그 XX':'메탈슬러그 6';
 const master=xx?env.NW_PSPXX_MASTER:env.NW_PSP6_MASTER,assets=xx?xxAssets:sixAssets,manifest=xx?xxManifest:sixManifest;
 if(!master)return message('PSP_SERVER_NOT_READY',503);
 async function memberRequest(path,session){
  const r=new Request(new URL(path,url),{method:'POST',headers:{'content-type':'application/json','user-agent':request.headers.get('user-agent')||'','sec-ch-ua-mobile':request.headers.get('sec-ch-ua-mobile')||'','x-nw-site-session':session.token,'x-nw-site-connection':session.connection},body:JSON.stringify({member:session.member,game,launch:session.launch})});
  return verify(r,env);
 }
 if(url.pathname===route){
  if(request.method==='GET')return page(title,'<p>뉴트월드 온라인게임의 03 혼자하기에서 입장해 주세요.</p>');
  if(request.method!=='POST'||origin!==NEWTWORLD_ORIGIN)return message('ORIGIN_REJECTED',403);
  if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))return message('INVALID_FORM',400);
  const body=await request.text();if(body.length>8192)return message('INVALID_FORM',400);
  const f=new URLSearchParams(body);
  const session={member:{token:f.get('memberToken'),device:f.get('device')},token:f.get('session'),connection:f.get('connection'),launch:crypto.randomUUID(),expires:Date.now()+30*60*1000};
  const verified=await memberRequest('/api/test-access',session);
  if(!verified.ok)return verified;
  if(f.get('handoff')==='1'){
   const nextConnection=crypto.randomUUID();
   try{await siteSession(env.DB,{action:'transfer',token:session.token,connection:session.connection,nextConnection});}
   catch{return message('SITE_SESSION_EXPIRED',409);}
   session.connection=nextConnection;session.sameTab=true;
  }
  const cookie='nw_psp_launch='+await seal(master,session)+'; HttpOnly; Secure; SameSite=Strict; Path='+route+'api/'+session.launch+'/; Max-Age=1800';
  return playerPage(session,game,title,{'set-cookie':cookie});
 }
 const match=/^\/(?:psp6|pspxx)\/api\/([a-f0-9-]{36})\/(player|package|title|charge|renew|leave)$/.exec(url.pathname);
 if(!match)return message('NOT_FOUND',404);
 if(match[2]==='player'){
  if(request.method!=='GET'||(origin&&origin!==url.origin))return message('ORIGIN_REJECTED',403);
 }else if(request.method!=='POST'||origin!==url.origin)return message('ORIGIN_REJECTED',403);
 const value=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('nw_psp_launch='))?.slice(14);
 let session;
 try{session=await open(master,value);if(session.launch!==match[1]||session.expires<Date.now())throw Error();}catch{return message('PSP_SESSION_EXPIRED',401);}
 if(match[2]==='leave'){
  if(session.sameTab)await siteSession(env.DB,{action:'release',token:session.token,connection:session.connection});
  return new Response(null,{status:204,headers});
 }
 const charge=match[2]==='charge';
 const result=await memberRequest(charge?'/api/arcade-entry':'/api/test-access',session);
 if(!result.ok||charge)return result;
 if(match[2]==='player')return playerPage(session,game,title);
 const bootState=assets['private/title.gz'];
 if(match[2]==='title'){
  const object=await env.PSP_ASSETS?.get(game+'/v1/'+bootState.sha);
  if(!object||object.size!==bootState.bytes)return message('PSP_TITLE_NOT_READY',503);
  return new Response(object.body,{headers:{...headers,'content-type':bootState.type,'content-length':String(bootState.bytes)}});
 }
 if(match[2]==='renew'){
  const renewed=new Headers(headers);
  if(session.expires-Date.now()<15*60*1000){
   session.expires=Date.now()+30*60*1000;
   renewed.set('set-cookie','nw_psp_launch='+await seal(master,session)+'; HttpOnly; Secure; SameSite=Strict; Path='+route+'api/'+session.launch+'/; Max-Age=1800');
  }
  return Response.json({ok:true},{headers:renewed});
 }
 return Response.json({...manifest,game,price,bootState:{sha:bootState.sha,bytes:bootState.bytes,rawBytes:bootState.rawBytes},key:encode(await derive(master,'package:'+game+':v1'))},{headers});
}
