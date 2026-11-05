/* Personal MP3 files stay on this device; only committed transactions count as saved. */
(function(){
 'use strict';
 let connection;
 function open(){return connection||(connection=new Promise((resolve,reject)=>{
  const request=indexedDB.open('nw-personal-music',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('tracks',{keyPath:'id'});
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();connection=null;};resolve(db);};
  request.onerror=()=>{connection=null;reject(request.error);};
  request.onblocked=()=>{connection=null;reject(new Error('다른 뉴트월드 창을 닫고 다시 시도해주세요.'));};
 }));}
 async function transact(mode,action){const db=await open();return new Promise((resolve,reject)=>{
  const tx=db.transaction('tracks',mode);let result;
  try{const request=action(tx.objectStore('tracks'));request.onsuccess=()=>{result=request.result;};}catch(error){reject(error);return;}
  tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(tx.error||new Error('기기 저장에 실패했습니다.'));
 });}
 window.NWLocalMusic={
  list:()=>transact('readonly',store=>store.getAll()),
  save:record=>transact('readwrite',store=>store.put(record)),
  remove:id=>{if(!String(id).startsWith('local-'))return Promise.reject(new Error('기본곡은 삭제할 수 없습니다.'));return transact('readwrite',store=>store.delete(id));},
  keep:()=>{try{return navigator.storage?.persist?.().catch(()=>false);}catch{return Promise.resolve(false);}},
  hydrate:record=>({...record,file:undefined,coverBlob:undefined,audio:URL.createObjectURL(record.file),cover:record.coverBlob?URL.createObjectURL(record.coverBlob):'',builtin:false}),
  release:track=>{for(const key of ['audio','cover'])if(String(track[key]||'').startsWith('blob:'))URL.revokeObjectURL(track[key]);}
 };
})();
