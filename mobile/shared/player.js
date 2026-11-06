(function(){
'use strict';
const $=id=>document.getElementById(id);
let defaults=[],personal=[],tracks=[],state={id:'',position:0,duration:0,playing:false},ready=false,catalogReady=false;
let repeat=localStorage.getItem('nwRepeatMode')||'all',shuffle=localStorage.getItem('nwShuffleOn')==='true';
const banner=document.createElement('button');banner.id='nwNativeStatus';banner.type='button';banner.setAttribute('role','status');banner.onclick=()=>status('');document.body.append(banner);
function status(text){banner.textContent=text;banner.hidden=!text;}
function post(command,data={}){
 const message=JSON.stringify({version:1,command,...data});
 if(window.NWAndroid?.postMessage)window.NWAndroid.postMessage(message);
 else if(window.webkit?.messageHandlers?.newt)window.webkit.messageHandlers.newt.postMessage(message);
 else status('앱 전용 재생 기능에 연결되지 않았습니다.');
}
function configure(){if(!ready||!catalogReady)return;post('queue',{tracks:defaults.map(t=>({id:t.id,url:t.audio,title:t.title||'',artist:t.artist||'',artwork:t.cover||''})),repeat,shuffle});}
function combine(){tracks=[...defaults,...personal];displayed='';render();if(!$('nwTrackMenu').hidden)paintMenu();}
const fmt=x=>{x=Math.max(0,Math.floor(x||0));return Math.floor(x/60)+':'+String(x%60).padStart(2,'0')};
let displayed='',active=-1,seeking=false;
function renderTrack(){const t=tracks.find(t=>t.id===state.id)||tracks[0];if(!t){$('nwTrackTitle').textContent='음악을 추가해주세요';$('nwTrackArtist').textContent='';$('nwCover').removeAttribute('src');$('nwLyricsText').replaceChildren();return;}if(displayed===t.id)return;displayed=t.id;active=-1;
 $('nwTrackTitle').textContent=t.title;$('nwTrackArtist').textContent=t.artist||'NEWT WORLD MUSIC';$('nwCover').src=t.cover||'';$('nwCover').style.display=t.cover?'':'none';$('nwTrackPickerButton').textContent=t.title+' ▾';
 const box=$('nwLyricsText');box.replaceChildren();const lines=t.syncedLyrics?.length?t.syncedLyrics:String(t.lyrics||'가사 정보가 없습니다.').split('\n').map(text=>({text,time:Infinity}));
 for(const line of lines){const e=document.createElement('span');e.className='nw-lyric-line';e.textContent=line.text;e.dataset.time=line.time;box.append(e);}
}
function render(){renderTrack();$('nwPlay').querySelector('.nw-icon-glyph').textContent=state.playing?'❚❚':'▶';$('nwNow').textContent=fmt(state.position);$('nwDur').textContent=fmt(state.duration);if(!seeking)$('nwSeek').value=state.duration?1000*state.position/state.duration:0;
 $('nwLiveDot').style.opacity=state.playing?'1':'.35';
 const lines=[...$('nwLyricsText').children];let index=-1;lines.forEach((e,i)=>{if(Number(e.dataset.time)<=state.position&&!/^\[.*\]$/.test(e.textContent.trim()))index=i;});
 if(index!==active){lines[active]?.classList.remove('active');lines[index]?.classList.add('active');active=index;const panel=$('nwLyricsPanel'),line=lines[index];if(line)panel.scrollTo({top:Math.max(0,panel.scrollTop+line.getBoundingClientRect().top-panel.getBoundingClientRect().top-panel.clientHeight*.4),behavior:'smooth'});}
 if($('nwEqAvailability'))$('nwEqAvailability').textContent=state.eqAvailable===false?'곡을 재생하면 음향 처리를 준비합니다. 기기에 따라 지원 여부가 달라질 수 있습니다.':'';
}
let eq;try{eq=JSON.parse(localStorage.getItem('nwNativeEQ'))}catch{};eq=eq&&Array.isArray(eq.gains)&&eq.gains.length===5?eq:{enabled:false,gains:[0,0,0,0,0]};eq.gains=eq.gains.map(x=>Math.max(-12,Math.min(12,Number(x)||0)));
function saveEQ(){localStorage.setItem('nwNativeEQ',JSON.stringify(eq));post('equalizer',{settings:eq});}
window.NWNativeReceive=function(message){
 if(typeof message==='string'){try{message=JSON.parse(message)}catch{return}}
 if(message.type==='ready'){ready=true;configure();post('volume',{value:Number($('nwVolume').value)});saveEQ();post('library');post('state');return;}
 if(message.type==='error'||message.type==='notice'){status(message.message||'재생 오류');return;}
 if(message.type==='library'){personal=message.tracks||[];combine();return;}
 if(message.type==='state'){state={...state,...message};render();}
};
$('nwPlay').onclick=()=>{if(!ready||!tracks.length)return;post(state.playing?'pause':'play');};
$('nwPrev').onclick=()=>post('previous');$('nwNext').onclick=()=>post('next');
$('nwSeek').onpointerdown=()=>{seeking=true};$('nwSeek').onpointercancel=()=>{seeking=false};$('nwSeek').onchange=e=>{post('seek',{position:state.duration*Number(e.target.value)/1000});seeking=false};
$('nwVolume').value=localStorage.getItem('nwNativeVolume')||'0.35';$('nwVolume').oninput=e=>{localStorage.setItem('nwNativeVolume',e.target.value);post('volume',{value:Number(e.target.value)});};
function modes(){for(const [id,on] of [['nwShuffle',shuffle],['nwRepeatAll',repeat==='all']]){$(id).classList.toggle('active',on);$(id).setAttribute('aria-pressed',on);}}
$('nwShuffle').onclick=()=>{shuffle=!shuffle;localStorage.setItem('nwShuffleOn',shuffle);modes();post('modes',{repeat,shuffle})};
$('nwRepeatAll').onclick=()=>{repeat=repeat==='all'?'off':'all';localStorage.setItem('nwRepeatMode',repeat);modes();post('modes',{repeat,shuffle})};
$('nwPlayerSettings').onclick=()=>{const open=$('nwMusicDock').classList.toggle('nw-settings-open');$('nwPlayerSettings').setAttribute('aria-expanded',open)};
let cover=localStorage.getItem('nwCoverOn')!=='0';function paintCover(){$('nwCoverWrap').classList.toggle('hidden',!cover);$('nwMusicDock').classList.toggle('nw-cover-off',!cover);$('nwCoverToggle').textContent=cover?'커버 ON':'커버 OFF';}paintCover();
$('nwCoverToggle').onclick=()=>{cover=!cover;localStorage.setItem('nwCoverOn',cover?'1':'0');paintCover()};
$('nwLyricsPanel').classList.add('open');$('nwLyricsToggle').onclick=()=>{};
function closeMenu(){$('nwTrackMenu').hidden=true;$('nwTrackPickerButton').setAttribute('aria-expanded','false');}
function paintMenu(){const menu=$('nwTrackMenu');menu.replaceChildren();for(const t of tracks){const row=document.createElement('div');row.className='nw-track-menu-row';const b=document.createElement('button');b.type='button';b.className='nw-track-option';b.textContent=t.title;b.setAttribute('aria-selected',String(state.id===t.id));b.onclick=()=>{post('select',{id:t.id});closeMenu()};row.append(b);
 if(t.local){const remove=document.createElement('button');remove.type='button';remove.className='nw-track-delete';remove.textContent='삭제';remove.setAttribute('aria-label',t.title+' 삭제');remove.onclick=()=>{if(confirm('내 음악에서 “'+t.title+'”을 삭제할까요?'))post('delete',{id:t.id});};row.append(remove);}menu.append(row);}}
$('nwTrackPickerButton').onclick=()=>{if(!$('nwTrackMenu').hidden){closeMenu();return}paintMenu();$('nwTrackMenu').hidden=false;$('nwTrackPickerButton').setAttribute('aria-expanded','true');};
const eqPanel=document.createElement('dialog');eqPanel.id='nwNativeEq';eqPanel.innerHTML='<h2>이퀄라이저</h2><label class="nw-eq-enabled"><input id="nwEqEnabled" type="checkbox"> 이퀄라이저 사용</label><p id="nwEqAvailability"></p><div id="nwEqBands"></div><div class="nw-eq-actions"><button id="nwEqReset">초기화</button><button id="nwEqClose">닫기</button></div>';document.body.append(eqPanel);
const frequencies=['60 Hz','230 Hz','910 Hz','3.6 kHz','14 kHz'];
function paintEQ(){ $('nwEqEnabled').checked=eq.enabled;const box=$('nwEqBands');box.replaceChildren();frequencies.forEach((name,i)=>{const label=document.createElement('label');label.className='nw-eq-band';const text=document.createElement('span');text.textContent=name;const value=document.createElement('output');value.textContent=eq.gains[i]+' dB';const slider=document.createElement('input');slider.type='range';slider.min=-12;slider.max=12;slider.step=.5;slider.value=eq.gains[i];slider.setAttribute('aria-label',name);slider.oninput=()=>{eq.gains[i]=Number(slider.value);value.textContent=slider.value+' dB';saveEQ()};label.append(text,slider,value);box.append(label);});}
$('nwEqualizer').onclick=()=>{paintEQ();eqPanel.showModal();$('nwEqualizer').setAttribute('aria-expanded','true');};
$('nwEqEnabled').onchange=e=>{eq.enabled=e.target.checked;saveEQ()};$('nwEqReset').onclick=()=>{eq.gains=[0,0,0,0,0];paintEQ();saveEQ()};$('nwEqClose').onclick=()=>eqPanel.close();eqPanel.onclose=()=>$('nwEqualizer').setAttribute('aria-expanded','false');
$('nwAddTrack').onclick=()=>post('import');
const refresh=document.createElement('button');refresh.className='nw-mini-btn';refresh.textContent='곡 목록 새로고침';refresh.onclick=loadCatalog;$('nwPlayerTools').append(refresh);
const stop=document.createElement('button');stop.className='nw-mini-btn';stop.textContent='재생 종료';stop.onclick=()=>post('stop');$('nwPlayerTools').append(stop);
async function loadCatalog(){status('뉴트월드 곡 목록을 불러오는 중…');try{defaults=await window.NWCatalog.load();catalogReady=true;combine();configure();status(window.NWCatalog.offline?'인터넷 연결이 없어 저장된 곡 목록을 표시합니다.':'');}catch{status('기본곡 목록을 불러오지 못했습니다. 개인 음악은 계속 사용할 수 있습니다.');}}
$('nwAutoplayNote').classList.remove('show');modes();loadCatalog();document.addEventListener('visibilitychange',()=>{if(!document.hidden){post('state');post('library')}});post('ready');
})();
