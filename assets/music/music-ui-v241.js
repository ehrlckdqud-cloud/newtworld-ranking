
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const audio=$('nwAudio');
  let tracks=(Array.isArray(window.NW_TRACKS)&&window.NW_TRACKS.length?window.NW_TRACKS:JSON.parse($('nwBuiltInTracks').textContent||'[]'));
  let index=Number(localStorage.getItem('nwMusicIndex')||0);
  if(!Number.isFinite(index)||index<0||index>=tracks.length) index=0;
  let bgmOn=localStorage.getItem('nwBgmOn')!=='0';
  let lyricsOn=localStorage.getItem('nwLyricsOn')==='1';
  let coverOn=localStorage.getItem('nwCoverOn')!=='0';
  let repeatMode=localStorage.getItem('nwRepeatMode')||'all'; // all | one | off
  let userStarted=false, seeking=false;

  const fmt=t=>{ if(!Number.isFinite(t)||t<0)return '0:00'; const m=Math.floor(t/60),s=Math.floor(t%60); return m+':'+String(s).padStart(2,'0'); };
  const current=()=>tracks[index]||null;
  const repeatLabel=()=>repeatMode==='one'?'한 곡 반복':repeatMode==='off'?'반복 끔':'전체 반복';
  let lyricTimeline=[];
  let lastLyricIndex=-1;
  function isLyricMeta(line){
    const s=String(line||'').trim();
    return !s || /^\[[^\]]+\]$/.test(s) || /^\([^\)]+\)$/.test(s) || /^(Intro|Verse|Chorus|Bridge|Outro|Pre-Chorus|Final|Guitar|Bright Key Change)/i.test(s);
  }
  function renderLyrics(t){
    const box=$('nwLyricsText'); box.innerHTML=''; lyricTimeline=[]; lastLyricIndex=-1;
    const synced=Array.isArray(t&&t.syncedLyrics)?t.syncedLyrics.filter(x=>x&&Number.isFinite(Number(x.time))&&String(x.text||'').trim()):[];
    if(synced.length){
      synced.forEach((x,i)=>{
        const text=String(x.text||'').trim();
        const meta=typeof x.meta==='boolean'?x.meta:isLyricMeta(text);
        const span=document.createElement('span');
        span.className='nw-lyric-line'+(meta?' meta':'');
        span.textContent=text; span.dataset.lyricIndex=String(i); box.appendChild(span);
        const start=Number(x.time)||0;
        let end=(i+1<synced.length)?Number(synced[i+1].time):Number((audio&&audio.duration)||t.duration||start+8);
        if(!Number.isFinite(end)||end<=start)end=start+.25;
        lyricTimeline.push({start,end,el:span,meta});
      });
      return;
    }
    const raw=String((t&&t.lyrics)||'').trim();
    if(!raw){box.textContent='이 MP3에는 내장 가사가 없습니다.';return;}
    const lines=raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    lines.forEach((line,i)=>{
      const meta=isLyricMeta(line);
      const span=document.createElement('span');span.className='nw-lyric-line'+(meta?' meta':'');span.textContent=line;span.dataset.lyricIndex=String(i);box.appendChild(span);
    });
  }
  function syncLyrics(){
    if(!lyricsOn||!lyricTimeline.length)return;
    const t=audio.currentTime||0;
    let idx=-1;
    for(let i=0;i<lyricTimeline.length;i++){
      const x=lyricTimeline[i];
      if(!x.meta && t>=x.start){idx=i;}else if(t<x.start){break;}
    }
    if(idx===lastLyricIndex||idx<0)return;
    if(lastLyricIndex>=0&&lyricTimeline[lastLyricIndex])lyricTimeline[lastLyricIndex].el.classList.remove('active');
    const item=lyricTimeline[idx];item.el.classList.add('active');lastLyricIndex=idx;
    const panel=$('nwLyricsPanel');
    if(panel&&panel.classList.contains('open')){
      requestAnimationFrame(()=>{
        const pr=panel.getBoundingClientRect(), er=item.el.getBoundingClientRect();
        const desired=panel.scrollTop+(er.top-pr.top)-(panel.clientHeight*.43)+(er.height*.5);
        panel.scrollTo({top:Math.max(0,desired),behavior:'smooth'});
      });
    }
  }

  const NW_SITE_URL='https://ehrlckdqud-cloud.github.io/newtworld-ranking/';
  const NW_FALLBACK_ARTWORK=NW_SITE_URL+'assets/og/newtworld-kakao-preview.png';
  function absoluteUrl(src){
    try{return new URL(src, location.href).href;}catch(_){return src||'';}
  }
  function guessImageMime(src){
    const s=String(src||'').toLowerCase();
    if(s.endsWith('.jpg')||s.endsWith('.jpeg')) return 'image/jpeg';
    if(s.endsWith('.webp')) return 'image/webp';
    if(s.endsWith('.gif')) return 'image/gif';
    return 'image/png';
  }
  function mediaArtworkForTrack(t){
    const raw=t&&t.cover?absoluteUrl(t.cover):NW_FALLBACK_ARTWORK;
    const mime=guessImageMime(raw);
    return [
      {src:raw, sizes:'512x512', type:mime},
      {src:raw, sizes:'256x256', type:mime},
      {src:raw, sizes:'192x192', type:mime},
      {src:raw, type:mime}
    ];
  }
  function updateMediaSession(playbackOnly=false){
    if(!('mediaSession' in navigator)) return;
    const t=current();
    if(!t) return;
    if(!playbackOnly){
      try{
        navigator.mediaSession.metadata = new MediaMetadata({
          title: t.title || '뉴트월드',
          artist: t.artist || 'NEWT WORLD MUSIC',
          album: '뉴트월드',
          artwork: mediaArtworkForTrack(t)
        });
      }catch(_){ }
    }
    try{
      navigator.mediaSession.playbackState = (!audio.paused && !audio.ended) ? 'playing' : 'paused';
    }catch(_){ }
    if(typeof navigator.mediaSession.setPositionState === 'function'){
      try{
        const duration=Number(audio.duration);
        if(Number.isFinite(duration) && duration > 0){
          navigator.mediaSession.setPositionState({
            duration,
            playbackRate: Number(audio.playbackRate)||1,
            position: Math.min(Math.max(Number(audio.currentTime)||0,0), duration)
          });
        }
      }catch(_){ }
    }
  }
  function initMediaSession(){
    if(!('mediaSession' in navigator)) return;
    const safe=(name,handler)=>{try{navigator.mediaSession.setActionHandler(name,handler);}catch(_){}};
    safe('play',()=>{bgmOn=true;localStorage.setItem('nwBgmOn','1');paint();tryPlay();});
    safe('pause',()=>{audio.pause();});
    safe('previoustrack',()=>{prevTrack();});
    safe('nexttrack',()=>{nextTrack(true);});
    safe('seekbackward',(details)=>{
      const step=(details && Number(details.seekOffset)) || 10;
      audio.currentTime=Math.max(0,(Number(audio.currentTime)||0)-step);
      updateMediaSession(true);
    });
    safe('seekforward',(details)=>{
      const step=(details && Number(details.seekOffset)) || 10;
      const duration=Number(audio.duration)||Infinity;
      audio.currentTime=Math.min(duration,(Number(audio.currentTime)||0)+step);
      updateMediaSession(true);
    });
    safe('seekto',(details)=>{
      if(!details || !Number.isFinite(Number(details.seekTime))) return;
      const target=Math.max(0, Number(details.seekTime));
      if(details.fastSeek && typeof audio.fastSeek==='function') audio.fastSeek(target);
      else audio.currentTime=target;
      updateMediaSession(true);
    });
    safe('stop',()=>{audio.pause();audio.currentTime=0;updateMediaSession(true);});
    updateMediaSession();
  }

  function populateSelect(){
    const sel=$('nwTrackSelect'); sel.innerHTML='';
    tracks.forEach((t,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+t.title;sel.appendChild(o);});
    sel.value=String(index);
  }
  function paint(){
    const t=current(); if(!t)return;
    $('nwTrackTitle').textContent=t.title||'제목 없음'; $('nwTrackArtist').textContent=t.artist||'NEWT WORLD MUSIC';
    $('nwLyricsTitle').textContent=(t.title||'현재 곡')+' · 가사'; renderLyrics(t);
    $('nwCover').src=t.cover||''; $('nwCover').style.display=t.cover?'block':'none';
    $('nwCoverWrap').classList.toggle('hidden',!coverOn); $('nwMusicMain').classList.toggle('no-cover',!coverOn);
    $('nwLyricsPanel').classList.toggle('open',lyricsOn);
    $('nwBgmToggle').textContent=bgmOn?'BGM ON':'BGM OFF'; $('nwBgmToggle').classList.toggle('active',bgmOn);
    $('nwLyricsToggle').textContent=lyricsOn?'가사 ON':'가사 OFF'; $('nwLyricsToggle').classList.toggle('active',lyricsOn);
    $('nwCoverToggle').textContent=coverOn?'커버 ON':'커버 OFF'; $('nwCoverToggle').classList.toggle('active',coverOn);
    $('nwRepeat').textContent=repeatLabel(); $('nwTrackSelect').value=String(index);
    updateMediaSession();
  }
  function setTrack(i,autoplay){
    if(!tracks.length)return; index=(i+tracks.length)%tracks.length; localStorage.setItem('nwMusicIndex',String(index));
    const t=current(); audio.src=t.audio; audio.load(); populateSelect(); paint(); $('nwSeek').value=0; setRangeFill($('nwSeek'),0,0,1000); $('nwNow').textContent='0:00'; $('nwDur').textContent=fmt(t.duration||0);
    updateMediaSession();
    if(autoplay&&bgmOn) tryPlay();
  }
  async function tryPlay(){
    if(!bgmOn||!current())return;
    try{await audio.play(); userStarted=true; $('nwAutoplayNote').classList.remove('show');}
    catch(e){$('nwAutoplayNote').classList.add('show');}
  }
  function syncPlayIcon(){ const playing=!audio.paused&&!audio.ended; const g=$('nwPlay').querySelector('.nw-icon-glyph'); if(g) g.textContent=playing?'❚❚':'▶'; $('nwLiveDot').style.opacity=playing?'1':'.35'; updateMediaSession(true); }
  function nextTrack(auto=true){ if(index<tracks.length-1)setTrack(index+1,auto); else if(repeatMode==='all')setTrack(0,auto); else {audio.pause();audio.currentTime=0;syncPlayIcon();} }
  function prevTrack(){setTrack(index-1,true);}

  $('nwPlay').onclick=()=>{bgmOn=true;localStorage.setItem('nwBgmOn','1');paint();audio.paused?tryPlay():audio.pause();};
  $('nwPrev').onclick=prevTrack; $('nwNext').onclick=()=>nextTrack(true);
  $('nwTrackSelect').onchange=e=>setTrack(Number(e.target.value),true);
  $('nwBgmToggle').onclick=()=>{bgmOn=!bgmOn;localStorage.setItem('nwBgmOn',bgmOn?'1':'0');paint();bgmOn?tryPlay():audio.pause();};
  $('nwLyricsToggle').onclick=()=>{lyricsOn=!lyricsOn;localStorage.setItem('nwLyricsOn',lyricsOn?'1':'0');paint();if(lyricsOn)setTimeout(syncLyrics,40);};
  $('nwCoverToggle').onclick=()=>{coverOn=!coverOn;localStorage.setItem('nwCoverOn',coverOn?'1':'0');paint();};
  const coverModal=$('nwCoverModal'),coverModalImg=$('nwCoverModalImg');
  function openCoverModal(){const t=current();if(!t||!t.cover||!coverOn)return;coverModalImg.src=t.cover;coverModal.classList.add('open');coverModal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
  function closeCoverModal(){coverModal.classList.remove('open');coverModal.setAttribute('aria-hidden','true');document.body.style.overflow='';}
  $('nwCoverWrap').onclick=openCoverModal;$('nwCoverModalClose').onclick=closeCoverModal;coverModal.onclick=e=>{if(e.target===coverModal)closeCoverModal();};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&coverModal.classList.contains('open'))closeCoverModal();});
  $('nwRepeat').onclick=()=>{repeatMode=repeatMode==='all'?'one':repeatMode==='one'?'off':'all';localStorage.setItem('nwRepeatMode',repeatMode);paint();};
  function setRangeFill(el,value,min,max){
    if(!el)return;
    const lo=Number(min ?? el.min ?? 0), hi=Number(max ?? el.max ?? 100);
    const v=Math.min(hi,Math.max(lo,Number(value)||0));
    const pct=hi===lo?0:((v-lo)/(hi-lo))*100;
    const isSeek=el.id==='nwSeek';
    const fill=document.getElementById(isSeek?'nwSeekFill':'nwVolumeFill');
    const thumb=document.getElementById(isSeek?'nwSeekThumb':'nwVolumeThumb');
    if(fill) fill.style.width=pct.toFixed(3)+'%';
    if(thumb) thumb.style.left=`calc(9px + (100% - 18px) * ${(pct/100).toFixed(6)})`;
  }

  function bindCustomRange(input,wrap,rail){
    if(!input||!wrap||!rail)return;
    const applyFromPointer=(clientX,commit=false)=>{
      const rect=rail.getBoundingClientRect();
      if(!rect.width)return;
      let pct=(clientX-rect.left)/rect.width;
      pct=Math.max(0,Math.min(1,pct));
      const min=Number(input.min||0), max=Number(input.max||100), step=Number(input.step||0);
      let value=min+(max-min)*pct;
      if(step>0){
        value=Math.round((value-min)/step)*step+min;
        value=Math.max(min,Math.min(max,value));
      }
      input.value=String(value);
      input.dispatchEvent(new Event('input',{bubbles:true}));
      if(commit) input.dispatchEvent(new Event('change',{bubbles:true}));
    };
    let dragging=false;
    wrap.addEventListener('pointerdown',e=>{
      dragging=true;
      try{wrap.setPointerCapture(e.pointerId)}catch(_){}
      applyFromPointer(e.clientX,false);
      e.preventDefault();
    });
    wrap.addEventListener('pointermove',e=>{
      if(!dragging)return;
      applyFromPointer(e.clientX,false);
      e.preventDefault();
    });
    const finish=e=>{
      if(!dragging)return;
      dragging=false;
      applyFromPointer(e.clientX,true);
      try{wrap.releasePointerCapture(e.pointerId)}catch(_){}
      e.preventDefault();
    };
    wrap.addEventListener('pointerup',finish);
    wrap.addEventListener('pointercancel',e=>{dragging=false;});
  }
  const nwVolume=$('nwVolume'), nwSeek=$('nwSeek');
  nwVolume.value=localStorage.getItem('nwVolume')||'0.35';
  audio.volume=Number(nwVolume.value);
  setRangeFill(nwVolume,nwVolume.value,0,1);
  setRangeFill(nwSeek,nwSeek.value,0,1000);
  bindCustomRange(nwSeek,$('nwSeekWrap'),$('nwSeekRail'));
  bindCustomRange(nwVolume,$('nwVolumeWrap'),$('nwVolumeRail'));
  nwVolume.oninput=e=>{
    audio.volume=Number(e.target.value);
    localStorage.setItem('nwVolume',e.target.value);
    setRangeFill(e.target,e.target.value,0,1);
  };
  $('nwSeek').oninput=e=>{
    seeking=true;
    setRangeFill(e.target,e.target.value,0,1000);
    if(audio.duration) $('nwNow').textContent=fmt(audio.duration*Number(e.target.value)/1000);
  };
  $('nwSeek').onchange=e=>{
    if(audio.duration)audio.currentTime=audio.duration*Number(e.target.value)/1000;
    setRangeFill(e.target,e.target.value,0,1000);
    seeking=false;
  };
  audio.ontimeupdate=()=>{
    if(!seeking&&audio.duration){
      const seekValue=Math.max(0,Math.min(1000,(audio.currentTime/audio.duration)*1000));
      $('nwSeek').value=seekValue;
      setRangeFill($('nwSeek'),seekValue,0,1000);
      $('nwNow').textContent=fmt(audio.currentTime);
      $('nwDur').textContent=fmt(audio.duration);
    }
    syncLyrics();
    updateMediaSession(true);
  };
  audio.onloadedmetadata=()=>{$('nwDur').textContent=fmt(audio.duration);renderLyrics(current());syncLyrics();updateMediaSession();}; audio.onplay=()=>{syncPlayIcon();updateMediaSession(true);}; audio.onpause=()=>{syncPlayIcon();updateMediaSession(true);};
  audio.onended=()=>{
    updateMediaSession(true);
    $('nwSeek').value=1000;
    setRangeFill($('nwSeek'),1000,0,1000);
    $('nwNow').textContent=fmt(audio.duration||0);

    // v18.24.7: screen-off/background playback hardening.
    // Do NOT use setTimeout here: Android/Samsung may throttle timers in background.
    if(repeatMode==='one'){
      audio.currentTime=0;
      $('nwSeek').value=0;
      setRangeFill($('nwSeek'),0,0,1000);
      tryPlay();
    }else{
      nextTrack(true);
    }
  };

  // Future-ready local MP3 loader: reads common ID3v2 TIT2/TPE1/USLT/APIC frames in the browser.
  function synchsafe(a,b,c,d){return (a<<21)|(b<<14)|(c<<7)|d;}
  function textDecode(bytes,enc){try{ if(enc===1||enc===2){return new TextDecoder(enc===2?'utf-16be':'utf-16').decode(bytes).replace(/^\uFEFF/,'').replace(/\0+$/,'');} return new TextDecoder('utf-8').decode(bytes).replace(/\0+$/,''); }catch(_){return '';}}
  function parseID3(buf,file){
    const u=new Uint8Array(buf), dv=new DataView(buf); let title=file.name.replace(/\.mp3$/i,''),artist='',lyrics='',cover='';
    if(u.length<10||String.fromCharCode(...u.slice(0,3))!=='ID3')return {title,artist,lyrics,cover};
    const ver=u[3], size=synchsafe(u[6],u[7],u[8],u[9]); let p=10,end=Math.min(u.length,10+size);
    while(p+10<=end){const id=String.fromCharCode(...u.slice(p,p+4));if(!/^[A-Z0-9]{4}$/.test(id))break;let sz=ver===4?synchsafe(u[p+4],u[p+5],u[p+6],u[p+7]):dv.getUint32(p+4);if(!sz||p+10+sz>end)break;const data=u.slice(p+10,p+10+sz);
      if(id==='TIT2'||id==='TPE1'){const val=textDecode(data.slice(1),data[0]);if(id==='TIT2'&&val)title=val;if(id==='TPE1'&&val)artist=val;}
      else if(id==='USLT'&&data.length>4){const enc=data[0];let q=4;const term=(enc===1||enc===2)?2:1;while(q+term<=data.length){if(term===1&&data[q]===0){q++;break;}if(term===2&&data[q]===0&&data[q+1]===0){q+=2;break;}q+=term;}lyrics=textDecode(data.slice(q),enc);}
      else if(id==='APIC'&&data.length>4){let q=1;while(q<data.length&&data[q]!==0)q++;const mime=textDecode(data.slice(1,q),0)||'image/jpeg';q+=2;while(q<data.length&&data[q]!==0)q++;q++;if(q<data.length){const blob=new Blob([data.slice(q)],{type:mime});cover=URL.createObjectURL(blob);}}
      p+=10+sz;
    } return {title,artist,lyrics,cover};
  }
  $('nwAddTrack').onclick=()=>$('nwAddInput').click();
  $('nwAddInput').onchange=async e=>{
    const fs=[...e.target.files];
    for(const file of fs){try{const buf=await file.arrayBuffer();const meta=parseID3(buf,file);tracks.push({id:'local-'+Date.now()+'-'+Math.random(),title:meta.title,artist:meta.artist||'로컬 MP3',lyrics:meta.lyrics||'',cover:meta.cover||'',audio:URL.createObjectURL(file),duration:0,builtin:false});}catch(err){console.error(err);}}
    populateSelect(); if(fs.length){setTrack(tracks.length-fs.length,true);} e.target.value='';
  };

  let collapsed=localStorage.getItem('nwMusicCollapsed')==='1';
  function paintCollapsed(){$('nwMusicDock').classList.toggle('nw-music-collapsed',collapsed);$('nwCollapseBtn').textContent=collapsed?'🎵 플레이어 열기':'플레이어 접기';}
  $('nwCollapseBtn').onclick=()=>{collapsed=!collapsed;localStorage.setItem('nwMusicCollapsed',collapsed?'1':'0');paintCollapsed();};

  populateSelect(); setTrack(index,false); paintCollapsed(); syncPlayIcon();
  // Attempt autoplay. If blocked, the first real user gesture starts BGM once.
  if(bgmOn) tryPlay();
  initMediaSession();
  const unlock=()=>{if(bgmOn&&audio.paused&&!userStarted)tryPlay();document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);};
  document.addEventListener('pointerdown',unlock,true); document.addEventListener('keydown',unlock,true);
  window.NWMusicAdminAPI={audio,tracks,getIndex:()=>index,setTrack,renderLyrics,syncLyrics,paint,populateSelect,current};
})();


(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const btn=$('nwSyncAdminBtn'), modal=$('nwSyncAdmin'), api=window.NWMusicAdminAPI;
  if(!btn||!modal||!api) return;
  // 공개 사이트에서는 관리자 인증 전까지 버튼을 숨깁니다. 로컬 환경에서는 즉시 표시됩니다.
  if(location.protocol==='file:'||location.hostname==='localhost'||location.hostname==='127.0.0.1') btn.classList.add('show');
  const storeKey='nwSyncAdminCorrectionsV1';
  let original=JSON.parse(JSON.stringify(api.tracks.map(t=>({id:t.id,syncedLyrics:t.syncedLyrics||[]}))));
  let corrections={}; try{corrections=JSON.parse(localStorage.getItem(storeKey)||'{}')||{};}catch(_){corrections={};}
  // Apply previously saved local corrections only in local admin environment.
  api.tracks.forEach(t=>{ if(Array.isArray(corrections[t.id])) t.syncedLyrics=JSON.parse(JSON.stringify(corrections[t.id])); });
  let trackIndex=api.getIndex(), lineIndex=0;
  const fmt2=t=>{t=Math.max(0,Number(t)||0);const m=Math.floor(t/60),s=Math.floor(t%60),cs=Math.floor((t-Math.floor(t))*100);return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(cs).padStart(2,'0');};
  function track(){return api.tracks[trackIndex];}
  function lines(){return Array.isArray(track()?.syncedLyrics)?track().syncedLyrics:[];}
  function status(msg,bad=false){$('nwSyncStatus').textContent=msg;$('nwSyncStatus').style.color=bad?'#ff8e8e':'#67d6a2';}
  function saveLocal(){ corrections[track().id]=JSON.parse(JSON.stringify(lines())); localStorage.setItem(storeKey,JSON.stringify(corrections)); status('편집내용 임시 저장 · 전체 적용은 [전체 적용 저장] 버튼을 누르세요.'); } function saveRemote(){ saveLocal(); const token=sessionStorage.getItem('nwAdminToken')||''; if(!token){status('관리자 인증이 필요합니다.',true);return;} const times=lines().map(x=>Number(x.time||0).toFixed(2)).join(','); if(!window.NWJsonp){status('서버 연결 기능을 찾을 수 없습니다.',true);return;} status('전체 적용 저장 중…'); NWJsonp('syncSave',{token,trackId:track().id,times},d=>{if(d&&d.ok)status('✅ 전체 적용 저장 완료 · 새로고침한 회원에게 반영됩니다.');else status(d?.error||'저장 실패',true);}); }
  function populateTracks(){const sel=$('nwSyncTrack');sel.innerHTML='';api.tracks.forEach((t,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+t.title;sel.appendChild(o)});sel.value=String(trackIndex);}
  function render(){
    const arr=lines(); lineIndex=Math.max(0,Math.min(lineIndex,Math.max(0,arr.length-1)));
    const cur=arr[lineIndex]; $('nwSyncLine').textContent=cur?cur.text:'가사 없음'; $('nwSyncTime').textContent=cur?fmt2(cur.time):'00:00.00';
    const list=$('nwSyncList');list.innerHTML=''; arr.forEach((x,i)=>{const r=document.createElement('div');r.className='nw-sync-row'+(i===lineIndex?' sel':'')+(Number(x.time)<=api.audio.currentTime?' past':'');r.dataset.i=i;r.innerHTML='<div class="t">'+fmt2(x.time)+'</div><div class="txt"></div>';r.querySelector('.txt').textContent=x.text;r.onclick=()=>{lineIndex=i;render();};list.appendChild(r);});
    const sel=list.querySelector('.sel'); if(sel) sel.scrollIntoView({block:'center',behavior:'smooth'});
  }
  function setLineTime(i,t){const arr=lines();if(!arr[i])return;arr[i].time=Math.max(0,Math.round(Number(t)*100)/100);render();api.renderLyrics(track());api.syncLyrics();}
  function stamp(){setLineTime(lineIndex,api.audio.currentTime); if(lineIndex<lines().length-1){lineIndex++;render();} saveLocal();}
  function select(delta){lineIndex=Math.max(0,Math.min(lines().length-1,lineIndex+delta));render();}
  function shiftLine(delta){const a=lines();if(!a[lineIndex])return;setLineTime(lineIndex,Number(a[lineIndex].time)+delta);saveLocal();}
  function shiftPlay(delta){api.audio.currentTime=Math.max(0,Math.min(api.audio.duration||1e9,api.audio.currentTime+delta));render();}
  function gotoLine(){const a=lines();if(a[lineIndex]){api.audio.currentTime=Number(a[lineIndex].time)||0;api.syncLyrics();}}
  function download(name,text,type='text/plain;charset=utf-8'){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},400);}
  function exportTracks(){
    api.tracks.forEach(t=>{if(Array.isArray(corrections[t.id]))t.syncedLyrics=JSON.parse(JSON.stringify(corrections[t.id]));});
    const clean=api.tracks.filter(t=>t.builtin!==false).map(t=>{const c={...t};delete c._file;return c;});
    download('tracks.js','window.NW_TRACKS = '+JSON.stringify(clean,null,2)+';\n','application/javascript;charset=utf-8');status('tracks.js 내보내기 완료 · GitHub의 assets/music/tracks.js와 교체하세요.');
  }
  function exportLrc(){const t=track();const txt=lines().map(x=>'['+fmt2(x.time)+']'+x.text).join('\r\n');download((t.title||'track').replace(/[\\/:*?"<>|]/g,'_')+'.lrc',txt);}
  function resetTrack(){const t=track(),o=original.find(x=>x.id===t.id);if(!o)return;t.syncedLyrics=JSON.parse(JSON.stringify(o.syncedLyrics||[]));delete corrections[t.id];localStorage.setItem(storeKey,JSON.stringify(corrections));lineIndex=0;api.renderLyrics(t);render();status('현재 곡을 최초 로드 상태로 복원했습니다.');}
  function open(){trackIndex=api.getIndex();populateTracks();lineIndex=0;modal.classList.add('open');modal.setAttribute('aria-hidden','false');render();document.body.style.overflow='hidden';}
  function close(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow='';api.renderLyrics(api.current());api.syncLyrics();}
  btn.onclick=open;$('nwSyncClose').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close();});
  $('nwSyncTrack').onchange=e=>{trackIndex=Number(e.target.value);lineIndex=0;api.setTrack(trackIndex,false);render();};
  $('nwSyncStamp').onclick=stamp;$('nwSyncPrevLine').onclick=()=>select(-1);$('nwSyncNextLine').onclick=()=>select(1);$('nwSyncMinus01').onclick=()=>shiftLine(-.1);$('nwSyncPlus01').onclick=()=>shiftLine(.1);$('nwSyncMinus05').onclick=()=>shiftLine(-.5);$('nwSyncPlus05').onclick=()=>shiftLine(.5);$('nwSyncGoto').onclick=gotoLine;
  $('nwSyncPlayPause').onclick=()=>{api.audio.paused?api.audio.play().catch(()=>{}):api.audio.pause();};$('nwSyncSave').onclick=saveRemote;$('nwSyncExport').onclick=exportTracks;$('nwSyncExportLrc').onclick=exportLrc;$('nwSyncReset').onclick=resetTrack;
  document.addEventListener('keydown',e=>{
    if(!modal.classList.contains('open'))return;
    const tag=(e.target&&e.target.tagName||'').toLowerCase(); if(tag==='input'||tag==='select'||tag==='textarea')return;
    if(e.code==='Space'){e.preventDefault();stamp();}
    else if(e.key==='Backspace'){e.preventDefault();select(-1);}
    else if(e.key==='ArrowUp'){e.preventDefault();select(-1);}
    else if(e.key==='ArrowDown'){e.preventDefault();select(1);}
    else if(e.key==='ArrowLeft'){e.preventDefault();shiftPlay(-.1);}
    else if(e.key==='ArrowRight'){e.preventDefault();shiftPlay(.1);}
    else if(e.key==='Escape'){e.preventDefault();close();}
  },true);
  api.audio.addEventListener('timeupdate',()=>{if(modal.classList.contains('open')){$('nwSyncTime').textContent=lines()[lineIndex]?fmt2(lines()[lineIndex].time):'00:00.00';}});
})();

/* v18.4 — PWA 설치 흐름 */
(function(){
  let deferredInstallPrompt = null;
  let installRequestPending = false;
  const btn = document.getElementById('homeInstallBtn');
  const sub = document.getElementById('homeInstallSub');
  const badge = document.getElementById('homeInstallBadge');
  const modal = document.getElementById('installHelpModal');
  const closeBtn = document.getElementById('installHelpClose');
  const help = document.getElementById('installHelpSteps');
  if(!btn) return;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSamsung = /SamsungBrowser/i.test(navigator.userAgent);
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const isPC = !isMobile;
  const isKakaoInApp = isMobile && /KAKAOTALK/i.test(navigator.userAgent);
  const installSiteURL = 'https://ehrlckdqud-cloud.github.io/newtworld-ranking/';
  const isWindows = /Windows/i.test(navigator.userAgent);
  const isFirefox = /Firefox\//i.test(navigator.userAgent);
  const isEdge = /Edg\//i.test(navigator.userAgent);
  const isChrome = /Chrome\//i.test(navigator.userAgent) && !isEdge;
  const isSafari = /Safari\//i.test(navigator.userAgent) && !isChrome && !isEdge;
  const pcLabel = isFirefox && isWindows ? '작업표시줄에 앱 추가' : isSafari ? 'Dock에 앱 추가' : '바탕화면에 바로가기 추가';
  const helpTitle = document.getElementById('installHelpTitle');
  function resetInstallLabel(){
    if(installRequestPending)return;
    btn.classList.remove('installed');
    btn.disabled = false;
    if(isKakaoInApp){
      sub.textContent = '카카오톡에서는 설치할 수 없어요 · 브라우저로 열어주세요';
      badge.textContent = '브라우저로';
      btn.setAttribute('aria-label','외부 브라우저로 열어 앱 설치하기');
    }else if(isPC){
      sub.textContent = pcLabel;
      badge.textContent = isFirefox ? '+ 앱 추가' : '+ 바로가기';
      btn.setAttribute('aria-label',pcLabel);
    }else{
      sub.textContent = '뉴트월드 앱 설치 · 홈 화면에 추가';
      badge.textContent = '설치';
      btn.setAttribute('aria-label','뉴트월드 앱 설치');
    }
  }
  resetInstallLabel();

  const standaloneMedia = window.matchMedia('(display-mode: standalone)');
  function isAppWindow(){return standaloneMedia.matches || window.navigator.standalone === true;}
  function syncInstallState(){
    if(installRequestPending)return;
    resetInstallLabel();
    if(isAppWindow() && !isKakaoInApp){
      sub.textContent = '앱으로 이용 중 · 홈 화면 추가 안내';
      badge.textContent = '추가 안내';
      btn.setAttribute('aria-label','홈 화면 추가 방법 보기');
    }else if(deferredInstallPrompt && isMobile && !isKakaoInApp){
      sub.textContent = '버튼을 눌러 바로 설치하기';
      badge.textContent = '설치';
    }
  }
  function markInstalled(){
    btn.classList.remove('installed');
    btn.disabled = false;
    sub.textContent = '추가 완료 · 다시 추가하려면 안내를 확인하세요';
    badge.textContent = '추가 안내';
    btn.setAttribute('aria-label','앱 추가 안내 보기');
  }
  function openHelp(){
    let text = '';
    if(helpTitle) helpTitle.textContent = isKakaoInApp ? '🌐 브라우저로 열기' : isPC ? '🖥 '+pcLabel : '📲 홈 화면에 추가';
    if(isKakaoInApp){
      text = '<strong>브라우저에서 뉴트월드 앱을 설치해주세요.</strong><br>브라우저가 열리면 사이트의 <strong>설치</strong> 버튼을 눌러주세요.<br><br>이동되지 않으면 카카오톡 화면의 <strong>메뉴(⋯) → 다른 브라우저로 열기</strong>를 선택해주세요. 메뉴 이름과 위치는 기기에 따라 다를 수 있어요.<br><br>또는 아래 주소를 복사해 '+(isIOS ? '<strong>Safari</strong>' : '<strong>Chrome·Samsung Internet 등</strong>')+'의 주소창에 붙여넣어주세요.<br><input id="installBrowserAddress" aria-label="뉴트월드 사이트 주소" readonly value="https://ehrlckdqud-cloud.github.io/newtworld-ranking/" style="width:100%;box-sizing:border-box;margin:12px 0 8px;padding:10px;border-radius:8px;border:1px solid #466678;background:#071018;color:#fff;font-size:12px"><button type="button" id="installBrowserCopy" class="install-help-copy">주소 복사</button><span id="installBrowserCopyStatus" role="status" style="display:block;margin-top:8px"></span>';
    }else if(isPC){
      if(isFirefox && isWindows){
        text = '<strong>Firefox에서 뉴트월드 앱 추가</strong><br>1. 주소창 오른쪽의 <strong>웹앱 추가 아이콘</strong>을 눌러주세요.<br>2. 작업표시줄 고정 안내가 뜨면 <strong>예</strong>를 선택해주세요.<br>3. 작업표시줄 또는 시작 메뉴의 뉴트월드를 누르면 별도 창으로 열립니다.<br><br>바탕화면 자동 생성과는 다릅니다. 바탕화면에도 두려면 시작 메뉴의 뉴트월드 바로가기를 바탕화면으로 끌어 놓아주세요.<br><br>아이콘이 보이지 않으면 일반 창에서 Firefox 버전을 확인해주세요. Windows용 143 이상, Microsoft Store 설치판은 150 이상이 필요합니다. 사이트 버튼은 Firefox 주소창의 설치 기능을 직접 실행할 수 없습니다.';
      }else if(isEdge){
        text = '<strong>Microsoft Edge에서 앱 설치</strong><br>주소창의 앱 설치 아이콘을 누르거나, <strong>⋯ 메뉴 → 추가 도구 → 앱 → 이 사이트를 앱으로 설치</strong>를 선택해주세요.<br><br>바탕화면 아이콘이 없으면 주소창에 <strong>edge://apps</strong>를 입력하고 뉴트월드의 <strong>세부 정보 → 바탕 화면 바로 가기 만들기</strong>를 선택해주세요. 메뉴 이름은 버전에 따라 다를 수 있습니다.';
      }else if(isChrome){
        text = '<strong>Chrome에서 앱 설치</strong><br>주소창의 설치 아이콘을 누르거나, <strong>⋮ 메뉴 → 전송, 저장, 공유 → 페이지를 앱으로 설치</strong>를 선택해주세요.<br><br>바탕화면 아이콘이 없으면 주소창에 <strong>chrome://apps</strong>를 입력하고 뉴트월드 우클릭 → <strong>바로가기 만들기</strong>에서 바탕화면을 선택해주세요. 메뉴 이름은 버전에 따라 다를 수 있습니다.';
      }else if(isSafari){
        text = '<strong>Mac Safari에서 앱 추가</strong><br>지원되는 Safari에서 <strong>파일 → Dock에 추가</strong>를 선택해주세요. 추가한 아이콘을 누르면 앱처럼 열립니다.';
      }else if(isFirefox){
        text = '<strong>Firefox 앱 설치 안내</strong><br>Firefox의 기본 웹앱 설치는 Windows에서 지원합니다. Mac·Linux에서는 책갈피를 추가하거나 Chrome 등 앱 설치를 지원하는 브라우저를 이용해주세요.';
      }else{
        text = '<strong>이 브라우저의 설치 메뉴를 확인해주세요.</strong><br>주소창이나 브라우저 메뉴의 <strong>앱 설치·바로가기 추가</strong> 항목을 이용해주세요. 설치 메뉴가 없다면 책갈피로 저장할 수 있습니다.';
      }
    }else if(isIOS){
      text = '<strong>iPhone / iPad Safari</strong><br>1. 아래쪽 <strong>공유</strong> 버튼을 누릅니다.<br>2. <strong>홈 화면에 추가</strong>를 선택합니다.<br>3. 오른쪽 위 <strong>추가</strong>를 누르면 완료됩니다.';
    }else if(isSamsung){
      text = '<strong>Samsung Internet에서 앱 설치</strong><br>브라우저 메뉴에서 <strong>현재 페이지 추가 → 홈 화면</strong> 또는 <strong>앱 설치</strong>를 선택해주세요. 표시되는 안내에 따라 추가하면 홈 화면에서 뉴트월드를 열 수 있어요.';
    }else{
      text = '<strong>뉴트월드 앱 설치</strong><br>브라우저 메뉴에서 <strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong>를 선택해주세요. 설치 창이 아직 준비되지 않았거나 이미 설치된 경우에도 메뉴에서 확인할 수 있어요.';
    }
    help.innerHTML = text;
    const copyBtn = document.getElementById('installBrowserCopy');
    if(copyBtn)copyBtn.addEventListener('click',async ()=>{
      const status=document.getElementById('installBrowserCopyStatus');
      try{
        if(!navigator.clipboard || !navigator.clipboard.writeText)throw new Error('clipboard unavailable');
        await navigator.clipboard.writeText(installSiteURL);
        if(status)status.textContent='주소를 복사했어요. 브라우저 주소창에 붙여넣어주세요.';
      }catch(_){
        const address=document.getElementById('installBrowserAddress');
        if(address){address.focus();address.select();}
        if(status)status.textContent='위 주소를 길게 눌러 복사해주세요.';
      }
    });
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
  }

  syncInstallState();
  window.addEventListener('pageshow',syncInstallState);
  window.addEventListener('focus',syncInstallState);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState === 'visible')syncInstallState();
  });
  if(standaloneMedia.addEventListener)standaloneMedia.addEventListener('change',syncInstallState);
  else if(standaloneMedia.addListener)standaloneMedia.addListener(syncInstallState);

  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    if(isKakaoInApp)return;
    deferredInstallPrompt = e;
    syncInstallState();
  });

  window.addEventListener('appinstalled', ()=>{
    if(isKakaoInApp)return;
    deferredInstallPrompt = null;
    markInstalled();
  });

  function showMobileInstallStatus(){
    // A browser-provided install prompt cannot be recreated by the page.
    if(isSamsung)sub.textContent='브라우저 메뉴 → 현재 페이지 추가 → 홈 화면';
    else if(isIOS)sub.textContent='Safari 공유 버튼 → 홈 화면에 추가';
    else sub.textContent='브라우저 메뉴 → 앱 설치 / 홈 화면에 추가';
    badge.textContent='설치';
    btn.disabled=false;
  }
  btn.addEventListener('click', async ()=>{
    if(installRequestPending)return;
    if(isKakaoInApp){
      openHelp();
      try{window.location.assign('kakaotalk://web/openExternal?url='+encodeURIComponent(installSiteURL));}catch(_){}
      return;
    }
    if(deferredInstallPrompt){
      const prompt = deferredInstallPrompt;
      deferredInstallPrompt = null;
      installRequestPending = true;
      btn.disabled = true;
      let accepted = false;
      let failed = false;
      try{
        await prompt.prompt();
        const choice = await prompt.userChoice;
        accepted = !!(choice && choice.outcome === 'accepted');
      }catch(_){failed = true;}
      finally{installRequestPending = false;btn.disabled = false;}
      if(accepted){markInstalled();if(isPC)openHelp();}
      else{syncInstallState();if(failed){if(isPC)openHelp();else showMobileInstallStatus();}}
    }else{
      if(isPC)openHelp();
      else showMobileInstallStatus();
    }
  });

  closeBtn && closeBtn.addEventListener('click', ()=>{
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
  });
  modal && modal.addEventListener('click', (e)=>{
    if(e.target === modal){
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden','true');
    }
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && modal && modal.classList.contains('open')){
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden','true');
    }
  });
})();


window.dispatchEvent(new Event("nw-music-ready"));
