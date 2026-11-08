import inventory from './psp-assets.json' with {type:'json'};
const publish='/psp6/publish/',runtime='/arcade-runtime/mslug6/';
const hex=bytes=>Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
const fromHex=value=>Uint8Array.from(value.match(/../g)||[],s=>parseInt(s,16));
const encoder=new TextEncoder();
const error=(s,message)=>new Response(message,{status:s,headers:{'cache-control':'no-store'}});
async function authorized(request,env,name,spec){
 const exp=Number(request.headers.get('x-nw-expires')),now=Math.floor(Date.now()/1000);
 const signature=request.headers.get('x-nw-asset-proof')||'';
 const secret=spec.private?env.NW_PSP6_TITLE_UPLOAD_KEY:env.NW_PSP6_MASTER;
 if(!secret||!Number.isSafeInteger(exp)||exp<now||exp>now+900||!/^([0-9a-f]{2}){32}$/.test(signature))return false;
 const material=Uint8Array.from(atob(secret),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('raw',material,{name:'HMAC',hash:'SHA-256'},false,['verify']);
 return crypto.subtle.verify('HMAC',key,fromHex(signature),encoder.encode(['publish:mslug6:v1',name,spec.sha,exp].join('\n')));
}
export async function pspAssets(request,env){
 const url=new URL(request.url),upload=url.pathname.startsWith(publish);
 const name=url.pathname.slice((upload?publish:runtime).length);
 if(!Object.hasOwn(inventory,name))return error(404,'NOT_FOUND');
 const spec=inventory[name],bucket=env.PSP_ASSETS,object='mslug6/v1/'+spec.sha;
 if(!upload&&spec.private)return error(404,'NOT_FOUND');
 if(!upload&&spec.bundled){
  if(!['GET','HEAD'].includes(request.method))return error(405,'METHOD_NOT_ALLOWED');
  const asset=await env.ASSETS.fetch(request);
  if(!asset.ok)return error(503,'PACKAGE_NOT_READY');
  const headers=new Headers(asset.headers);
  headers.set('content-type',spec.type);headers.set('cross-origin-resource-policy','same-origin');headers.set('x-content-type-options','nosniff');
  return new Response(asset.body,{status:asset.status,headers});
 }
 if(!bucket)return error(503,'STORAGE_UNAVAILABLE');
 if(upload){
  if(request.method!=='PUT')return error(405,'METHOD_NOT_ALLOWED');
  if(!await authorized(request,env,name,spec))return error(403,'UPLOAD_REJECTED');
  if(Number(request.headers.get('content-length'))!==spec.bytes)return error(400,'INVALID_SIZE');
  if(await bucket.head(object))return new Response(null,{status:204});
  const data=await request.arrayBuffer();
  if(data.byteLength!==spec.bytes||hex(await crypto.subtle.digest('SHA-256',data))!==spec.sha)return error(400,'DIGEST_MISMATCH');
  await bucket.put(object,data,{httpMetadata:{contentType:spec.type}});
  return new Response(null,{status:201});
 }
 if(!['GET','HEAD'].includes(request.method))return error(405,'METHOD_NOT_ALLOWED');
 const result=request.method==='HEAD'?await bucket.head(object):await bucket.get(object);
 if(!result)return error(503,'PACKAGE_NOT_READY');
 return new Response(result.body??null,{headers:{'content-type':spec.type,'content-length':String(spec.bytes),'etag':'"'+spec.sha+'"','cache-control':name.startsWith('data/')?'public, max-age=31536000, immutable':'public, max-age=3600','cross-origin-resource-policy':'same-origin','x-content-type-options':'nosniff'}});
}
