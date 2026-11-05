(function(){
 'use strict';
 const $=id=>document.getElementById(id),cache=new Map();
 function read(action,params={}){return new Promise((resolve,reject)=>{
  const app=window.NW_CONFIG?.appScriptUrl;if(!app){reject(Error('서버 설정을 불러오지 못했습니다.'));return;}
  const cb='nwml_'+crypto.randomUUID().replace(/-/g,''),script=document.createElement('script');let timer;
  function finish(data){clearTimeout(timer);script.remove();window[cb]=()=>{};setTimeout(()=>delete window[cb],60000);data?.ok?resolve(data):reject(Error(data?.error||'서버 연결이 지연됩니다. 다시 시도해주세요.'));}
  window[cb]=finish;script.onerror=()=>finish(null);timer=setTimeout(()=>finish(null),60000);
  script.src=app+(app.includes('?')?'&':'?')+new URLSearchParams({action,callback:cb,...params});document.head.appendChild(script);
 });}
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
  function finish(result){clearTimeout(timer);window.removeEventListener('message',receive);form.remove();frame.remove();result?.ok?resolve(result):reject(Error(result?.error||'저장 응답이 지연됩니다. 같은 내용으로 다시 눌러 등록 여부를 확인해주세요.'));}
  function receive(e){if(!/^https:\/\/(?:script\.google\.com|[a-z0-9-]+\.googleusercontent\.com)$/.test(e.origin)||e.data?.channel!=='nw-music-library'||e.data.nonce!==nonce)return;finish(e.data.result);}
  window.addEventListener('message',receive);document.body.append(frame,form);form.submit();
 });}
 function base64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error('파일을 읽지 못했습니다.'));reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(file);});}
 async function init(){
  const api=window.NWMusicAdminAPI;if(!api||$('nwMusicAddForm'))return;
  const box=document.createElement('details');box.id='nwMusicAddForm';box.style.cssText='margin:14px 0;padding:12px;border:1px solid #294656;border-radius:12px';
  box.innerHTML=`<summary style="cursor:pointer;color:#8ce2bd;font-weight:700">＋ 플레이어 기본 곡 추가</summary>
   <p style="font-size:11px;color:#8eb1be">등록한 곡은 모든 회원의 기본 목록에 표시됩니다. MP3 파일 또는 HTTPS 음악 주소 중 하나를 입력해주세요.</p>
   <label>MP3 파일 (최대 8MB)<input id="nwMusicFile" type="file" accept=".mp3,audio/mpeg"></label>
   <label>음악 주소<input id="nwMusicUrl" type="url" placeholder="https://…/song.mp3"></label>
   <label>곡명 *<input id="nwMusicTitle" maxlength="150"></label>
   <label>가수<input id="nwMusicArtist" maxlength="150"></label>
   <label>커버 이미지 주소 (선택)<input id="nwMusicCover" type="url" placeholder="https://…/cover.jpg"></label>
   <label>가사 (선택 · 한 줄씩 입력)<textarea id="nwMusicLyrics" rows="6" maxlength="12000"></textarea></label>
   <button id="nwMusicAddSave" type="button">기본 곡 등록</button><p id="nwMusicAddStatus" role="status" aria-live="polite" style="font-size:12px"></p>`;
  box.querySelectorAll('label').forEach(el=>el.style.cssText='display:block;font-size:11px;margin:9px 0');
  box.querySelectorAll('input,textarea').forEach(el=>el.style.cssText='display:block;width:100%;min-width:0;box-sizing:border-box;margin-top:4px;background:#0d1923;color:#eff8ff;border:1px solid #294656;border-radius:8px;padding:9px');
  $('nwSyncTrack').after(box);
  let requestId='music-'+crypto.randomUUID();
  box.addEventListener('input',()=>{requestId='music-'+crypto.randomUUID();});
  $('nwMusicFile').onchange=()=>{const f=$('nwMusicFile').files[0];if(f&&!$('nwMusicTitle').value)$('nwMusicTitle').value=f.name.replace(/\.mp3$/i,'');};
  function addTrack(t){const old=api.tracks.find(x=>x.id===t.id);if(!old)api.tracks.push(t);api.populateSelect();window.dispatchEvent(new Event('nw-music-library-updated'));}
  $('nwMusicAddSave').onclick=async()=>{
   const button=$('nwMusicAddSave'),status=$('nwMusicAddStatus');if(button.disabled)return;
   const token=sessionStorage.getItem('nwAdminToken');if(!token){status.textContent='관리자 로그인이 필요합니다.';return;}
   const file=$('nwMusicFile').files[0],title=$('nwMusicTitle').value.trim(),audio=$('nwMusicUrl').value.trim(),cover=$('nwMusicCover').value.trim();
   if(!title||(!file&&!audio)){status.textContent='곡명과 MP3 파일 또는 음악 주소를 입력해주세요.';return;}
   if(file&&audio){status.textContent='MP3 파일과 음악 주소 중 하나만 선택해주세요.';return;}
   if(file&&(!/\.mp3$/i.test(file.name)||file.size>8*1024*1024)){status.textContent='8MB 이하의 MP3 파일을 선택해주세요.';return;}
   if((audio&&!/^https:\/\//i.test(audio))||(cover&&!/^https:\/\//i.test(cover))){status.textContent='음악·커버 주소는 HTTPS 주소로 입력해주세요.';return;}
   button.disabled=true;status.textContent='기본 곡을 저장하는 중…';
   box.querySelectorAll('input,textarea').forEach(el=>el.disabled=true);
   try{
    const d=await post({action:'musicLibraryAdd',token,id:requestId,title,artist:$('nwMusicArtist').value.trim(),audio,cover,lyrics:$('nwMusicLyrics').value,base64:file?await base64(file):''});
    if(file)cache.set(d.track.id,Promise.resolve(URL.createObjectURL(file)));
    addTrack(d.track);const i=api.tracks.findIndex(t=>t.id===d.track.id);api.setTrack(i,false);
    $('nwSyncTrack').value=String(i);$('nwSyncTrack').dispatchEvent(new Event('change'));
    box.querySelectorAll('input,textarea').forEach(el=>el.value='');requestId='music-'+crypto.randomUUID();
    status.textContent='등록 완료! 새로 방문하거나 새로고침한 회원의 기본 목록에 표시됩니다. 가사 싱크를 맞춘 후 전체 적용 저장을 눌러주세요.';
   }catch(e){status.textContent=e.message;}finally{button.disabled=false;box.querySelectorAll('input,textarea').forEach(el=>el.disabled=false);}
  };
  async function load(){
   try{const d=await read('musicLibraryGet');d.tracks.forEach(addTrack);
    const sync=await read('syncGet');api.tracks.filter(t=>t.shared).forEach(t=>{const times=sync.sync?.[t.id];if(Array.isArray(times))t.syncedLyrics.forEach((line,i)=>{if(Number.isFinite(Number(times[i])))line.time=Number(times[i]);});});
    api.renderLyrics(api.current());api.syncLyrics();
    $('nwMusicAddStatus').textContent='추가 기본 곡 '+d.tracks.length+'곡을 불러왔습니다.';
   }catch(e){$('nwMusicAddStatus').textContent='공통 곡 목록을 불러오지 못했습니다. '+e.message;}
  }
  const retry=document.createElement('button');retry.type='button';retry.textContent='기본 곡 목록 다시 불러오기';retry.onclick=load;box.append(retry);await load();
 }
 function ready(){Promise.resolve(window.NWConfigReady).then(init);}
 if(window.NWMusicAdminAPI)ready();else window.addEventListener('nw-music-ready',ready,{once:true});
})();
