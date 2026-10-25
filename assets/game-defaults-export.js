(function(){
 const names=['nw-draw-music-v1','nw-draw-visuals-v1','nw-draw-stickers-v1'];
 function open(name){return new Promise((resolve,reject)=>{const r=indexedDB.open(name);r.onupgradeneeded=()=>{r.transaction.abort();resolve(null);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>r.error?.name==='AbortError'?resolve(null):reject(r.error);r.onblocked=()=>reject(Error('게임을 닫고 다시 시도해주세요.'));});}
 async function serialize(value){
  if(value instanceof Blob){const bytes=new Uint8Array(await value.arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return{__type:'Blob',mime:value.type,base64:btoa(text)};}
  if(value instanceof Date)return{__type:'Date',value:value.toISOString()};
  if(Array.isArray(value))return Promise.all(value.map(serialize));
  if(value&&typeof value==='object'){const out={};for(const [k,v]of Object.entries(value))out[k]=await serialize(v);return out;}
  return value;
 }
 async function exportSettings(){
  const databases=[];
  for(const name of names){
   const db=await open(name);if(!db)continue;const stores=[];
   try{for(const store of Array.from(db.objectStoreNames)){
    const rows=await new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly'),s=tx.objectStore(store),keys=s.getAllKeys(),values=s.getAll();tx.oncomplete=()=>resolve({name:store,keyPath:s.keyPath,keys:keys.result,values:values.result});tx.onerror=()=>reject(tx.error);});
    stores.push(await serialize(rows));
   }databases.push({name,version:db.version,stores});}finally{db.close();}
  }
  if(!databases.some(d=>d.stores.some(s=>s.values.length)))throw Error('저장된 설정이 없어요. 음악·배경·스티커를 설정한 브라우저에서 실행해주세요.');
  const data={format:'newtworld-game-defaults',version:1,createdAt:new Date().toISOString(),databases,preferences:{'nw-space-music-v52':localStorage.getItem('nw-space-music-v52')}};
  let blob=new Blob([JSON.stringify(data)],{type:'application/json'}),suffix='.json';
  if(typeof CompressionStream==='function'){blob=await new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))).blob();suffix='.json.gz';}
  const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='newtworld-game-defaults'+suffix;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);return databases.length;
 }
 window.NWGameDefaultsExport={exportSettings};
 const button=document.getElementById('nwExportGameDefaults');
 if(button)button.onclick=async()=>{if(button.disabled)return;button.disabled=true;button.textContent='원본 파일과 배치를 묶는 중…';try{await exportSettings();button.textContent='저장 완료 · 내려받은 파일을 전달해주세요';}catch(e){button.textContent=e.message||'내보내기에 실패했습니다.';}finally{button.disabled=false;}};
})();