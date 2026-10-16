/* v2.89: bounded, session-scoped detail photo cache shared with same-origin frames. */
(function(global){
 'use strict';
 try{if(global.parent!==global&&global.parent.NWMemberAvatar){global.NWMemberAvatar=global.parent.NWMemberAvatar;global.NWMemberAvatar.setEndpoint(global.NW_CONFIG&&global.NW_CONFIG.appScriptUrl);return;}}catch(_){}
 const key='nwMemberAvatarsV289',ttl=86400000,limit=24,memory=new Map(),pending=new Map();
 let endpoint='',scope='';
 function identity(){try{return{token:localStorage.getItem('nwProfileToken')||'',device:localStorage.getItem('nwProfileDevice')||''};}catch(_){return{token:'',device:''};}}
 function current(){const a=identity(),next=a.token+'|'+a.device;if(next!==scope){memory.clear();scope=next;}return a;}
 function validRef(ref){return /^nw-avatar:[a-f0-9-]{36}$/i.test(String(ref||''));}
 function validSrc(src){return typeof src==='string'&&src.length<44000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(src);}
 function entries(a){try{const data=JSON.parse(localStorage.getItem(key)||'null');return data&&data.token===a.token&&data.device===a.device&&Array.isArray(data.items)?data.items.filter(v=>v&&validRef(v.ref)&&validSrc(v.src)&&Date.now()-v.at>=0&&Date.now()-v.at<ttl).slice(0,limit):[];}catch(_){return[];}}
 function save(a,items){try{localStorage.setItem(key,JSON.stringify({token:a.token,device:a.device,items:items.slice(0,limit)}));}catch(_){} }
 function get(id,ref){
  const a=current();if(!a.token||!a.device)return'';id=String(id);const match=v=>v&&(!ref||v.ref===ref)&&validSrc(v.src)&&Date.now()-v.at>=0&&Date.now()-v.at<ttl;
  let item=memory.get(id);if(!match(item))item=entries(a).find(v=>v.id===id&&match(v));
  if(item){memory.set(id,item);return item.src;}
  if(ref)try{const own=JSON.parse(localStorage.getItem('nwOwnAvatarV274')||sessionStorage.getItem('nwOwnAvatarV274')||'null');if(own&&own.token===a.token&&own.device===a.device&&own.ref===ref&&validSrc(own.src)){put(id,ref,own.src);return own.src;}}catch(_){}
  return'';
 }
 function peek(id){const src=get(id);const item=memory.get(String(id));return src&&item?{ref:item.ref,src}:null;}
 function put(id,ref,src){const a=current();if(!a.token||!a.device||!validRef(ref)||!validSrc(src))return;id=String(id);const item={id,ref,src,at:Date.now()};memory.delete(id);memory.set(id,item);while(memory.size>limit)memory.delete(memory.keys().next().value);save(a,[item,...entries(a).filter(v=>v.id!==id)]);}
 function remove(id){const a=current();memory.delete(String(id));save(a,entries(a).filter(v=>v.id!==String(id)));}
 function clear(){memory.clear();try{localStorage.removeItem(key);}catch(_){} }
 function setEndpoint(value){if(typeof value==='string'&&/^https:\/\//i.test(value))endpoint=value;}
 function prefetch(id,ref=''){
  const a=current();id=String(id||'');const hit=get(id,ref);if(hit)return Promise.resolve({ok:true,imageUrl:ref||memory.get(id)?.ref,src:hit,cached:true});
  const app=endpoint||(global.NW_CONFIG&&global.NW_CONFIG.appScriptUrl)||'';
  if(!id||!a.token||!a.device||!app)return Promise.resolve({ok:false});
  const requestKey=a.token+'|'+a.device+'|'+id;
  if(pending.has(requestKey))return pending.get(requestKey);
  const started=Date.now();
  const request=new Promise(resolve=>{
   const name='nwPhoto_'+Date.now()+'_'+Math.random().toString(36).slice(2),script=document.createElement('script');let done=false,timer=0;
   function finish(data){if(done)return;done=true;clearTimeout(timer);script.remove();global[name]=function(){};setTimeout(()=>{delete global[name]},60000);
    const live=identity();if(live.token!==a.token||live.device!==a.device){resolve({ok:false});return;}
    if(data?.auth===false)clear();
    if(data?.ok&&validRef(data.imageUrl)&&validSrc(data.src)){const newer=memory.get(id);if(!newer||newer.at<=started||newer.ref===data.imageUrl)put(id,data.imageUrl,data.src);}
    else if(data?.ok&&!data.src){const newer=memory.get(id);if(!newer||newer.at<=started)remove(id);}
    resolve(data||{ok:false});
   }
   global[name]=finish;script.async=true;script.onerror=()=>finish({ok:false});
   script.src=app+(app.includes('?')?'&':'?')+new URLSearchParams({action:'memberAvatar',token:a.token,device:a.device,memberId:id,full:'1',...(ref?{ref}:{}),callback:name,_:Date.now()});
   timer=setTimeout(()=>finish({ok:false}),20000);document.head.appendChild(script);
  });
  pending.set(requestKey,request);request.finally(()=>{if(pending.get(requestKey)===request)pending.delete(requestKey);});return request;
 }
 global.NWMemberAvatar={get,peek,put,remove,clear,prefetch,validSrc,setEndpoint};
 setEndpoint(global.NW_CONFIG&&global.NW_CONFIG.appScriptUrl);
})(window);
