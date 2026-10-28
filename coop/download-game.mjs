const API='https://newtworld-ms3-coop-5p.pluckypeach517.chatgpt.site';
const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export async function downloadGame({member,headers={},onProgress=()=>{},fetcher=fetch}){
 const response=await fetcher(API+'/api/game-package',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify({member})});
 if(!response.ok)throw Error(response.status===403?'테스트 비밀번호를 다시 확인해주세요.':'설치 정보를 받지 못했습니다. 잠시 후 다시 시도해주세요.');
 const manifest=await response.json();if(manifest.id!=='mslug3-v1'||!Number.isSafeInteger(manifest.bytes)||manifest.bytes<1||manifest.bytes>80*1024*1024||!Array.isArray(manifest.parts)||!manifest.parts.length||manifest.parts.length>64||!/^[a-f0-9]{64}$/.test(manifest.sha256))throw Error('설치 정보가 올바르지 않습니다.');
 const key=await crypto.subtle.importKey('raw',decode(manifest.key),{name:'AES-GCM'},false,['decrypt']);
 const data=new Uint8Array(manifest.bytes);let offset=0;onProgress(0);
 for(const part of manifest.parts){
  if(!/^\/game-packages\/mslug3-v1\/part-\d{2}\.bin$/.test(part.path)||!Number.isSafeInteger(part.bytes)||part.bytes<17||part.bytes>3*1024*1024)throw Error('설치 파일 정보가 올바르지 않습니다.');
  const r=await fetcher(API+part.path);if(!r.ok)throw Error('게임 다운로드에 실패했습니다. 설치를 다시 눌러주세요.');
  const encrypted=await r.arrayBuffer();if(encrypted.byteLength!==part.bytes)throw Error('다운로드가 끝나지 않았습니다. 다시 설치해주세요.');
  const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(part.iv)},key,encrypted);if(offset+decrypted.byteLength>data.length)throw Error('설치 크기 검증에 실패했습니다.');data.set(new Uint8Array(decrypted),offset);offset+=decrypted.byteLength;onProgress(offset/data.length);
 }
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(offset!==manifest.bytes||hash!==manifest.sha256)throw Error('설치 파일 검증에 실패했습니다. 다시 설치해주세요.');
 return data.buffer;
}
