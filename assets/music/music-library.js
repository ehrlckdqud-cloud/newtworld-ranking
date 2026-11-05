(function(){
 'use strict';
 const $=id=>document.getElementById(id),cache=new Map(),covers=new Map();
 function read(action,params={}){return new Promise((resolve,reject)=>{
  const app=window.NW_CONFIG?.appScriptUrl;if(!app){reject(Error('서버 설정을 불러오지 못했습니다.'));return;}
  const cb='nwml_'+crypto.randomUUID().replace(/-/g,''),script=document.createElement('script');let timer,done=false;
  function finish(data){if(done)return;done=true;clearTimeout(timer);script.remove();window[cb]=()=>{};setTimeout(()=>delete window[cb],60000);data?.ok?resolve(data):reject(Object.assign(Error(data?.error||'서버 연결이 지연됩니다. 다시 시도해주세요.'),{code:data?.code}));}
  window[cb]=finish;script.onerror=()=>finish(null);timer=setTimeout(()=>finish(null),60000);
  script.src=app+(app.includes('?')?'&':'?')+new URLSearchParams({action,callback:cb,...params});document.head.appendChild(script);
 });}
 let authPending=null;
 window.NWEnsureMusicAdmin=function(force=false){
  if(authPending)return authPending;
  authPending=(async()=>{
   const token=sessionStorage.getItem('nwAdminToken')||'';
   if(token&&!force){try{await read('musicAdminSession',{token});return token;}catch(e){if(e.code!=='ADMIN_EXPIRED')throw e;}}
   sessionStorage.removeItem('nwAdminToken');
   if(!window.NWUI?.password)throw Error('관리자 인증 창을 불러오지 못했습니다. 새로고침해주세요.');
   const password=await window.NWUI.password();if(!password)throw Error('인증을 취소했습니다. 입력한 곡 정보는 유지됩니다.');
   const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(password));
   const hash=[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
   const result=await read('adminLogin',{hash});sessionStorage.setItem('nwAdminToken',result.token);return result.token;
  })().finally(()=>{authPending=null;});return authPending;
 };
 window.NWResolveMusicCover=track=>{
  if(!track.coverFile)return Promise.resolve(track.cover||'');
  if(!covers.has(track.id))covers.set(track.id,read('musicCover',{id:track.id}).then(d=>URL.createObjectURL(new Blob([Uint8Array.from(atob(d.base64),c=>c.charCodeAt(0))],{type:d.mime}))).catch(e=>{covers.delete(track.id);throw e;}));
  return covers.get(track.id);
 };
 window.NWResolveMusicAudio=track=>{
  if(!track.audioFile)return Promise.resolve(track.audio);
  if(!cache.has(track.id))cache.set(track.id,read('musicAudio',{id:track.id}).then(d=>{
   const bytes=Uint8Array.from(atob(d.base64),c=>c.charCodeAt(0));return URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'}));
  }).catch(e=>{cache.delete(track.id);throw e;}));
  return cache.get(track.id);
 };
 function post(payload){return new Promise((resolve,reject)=>{
  const nonce=crypto.randomUUID(),frame=document.createElement('iframe'),form=document.createElement('form'),input=document.createElement('input');
  frame.name='nwml_'+nonce;frame.hidden=true;form.hidden=true;form.method='POST';form.action=window.NW_CONFIG.appScriptUrl;form.target=frame.name;
  input.name='payload';input.value=JSON.stringify({...payload,nonce});form.append(input);
  const timer=setTimeout(()=>finish(null),120000);
  function finish(result){clearTimeout(timer);window.removeEventListener('message',receive);form.remove();frame.remove();result?.ok?resolve(result):reject(Object.assign(Error(result?.error||'저장 응답이 지연됩니다. 같은 내용으로 다시 눌러 등록 여부를 확인해주세요.'),{code:result?.code}));}
  function receive(e){if(!/^https:\/\/(?:script\.google\.com|[a-z0-9-]+\.googleusercontent\.com)$/.test(e.origin)||e.data?.channel!=='nw-music-library'||e.data.nonce!==nonce)return;finish(e.data.result);}
  window.addEventListener('message',receive);document.body.append(frame,form);form.submit();
 });}
 function base64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error('파일을 읽지 못했습니다.'));reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(file);});}
 async function prepareCover(blob){
  if(!blob)return '';
  if(blob.size>10*1024*1024)throw Error('커버 이미지는 10MB 이하로 선택해주세요.');
  const url=URL.createObjectURL(blob),img=new Image();
  try{
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('이미지 파일을 읽지 못했습니다. JPG·PNG·WebP 파일을 선택해주세요.'));img.src=url;});
   const scale=Math.min(1,1024/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
   for(const quality of [.88,.75,.6,.4,.25]){const value=canvas.toDataURL('image/jpeg',quality).split(',')[1];if(value.length<=660000)return value;}
   throw Error('커버 이미지 용량이 큽니다. 더 작은 이미지를 선택해주세요.');
  }finally{URL.revokeObjectURL(url);}
 }
 async function init(){
  const api=window.NWMusicAdminAPI;if(!api||$('nwMusicAddForm'))return;
  const box=document.createElement('details');box.id='nwMusicAddForm';box.style.cssText='margin:14px 0;padding:12px;border:1px solid #294656;border-radius:12px';
  box.innerHTML=`<summary style="cursor:pointer;color:#8ce2bd;font-weight:700">＋ 플레이어 기본 곡 추가</summary>
   <p style="font-size:11px;color:#8eb1be">MP3를 선택하면 파일에 저장된 곡명·가수·가사·커버를 자동으로 읽습니다. 없는 정보는 직접 입력하거나 업로드해주세요. 등록한 곡은 모든 회원의 기본 목록에 표시됩니다.</p>
   <label>MP3 파일 (최대 8MB)<input id="nwMusicFile" type="file" accept=".mp3,audio/mpeg"></label>
   <label>곡명 *<input id="nwMusicTitle" maxlength="150"></label>
   <label>가수<input id="nwMusicArtist" maxlength="150"></label>
   <label>커버 이미지 업로드 (선택 · JPG/PNG/WebP)<input id="nwMusicCover" type="file" accept="image/jpeg,image/png,image/webp"></label>
   <img id="nwMusicCoverPreview" alt="선택한 곡 커버 미리보기" hidden style="max-width:160px;max-height:160px;object-fit:contain;border-radius:10px">
   <button id="nwMusicCoverClear" type="button">커버 제거</button>
   <label>가사 (선택 · 한 줄씩 입력)<textarea id="nwMusicLyrics" rows="6" maxlength="12000"></textarea></label>
   <button id="nwMusicAddSave" type="button">기본 곡 등록</button><p id="nwMusicAddStatus" role="status" aria-live="polite" style="font-size:12px"></p>`;
  box.querySelectorAll('label').forEach(el=>el.style.cssText='display:block;font-size:11px;margin:9px 0');
  box.querySelectorAll('input,textarea').forEach(el=>el.style.cssText='display:block;width:100%;min-width:0;box-sizing:border-box;margin-top:4px;background:#0d1923;color:#eff8ff;border:1px solid #294656;border-radius:8px;padding:9px');
  $('nwSyncTrack').after(box);
  let requestId='music-'+crypto.randomUUID(),coverBase64='',busy=false;
  const status=$('nwMusicAddStatus');
  function setBusy(value){busy=value;box.querySelectorAll('input,textarea,button').forEach(el=>el.disabled=value);}
  function showCover(value){coverBase64=value;const img=$('nwMusicCoverPreview');img.hidden=!value;if(value)img.src='data:image/jpeg;base64,'+value;else img.removeAttribute('src');}
  box.addEventListener('input',()=>{requestId='music-'+crypto.randomUUID();});
  $('nwMusicFile').onchange=async()=>{
   const f=$('nwMusicFile').files[0];if(!f)return;
   if(!/\.mp3$/i.test(f.name)||f.size>8*1024*1024){status.textContent='8MB 이하의 MP3 파일을 선택해주세요.';return;}
   setBusy(true);status.textContent='MP3 정보를 읽는 중…';
   try{
    const meta=window.NWMusicMetadata.parse(await f.arrayBuffer(),f.name);
    $('nwMusicTitle').value=meta.title.slice(0,150);$('nwMusicArtist').value=meta.artist.slice(0,150);$('nwMusicLyrics').value=meta.lyrics.slice(0,12000);
    $('nwMusicCover').value='';showCover('');
    if(meta.cover){try{showCover(await prepareCover(meta.cover));}catch(e){status.textContent='곡 정보는 불러왔지만 커버를 읽지 못했습니다. 이미지 파일을 직접 선택해주세요.';return;}}
    status.textContent='곡 정보를 불러왔습니다. '+(!meta.artist||!meta.cover||!meta.lyrics?'MP3에 없는 정보는 직접 입력하거나 업로드해주세요.':'필요하면 수정한 후 등록해주세요.');
   }catch(e){status.textContent=e.message||'MP3 정보를 읽지 못했습니다. 정보를 직접 입력해주세요.';}finally{setBusy(false);}
  };
  $('nwMusicCover').onchange=async()=>{
   const file=$('nwMusicCover').files[0];if(!file)return;
   setBusy(true);status.textContent='커버 이미지를 준비하는 중…';
   try{showCover(await prepareCover(file));status.textContent='선택한 이미지로 커버를 교체했습니다.';}catch(e){$('nwMusicCover').value='';status.textContent=e.message;}finally{setBusy(false);}
  };
  $('nwMusicCoverClear').onclick=()=>{showCover('');$('nwMusicCover').value='';requestId='music-'+crypto.randomUUID();};
  function addTrack(t){const old=api.tracks.find(x=>x.id===t.id);if(!old)api.tracks.push(t);api.populateSelect();window.dispatchEvent(new Event('nw-music-library-updated'));}
  $('nwMusicAddSave').onclick=async()=>{
   if(busy)return;
   const file=$('nwMusicFile').files[0],title=$('nwMusicTitle').value.trim();
   if(!title||!file){status.textContent='곡명과 MP3 파일을 입력해주세요.';return;}
   if(!/\.mp3$/i.test(file.name)||file.size>8*1024*1024){status.textContent='8MB 이하의 MP3 파일을 선택해주세요.';return;}
   setBusy(true);status.textContent='관리자 인증을 확인하는 중…';
   try{
    const token=await window.NWEnsureMusicAdmin();status.textContent='기본 곡을 저장하는 중…';
    const payload={action:'musicLibraryAdd',token,id:requestId,title,artist:$('nwMusicArtist').value.trim(),lyrics:$('nwMusicLyrics').value,base64:await base64(file),coverBase64};
    let d;try{d=await post(payload);}catch(e){if(e.code!=='ADMIN_EXPIRED')throw e;status.textContent='인증이 만료되어 다시 확인합니다. 입력한 정보는 유지됩니다.';payload.token=await window.NWEnsureMusicAdmin(true);d=await post(payload);}
    cache.set(d.track.id,Promise.resolve(URL.createObjectURL(file)));
    if(coverBase64)covers.set(d.track.id,Promise.resolve('data:image/jpeg;base64,'+coverBase64));
    addTrack(d.track);const i=api.tracks.findIndex(t=>t.id===d.track.id);api.setTrack(i,false);
    $('nwSyncTrack').value=String(i);$('nwSyncTrack').dispatchEvent(new Event('change'));
    box.querySelectorAll('input,textarea').forEach(el=>el.value='');showCover('');requestId='music-'+crypto.randomUUID();
    status.textContent='등록 완료! 새로 방문하거나 새로고침한 회원의 기본 목록에 표시됩니다. 가사 싱크를 맞춘 후 전체 적용 저장을 눌러주세요.';
   }catch(e){status.textContent=e.message;}finally{setBusy(false);}
  };
  async function load(){
   if(busy)return;
   try{const d=await read('musicLibraryGet');d.tracks.forEach(addTrack);
    const sync=await read('syncGet');api.tracks.filter(t=>t.shared).forEach(t=>{const times=sync.sync?.[t.id];if(Array.isArray(times))t.syncedLyrics.forEach((line,i)=>{if(Number.isFinite(Number(times[i])))line.time=Number(times[i]);});});
    api.renderLyrics(api.current());api.syncLyrics();
    if(!busy&&!$('nwMusicFile').files.length)status.textContent='추가 기본 곡 '+d.tracks.length+'곡을 불러왔습니다.';
   }catch(e){if(!busy&&!$('nwMusicFile').files.length)status.textContent='공통 곡 목록을 불러오지 못했습니다. '+e.message;}
  }
  const retry=document.createElement('button');retry.type='button';retry.textContent='기본 곡 목록 다시 불러오기';retry.onclick=load;box.append(retry);await load();
 }
 function ready(){Promise.resolve(window.NWConfigReady).then(init);}
 if(window.NWMusicAdminAPI)ready();else window.addEventListener('nw-music-ready',ready,{once:true});
})();
