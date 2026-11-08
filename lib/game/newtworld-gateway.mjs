import {admitArcade} from './arcade-entry.mjs';
import {social} from './social.mjs';
import {siteSession} from './site-session.mjs';
import {arcadePackages} from './arcade-packages.mjs';
import {relay} from './relay.mjs';
export const NEWTWORLD_ORIGIN='https://ehrlckdqud-cloud.github.io';
const PROFILE='https://script.google.com/macros/s/REPLACE_WITH_DEPLOYMENT_ID/exec';
const identities=new Map();
const error=(error,status)=>new Response(JSON.stringify({error}),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function gateway(request,env,{verifyFetch=fetch,runRelay=relay,sessionGate=siteSession}={}){
 const origin=request.headers.get('origin'),url=new URL(request.url);
 const cors=r=>{const headers=new Headers(r.headers);headers.set('Vary','Origin');if(origin===NEWTWORLD_ORIGIN){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Headers','Content-Type, Authorization, X-NW-Test-Password, X-NW-Site-Session, X-NW-Site-Connection');headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');headers.set('Access-Control-Max-Age','600');}return new Response(r.body,{status:r.status,headers});};
 if(origin&&origin!==NEWTWORLD_ORIGIN&&origin!==url.origin)return error('ORIGIN_REJECTED',403);
 if(request.method==='OPTIONS')return cors(new Response(null,{status:204}));
 const sitePath=url.pathname==='/api/site-session';
 const sessionArgs={token:request.headers.get('x-nw-site-session'),connection:request.headers.get('x-nw-site-connection')};
 let siteMemberId;
 if(url.pathname!=='/health'&&!sitePath){try{siteMemberId=(await sessionGate(env.DB,{...sessionArgs,action:'renew'})).memberId;}catch(e){return cors(error(e.message,409));}}
 if(url.pathname==='/api/social')return cors(await social(request,env.DB,siteMemberId));
 if(sitePath&&request.method==='POST'){let data;try{data=await request.clone().json();}catch{return cors(error('INVALID_JSON',400));}
  if(['renew','release'].includes(data.action)){try{return cors(Response.json({ok:true,...await sessionGate(env.DB,{...sessionArgs,action:data.action})}));}catch(e){return cors(error(e.message,409));}}
  if(data.action!=='claim')return cors(error('INVALID_ACTION',400));
 }
 const entering=request.method==='POST'&&(['/api/site-session','/api/rooms','/api/lobby','/api/rankings','/api/test-access','/api/game-package','/api/arcade-entry','/api/wallet','/api/gems'].includes(url.pathname)||/^\/api\/rooms\/[a-f0-9]{16}\/(join|coin)$/.test(url.pathname));
 if(entering){
  const ua=request.headers.get('user-agent')||'';if(/android|iphone|ipad|ipod|mobile/i.test(ua)||request.headers.get('sec-ch-ua-mobile')==='?1')return cors(error('PC_ONLY',403));
  let data;try{const text=await request.text();if(text.length>65536)return cors(error('BODY_TOO_LARGE',413));data=JSON.parse(text);}catch{return cors(error('INVALID_JSON',400));}
  const member=data?.member;
  if(!member||typeof member.token!=='string'||typeof member.device!=='string'||!member.token||!member.device||member.token.length>1024||member.device.length>256)return cors(error('NEWTWORLD_LOGIN_REQUIRED',401));
  const cacheKey=member.token+':'+member.device,cached=verifyFetch===fetch?identities.get(cacheKey):null;let identity=url.pathname!=='/api/gems'&&cached?.until>Date.now()?cached.value:null;try{
   if(!identity){
   const endpoint=new URL(PROFILE);endpoint.search=new URLSearchParams({action:'profileData',token:member.token,device:member.device,callback:'nwCoopAuth'});
   const response=await verifyFetch(endpoint,{signal:AbortSignal.timeout(15000),redirect:'follow'});if(!response.ok)throw Error();
   const raw=(await response.text()).trim();const match=/^nwCoopAuth\(([\s\S]*)\);?$/.exec(raw);identity=JSON.parse(match?match[1]:raw);if(identity?.ok&&identity.auth===true){if(identities.size>2000)identities.clear();identities.set(cacheKey,{value:identity,until:Date.now()+120000});}
   }
  }catch{return cors(error('MEMBER_VERIFICATION_UNAVAILABLE',503));}
  if(!identity?.ok||identity.auth!==true||!identity.profile?.memberId||!identity.profile?.nickname)return cors(error('NEWTWORLD_LOGIN_REQUIRED',401));
  if(sitePath){try{return cors(Response.json({ok:true,...await sessionGate(env.DB,{...sessionArgs,action:'claim',memberId:identity.profile.memberId,nickname:identity.profile.nickname})}));}catch(e){return cors(error(e.message,409));}}
  if(siteMemberId!==identity.profile.memberId)return cors(error('SITE_SESSION_EXPIRED',409));
  if(url.pathname==='/api/arcade-entry'){
   try{
    const result=await admitArcade({token:member.token,device:member.device},data.game,data.launch,verifyFetch);
    return cors(Response.json(result,{status:result.ok?200:400}));
   }catch{return cors(error('입장 결과를 확인하지 못했습니다. 같은 화면에서 다시 시도해주세요.',503));}
  }
  if(url.pathname==='/api/gems')return cors(Response.json({balance:Number.isFinite(identity.profile.gemBalance)?identity.profile.gemBalance:null}));
  if(url.pathname==='/api/game-package'){
   const pkg=arcadePackages.get(data.game??'mslug3');
   if(!pkg)return cors(error('UNKNOWN_GAME',400));
   const {manifest,keyName}=pkg,key=env[keyName];
   if(!key)return cors(error('GAME_PACKAGE_UNAVAILABLE',503));
   return cors(Response.json({...manifest,key},{headers:{'cache-control':'no-store'}}));
  }
  if(url.pathname==='/api/test-access')return cors(new Response(JSON.stringify({ok:true,name:identity.profile.nickname}),{headers:{'content-type':'application/json','cache-control':'no-store'}}));
  const billingMember={...member,memberId:identity.profile.memberId};delete data.member;data.memberId=identity.profile.memberId;data.staffRole=['방장','부방장','운영진'].includes(identity.profile.role)?identity.profile.role:null;data.gradeScore=Math.max(0,Number(identity.profile.lifetimeScore)||0);data.name=String(identity.profile.nickname).slice(0,20);
  request=new Request(url,{method:'POST',headers:{'content-type':'application/json','authorization':request.headers.get('authorization')||''},body:JSON.stringify(data)});
  if(url.pathname.endsWith('/coin'))return cors(await runRelay(request,env,{billingMember,siteMemberId}));
 }else if(origin===NEWTWORLD_ORIGIN){const headers=new Headers(request.headers);headers.delete('origin');headers.delete('x-nw-test-password');request=new Request(request,{headers});}
 return cors(await runRelay(request,env,{siteMemberId}));
}
