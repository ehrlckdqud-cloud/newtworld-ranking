const base={urls:'stun:stun.l.google.com:19302'};
const cached=new Map();
export async function turnConfig(env,{room,slot,now=Date.now(),request=fetch}={}){
 if(env.CF_TURN_KEY_ID||env.CF_TURN_API_TOKEN){
  if(!/^[a-zA-Z0-9_-]{8,128}$/.test(env.CF_TURN_KEY_ID||'')||!env.CF_TURN_API_TOKEN)throw Error('TURN_CONFIG_INCOMPLETE');
  const key=`${env.CF_TURN_KEY_ID}:${room}:${slot}`,old=cached.get(key);
  if(request===fetch&&old&&old.until>now)return old.value;
  let response;try{response=await request(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.CF_TURN_KEY_ID}/credentials/generate-ice-servers`,{method:'POST',headers:{Authorization:'Bearer '+env.CF_TURN_API_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({ttl:86400}),signal:AbortSignal.timeout(10000)});}catch{throw Error('TURN_SERVICE_UNAVAILABLE');}
  if(!response.ok)throw Error(response.status===401||response.status===403?'TURN_CREDENTIAL_REJECTED':'TURN_SERVICE_UNAVAILABLE');
  let data;try{data=await response.json();}catch{throw Error('INVALID_TURN_RESPONSE');}
  const iceServers=[];for(const server of Array.isArray(data.iceServers)?data.iceServers:[]){const urls=(Array.isArray(server.urls)?server.urls:[server.urls]).filter(u=>typeof u==='string'&&/^(stun|turn|turns):[^\s]+$/.test(u)&&!/:53(?:\?|$)/.test(u));if(!urls.length)continue;if(urls.some(u=>/^turns?:/.test(u))&&(!server.username||!server.credential))continue;iceServers.push({urls,...(server.username?{username:server.username,credential:server.credential}:{})});}
  for(const s of iceServers)if(s.username&&s.credential&&s.urls.some(u=>/^turns?:turn\.cloudflare\.com(?::|$)/.test(u))&&!s.urls.includes('turns:turn.cloudflare.com:443?transport=tcp'))s.urls.push('turns:turn.cloudflare.com:443?transport=tcp');
  if(!iceServers.some(s=>s.urls.some(u=>/^turns?:/.test(u))))throw Error('INVALID_TURN_RESPONSE');
  const value={iceServers,relayConfigured:true,relayProvider:'cloudflare',credentialsExpireAt:now+86400000};
  if(request===fetch){if(cached.size>500)cached.clear();cached.set(key,{value,until:now+3600000});}return value;
 }
 if(env.TURN_URLS&&env.TURN_SECRET){const urls=env.TURN_URLS.split(',').map(s=>s.trim());if(urls.some(s=>!/^turns?:[^\s]+$/.test(s)))throw Error('INVALID_TURN_CONFIG');const username=Math.floor(now/1000+86400)+':'+room+':'+slot,key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.TURN_SECRET),{name:'HMAC',hash:'SHA-1'},false,['sign']),signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(username));return {iceServers:[base,{urls,username,credential:btoa(String.fromCharCode(...new Uint8Array(signature)))}],relayConfigured:true,relayProvider:'coturn',credentialsExpireAt:now+86400000};}
 return {iceServers:[base],relayConfigured:false,relayProvider:null};
}
