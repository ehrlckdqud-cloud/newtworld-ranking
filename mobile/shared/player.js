(function(){
'use strict';
const $=id=>document.getElementById(id);let tracks=[],state={id:'',position:0,duration:0,playing:false},ready=false,pendingQueue=null;
let repeat=localStorage.getItem('nwRepeatMode')||'all',shuffle=localStorage.getItem('nwShuffleOn')==='true';
const banner=document.createElement('div');banner.id='nwNativeStatus';banner.setAttribute('role','status');document.body.append(banner);
function status(text){banner.textContent=text;banner.hidden=!text;}
function post(command,data={}){
 const message=JSON.stringify({version:1,command,...data});
 if(window.NWAndroid?.postMessage)window.NWAndroid.postMessage(message);
 else if(window.webkit?.messageHandlers?.newt)window.webkit.messageHandlers.newt.postMessage(message);
 else status('앱 전용 재생 기능에 연결되지 않았습니다.');
}
function configure(){if(!ready||!tracks.length)return;post('queue',{tracks:tracks.map(t=>({id:t.id,url:t.audio,title:t.title||'',artist:t.artist||'',artwork:t.cover||''})),repeat,shuffle});pendingQueue=null;}
const fmt=x=>{x=Math.max(0,Math.floor(x||0));return Math.floor(x/60)+':'+String(x%60).padStart(2,'0')};
let displayed='',active=-1;
function renderTrack(){const t=tracks.find(t=>t.id===state.id)||tracks[0];if(!t||displayed===t.id)return;displayed=t.id;active=-1;
 $('nwTrackTitle').textContent=t.title;$('nwTrackArtist').textContent=t.artist||'NEWT WORLD MUSIC';$('nwCover').src=t.cover||'';$('nwCover').style.display=t.cover?'':'none';$('nwTrackPickerButton').textContent=t.title+' ▾';
 const box=$('nwLyricsText');box.replaceChildren();const lines=t.syncedLyrics?.length?t.syncedLyrics:String(t.lyrics||'가사 정보가 없습니다.').split('\n').map(text=>({text,time:Infinity}));
 for(const line of lines){const e=document.createElement('span');e.className='nw-lyric-line';e.textContent=line.text;e.dataset.time=line.time;box.append(e);}
}
function render(){renderTrack();$('nwPlay').querySelector('.nw-icon-glyph').textContent=state.playing?'❚❚':'▶';$('nwNow').textContent=fmt(state.position);$('nwDur').textContent=fmt(state.duration);$('nwSeek').value=state.duration?1000*state.position/state.duration:0;
 $('nwLiveDot').style.opacity=state.playing?'1':'.35';
 const lines=[...$('nwLyricsText').children];let index=-1;lines.forEach((e,i)=>{if(Number(e.dataset.time)<=state.position&&!/^\[.*\]$/.test(e.textContent.trim()))index=i;});
 if(index!==active){lines[active]?.classList.remove('active');lines[index]?.classList.add('active');active=index;const panel=$('nwLyricsPanel'),line=lines[index];if(line)panel.scrollTo({top:Math.max(0,panel.scrollTop+line.getBoundingClientRect().top-panel.getBoundingClientRect().top-panel.clientHeight*.4),behavior:'smooth'});}
}
window.NWNativeReceive=function(message){
 if(typeof message==='string'){try{message=JSON.parse(message)}catch{return}}
 if(message.type==='ready'){ready=true;if(pendingQueue)configure();post('state');return;}
 if(message.type==='error'){status(message.message||'재생 오류');return;}
 if(message.type==='state'){state={...state,...message};status('');render();}
};
$('nwPlay').onclick=()=>{if(!ready||!tracks.length)return;post(state.playing?'pause':'play');};
$('nwPrev').onclick=()=>post('previous');$('nwNext').onclick=()=>post('next');
$('nwSeek').onchange=e=>post('seek',{position:state.duration*Number(e.target.value)/1000});
$('nwVolume').oninput=e=>post('volume',{value:Number(e.target.value)});
function modes(){for(const [id,on] of [['nwShuffle',shuffle],['nwRepeatAll',repeat==='all']]){$(id).classList.toggle('active',on);$(id).setAttribute('aria-pressed',on);}}
$('nwShuffle').onclick=()=>{shuffle=!shuffle;localStorage.setItem('nwShuffleOn',shuffle);modes();post('modes',{repeat,shuffle})};
$('nwRepeatAll').onclick=()=>{repeat=repeat==='all'?'off':'all';localStorage.setItem('nwRepeatMode',repeat);modes();post('modes',{repeat,shuffle})};
$('nwPlayerSettings').onclick=()=>{const open=$('nwMusicDock').classList.toggle('nw-settings-open');$('nwPlayerSettings').setAttribute('aria-expanded',open)};
let cover=localStorage.getItem('nwCoverOn')!=='0';function paintCover(){$('nwCoverWrap').classList.toggle('hidden',!cover);$('nwMusicDock').classList.toggle('nw-cover-off',!cover);$('nwCoverToggle').textContent=cover?'커버 ON':'커버 OFF';}paintCover();
$('nwCoverToggle').onclick=()=>{cover=!cover;localStorage.setItem('nwCoverOn',cover?'1':'0');paintCover()};
$('nwLyricsPanel').classList.add('open');$('nwLyricsToggle').onclick=()=>{};
$('nwTrackPickerButton').onclick=()=>{const menu=$('nwTrackMenu');menu.replaceChildren();for(const t of tracks){const b=document.createElement('button');b.type='button';b.className='nw-track-option';b.textContent=t.title;b.onclick=()=>{post('select',{id:t.id});menu.hidden=true};menu.append(b)}menu.hidden=!menu.hidden;};
// These controls remain visible but cannot silently fall back to WebAudio/blob playback.
$('nwEqualizer').onclick=()=>status('시험판: 앱 전용 이퀄라이저는 아직 연결되지 않았습니다.');
$('nwAddTrack').onclick=()=>status('시험판: 개인 MP3 가져오기는 아직 연결되지 않았습니다.');
$('nwAutoplayNote').classList.remove('show');modes();status('뉴트월드 곡 목록을 불러오는 중…');
window.NWCatalog.load().then(list=>{tracks=list;pendingQueue=list;configure();state.id=state.id||tracks[0]?.id;render();status(list.length?'':'등록된 곡이 없습니다.');}).catch(()=>status('곡 목록을 불러오지 못했습니다. 인터넷 연결을 확인하고 앱을 다시 열어주세요.'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)post('state')});post('ready');
})();
