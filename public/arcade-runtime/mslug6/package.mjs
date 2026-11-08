const cacheName='newtworld-psp6-encrypted-v1';
async function unpack(response,chunk,key){
 if(!response.ok)throw Error('게임 파일을 받지 못했습니다.');
 const data=new Uint8Array(await response.arrayBuffer());
 if(data.length!==chunk.bytes)throw Error('게임 파일 길이가 올바르지 않습니다.');
 const compressed=await crypto.subtle.decrypt({name:'AES-GCM',iv:data.subarray(0,12)},key,data.subarray(12));
 const part=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).blob();
 if(part.size!==chunk.size)throw Error('게임 파일이 손상되었습니다.');
 return part;
}
export async function buildDisc(manifest,onProgress,signal,game='mslug6'){
 if(manifest.game!==game||manifest.price!==500||!manifest.chunks?.length)throw Error('게임 패키지를 확인할 수 없습니다.');
 const raw=Uint8Array.from(atob(manifest.key.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
 let cache;
 try{cache=await caches.open(game==='mslug6'?cacheName:'newtworld-pspxx-encrypted-v1');}catch{}
 let next=0,bytes=0;
 const parts=new Array(manifest.chunks.length);
 async function worker(){
  while(next<parts.length){
   signal.throwIfAborted();
   const index=next++,chunk=manifest.chunks[index];
   if(cache){
    try{const hit=await cache.match(chunk.path);if(hit)parts[index]=await unpack(hit,chunk,key);}
    catch{await cache.delete(chunk.path).catch(()=>{});}
   }
   if(!parts[index]){
    const response=await fetch(chunk.path,{signal:AbortSignal.any([signal,AbortSignal.timeout(60000)])});
    const copy=cache&&response.ok?response.clone():null;
    parts[index]=await unpack(response,chunk,key);
    if(copy)try{await cache.put(chunk.path,copy);}catch{cache=null;}
   }
   bytes+=parts[index].size;onProgress(Math.round(bytes*100/manifest.size));
  }
 }
 await Promise.all(Array.from({length:Math.min(4,parts.length)},worker));
 if(bytes!==manifest.size)throw Error('게임 데이터가 불완전합니다.');
 return URL.createObjectURL(new Blob(parts,{type:'application/octet-stream'}));
}
export async function loadCheckpoint(url,info,signal){
 const res=await fetch(url,{method:'POST',cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(35000)])});
 if(!res.ok)throw Error('타이틀 데이터를 받을 수 없습니다. 다시 준비해 주세요.');
 const compressed=new Uint8Array(await res.arrayBuffer());
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',compressed)),b=>b.toString(16).padStart(2,'0')).join('');
 if(digest!==info.sha||compressed.length!==info.bytes)throw Error('타이틀 데이터가 손상되었습니다.');
 const raw=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 if(raw.byteLength!==info.rawBytes)throw Error('타이틀 복원 크기를 확인할 수 없습니다.');
 return new Uint8Array(raw);
}
