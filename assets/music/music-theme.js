(function(){
 'use strict';
 const $=id=>document.getElementById(id),dock=$('nwMusicDock'),button=$('nwBackgroundColor');
 if(!dock||!button)return;
 const key='nwMusicBackgroundColor',defaultColor='#1382d7';let hue=140,sat=43,val=34;
 const panel=document.createElement('section');panel.id='nwColorPanel';panel.hidden=true;panel.setAttribute('aria-label','플레이어 배경 색상');
 panel.innerHTML=`<div class="nw-color-head"><b>배경 색상</b><button type="button" id="nwColorClose" aria-label="색상 설정 닫기">×</button></div><div class="nw-color-presets"><button type="button" data-color="#315641" aria-label="포레스트" title="포레스트" style="--swatch:#315641"></button><button type="button" data-color="#21805c" aria-label="에메랄드" title="에메랄드" style="--swatch:#21805c"></button><button type="button" data-color="#51bfa0" aria-label="민트" title="민트" style="--swatch:#51bfa0"></button><button type="button" data-color="#227b88" aria-label="틸" title="틸" style="--swatch:#227b88"></button><button type="button" data-color="#589bce" aria-label="스카이" title="스카이" style="--swatch:#589bce"></button><button type="button" data-color="#304f86" aria-label="미드나잇" title="미드나잇" style="--swatch:#304f86"></button><button type="button" data-color="#50449a" aria-label="인디고" title="인디고" style="--swatch:#50449a"></button><button type="button" data-color="#8955b2" aria-label="퍼플" title="퍼플" style="--swatch:#8955b2"></button><button type="button" data-color="#aa87c9" aria-label="라벤더" title="라벤더" style="--swatch:#aa87c9"></button><button type="button" data-color="#df79ac" aria-label="핑크" title="핑크" style="--swatch:#df79ac"></button><button type="button" data-color="#bf4f7e" aria-label="로즈" title="로즈" style="--swatch:#bf4f7e"></button><button type="button" data-color="#c94b4b" aria-label="레드" title="레드" style="--swatch:#c94b4b"></button><button type="button" data-color="#df826b" aria-label="코랄" title="코랄" style="--swatch:#df826b"></button><button type="button" data-color="#bd8b36" aria-label="앰버" title="앰버" style="--swatch:#bd8b36"></button><button type="button" data-color="#80543b" aria-label="웜 브라운" title="웜 브라운" style="--swatch:#80543b"></button><button type="button" data-color="#555963" aria-label="차콜" title="차콜" style="--swatch:#555963"></button></div><div id="nwColorSquare" role="slider" tabindex="0" aria-label="채도와 밝기, 방향키로 조절" aria-valuemin="0" aria-valuemax="100"><span id="nwColorPoint"></span></div><label class="nw-color-hue">색조 <input id="nwColorHue" type="range" min="0" max="359" value="140"></label><div class="nw-color-bottom"><label>색상 코드 <input id="nwColorHex" type="text" maxlength="7" spellcheck="false" aria-label="배경 색상 코드"></label><button id="nwColorReset" type="button">기본값으로 복원</button></div><small>자동 저장 · 같은 기기와 브라우저에 적용</small>`;
 dock.append(panel);
 const themeStyle=document.createElement('style');themeStyle.id='nw-music-theme-controls';themeStyle.textContent="\n#nwMusicDock.nw-themed :is(button,select,input[type=\"text\"]):not([data-color]){\n background:var(--nw-control)!important;color:var(--nw-text)!important;border-color:var(--nw-border)!important}\n#nwMusicDock.nw-themed :is(button,select):not([data-color]):hover{background:var(--nw-hover)!important}\n#nwMusicDock.nw-themed :is(button.active,button[aria-pressed=\"true\"],button[aria-selected=\"true\"]):not([data-color]){\n background:var(--nw-active)!important;color:var(--nw-text)!important;border-color:var(--nw-accent)!important}\n#nwMusicDock.nw-themed #nwPlay{background:var(--nw-accent)!important;color:var(--nw-ink)!important}\n#nwMusicDock.nw-themed :is(#nwColorPanel,#nwEQPanel,#nwTrackMenu,.nw-tools){background:var(--nw-panel)!important;color:var(--nw-text)!important;border-color:var(--nw-border)!important}\n#nwMusicDock.nw-themed :is(.nw-track-artist,.nw-time,.nw-volume-label,#nwColorPanel small,#nwEQPanel small,.nw-lyric-line){color:var(--nw-muted)!important}\n#nwMusicDock.nw-themed .nw-lyrics{background:var(--nw-panel)!important;border-color:var(--nw-border)!important}\n#nwMusicDock.nw-themed .nw-lyric-line.active{background:var(--nw-active)!important;color:var(--nw-text)!important;text-shadow:none}\n#nwMusicDock.nw-themed :is(.nw-range-fill,.nw-eq-thumb,.nw-live-dot){background:var(--nw-accent)!important}\n#nwMusicDock.nw-themed .nw-live-dot{box-shadow:0 0 12px var(--nw-accent)}\n#nwMusicDock.nw-themed :is(.nw-cover-wrap,.nw-music-shell){border-color:var(--nw-border)!important}\n#nwMusicDock.nw-themed .nw-color-hue input{accent-color:var(--nw-accent)}\n#nwMusicDock.nw-themed .nw-eq-rail{background:linear-gradient(to bottom,var(--nw-border) 0%,var(--nw-border) var(--eq-position,50%),var(--nw-accent) var(--eq-position,50%),var(--nw-accent) 100%)!important}\n";themeStyle.textContent+="\n#nwBackgroundGuide.nw-themed{background:var(--nw-panel);color:var(--nw-text);border-color:var(--nw-border)}\n#nwBackgroundGuide.nw-themed::backdrop{background:var(--nw-ink);opacity:.75}\n#nwBackgroundGuide.nw-themed strong{color:var(--nw-accent)}\n#nwBackgroundGuide.nw-themed ol{background:var(--nw-control)}\n#nwBackgroundGuide.nw-themed .nw-bg-guide-note{color:var(--nw-muted)}\n#nwBackgroundGuide.nw-themed #nwBackgroundGuideConfirm{background:var(--nw-accent);color:var(--nw-ink)}\n#nwBackgroundGuide.nw-themed #nwBackgroundGuideConfirm:hover{background:var(--nw-text)}\n";themeStyle.textContent+="\n/* Playback mode icons: white when off, selected theme color when on. */\n#nwMusicDock.nw-themed :is(#nwShuffle,#nwRepeatAll){\n color:#fff!important;background:var(--nw-control)!important;border-color:var(--nw-border)!important}\n#nwMusicDock.nw-themed :is(#nwShuffle,#nwRepeatAll)[aria-pressed=\"true\"]{\n color:var(--nw-mode-color)!important;background:var(--nw-mode-bg)!important;border-color:var(--nw-mode-color)!important;box-shadow:0 0 0 1px var(--nw-mode-color)}\n#nwMusicDock.nw-themed :is(#nwShuffle,#nwRepeatAll) svg{color:inherit;stroke:currentColor}\n";themeStyle.textContent+="\n/* Off modes remain clickable, but have dimmed icons and a clear diagonal slash. */\n#nwMusicDock.nw-themed :is(#nwShuffle,#nwRepeatAll)[aria-pressed=\"false\"]{\n color:#82878d!important;background:#161a1f!important;border-color:#444a50!important;box-shadow:none!important}\n#nwMusicDock :is(#nwShuffle,#nwRepeatAll) .nw-mode-slash{\n stroke:#b0b5bb;stroke-width:2.6;filter:drop-shadow(0 1px 1px #000)}\n#nwMusicDock.nw-themed :is(#nwShuffle,#nwRepeatAll)[aria-pressed=\"true\"]{opacity:1}\n#nwMusicDock :is(#nwShuffle,#nwRepeatAll):focus-visible{outline:2px solid var(--nw-accent,#fff);outline-offset:3px}\n";document.head.append(themeStyle);



 // PC-wide typography, including the separate desktop lyrics bar.
 const fontChoice=document.createElement('select');fontChoice.id='nwFontChoice';fontChoice.className='nw-mini-btn';fontChoice.setAttribute('aria-label','PC 전체 글꼴 선택');fontChoice.title='PC 전체 글꼴 · 자동 저장';
 const fonts=[
  ['default','글꼴: 기본',''],
  ['malgun','맑은 고딕','"Malgun Gothic","맑은 고딕","Apple SD Gothic Neo",sans-serif'],
  ['dotum','돋움','Dotum,"돋움","Apple SD Gothic Neo",sans-serif'],
  ['gulim','굴림','Gulim,"굴림","Apple SD Gothic Neo",sans-serif'],
  ['batang','바탕','Batang,"바탕",AppleMyungjo,serif'],
  ['gungsuh','궁서','Gungsuh,"궁서",Batang,"바탕",AppleMyungjo,serif']
 ];
 const webFonts=[["Noto Sans KR","본고딕"],["Noto Serif KR","본명조"],["Nanum Gothic","나눔고딕"],["Nanum Myeongjo","나눔명조"],["Nanum Pen Script","나눔손글씨 펜"],["Nanum Brush Script","나눔손글씨 붓"],["Gothic A1","고딕 A1"],["Gowun Dodum","고운돋움"],["Gowun Batang","고운바탕"],["Hahmlet","함렛"],["IBM Plex Sans KR","IBM Plex 산스"],["Black Han Sans","검은고딕"],["Jua","주아"],["Do Hyeon","도현"],["Gaegu","개구"],["Gugi","구기"],["Sunflower","해바라기"],["Stylish","스타일리시"],["Poor Story","푸어스토리"],["Cute Font","큐트"],["Song Myung","송명"],["East Sea Dokdo","동해독도"],["Hi Melody","하이멜로디"],["Gamja Flower","감자꽃"],["Single Day","싱글데이"],["Dongle","동글"],["Gasoek One","가석"],["Bagel Fat One","베이글 팻"],["Diphylleia","산하엽"],["Yeon Sung","연성"],["Kirang Haerang","기랑해랑"],["Black And White Picture","흑백사진"]];
 webFonts.forEach(([family,label],i)=>fonts.push(['web-'+i,label,'"'+family+'","Malgun Gothic",sans-serif',family]));
 const fontLinks=new Map();
 function loadWebFont(family){if(!family||fontLinks.has(family))return;const link=document.createElement('link');link.rel='stylesheet';link.href='https://fonts.googleapis.com/css2?family='+encodeURIComponent(family)+'&display=swap';link.dataset.nwWebFont='1';fontLinks.set(family,link);document.head.append(link);}
 fonts.forEach(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;fontChoice.append(option);});
 $('nwAddTrack').after(fontChoice);
 const fontStyle=document.createElement('style');fontStyle.textContent=`
 @media(min-width:651px){html.nw-custom-font body,html.nw-custom-font body *{font-family:var(--nw-selected-font)!important}
 #nwFontChoice{max-width:125px;height:27px;padding:0 6px;font-size:10px;cursor:pointer}}
 @media(max-width:650px){#nwFontChoice{display:none!important}}
 `;document.head.append(fontStyle);
 function applyFont(value,save=false){
  const chosen=fonts.find(item=>item[0]===value)||fonts[0];fontChoice.value=chosen[0];
  loadWebFont(chosen[3]);
  document.documentElement.classList.toggle('nw-custom-font',!!chosen[2]);
  if(chosen[2])document.documentElement.style.setProperty('--nw-selected-font',chosen[2]);else document.documentElement.style.removeProperty('--nw-selected-font');
  if(save)try{localStorage.setItem('nwDesktopFont',chosen[0]);}catch{}
 }
 let savedFont='default';try{savedFont=localStorage.getItem('nwDesktopFont')||'default';}catch{}applyFont(savedFont);
 fontChoice.onchange=()=>applyFont(fontChoice.value,true);

 // Desktop lyrics stay inside the website and share the player's selected theme.
 const lyricBar=document.createElement('section');lyricBar.id='nwDesktopLyrics';lyricBar.setAttribute('aria-label','데스크탑 가사');
 lyricBar.innerHTML='<div id="nwDesktopLyricsHandle" title="드래그하여 이동"><span id="nwDesktopLyricsTitle">NEWT WORLD · 가사</span><div class="nw-desktop-controls"><button type="button" id="nwDesktopLyricsPrev" aria-label="이전 곡" title="이전 곡">⏮</button><button type="button" id="nwDesktopLyricsPlay" aria-label="재생 또는 일시정지">▶</button><button type="button" id="nwDesktopLyricsNextTrack" aria-label="다음 곡" title="다음 곡">⏭</button><button type="button" id="nwDesktopLyricsClose" aria-label="데스크탑 가사 닫기">×</button><label class="nw-desktop-opacity" title="배경 투명도: 오른쪽으로 갈수록 투명해집니다">투명도<input id="nwDesktopLyricsOpacity" type="range" min="0" max="100" step="1" value="0" aria-label="가사 바 배경 투명도"></label></div></div><div id="nwDesktopLyricsCurrent"></div><div id="nwDesktopLyricsNext"></div>';
 document.body.append(lyricBar);
 const opacityInput=$('nwDesktopLyricsOpacity');
 function setBarTransparency(value,save=false){const n=Math.max(0,Math.min(100,Number(value)||0));opacityInput.value=String(n);opacityInput.setAttribute('aria-valuetext',n+'% 투명');lyricBar.style.setProperty('--nw-lyrics-opacity',String(1-n/100));if(save)try{localStorage.setItem('nwDesktopLyricsTransparency',String(n));}catch{}}
 let savedTransparency=0;try{savedTransparency=localStorage.getItem('nwDesktopLyricsTransparency')||0;}catch{}setBarTransparency(savedTransparency);
 opacityInput.oninput=()=>setBarTransparency(opacityInput.value,true);
 const lyricToggle=document.createElement('button');lyricToggle.id='nwDesktopLyricsToggle';lyricToggle.type='button';lyricToggle.className='nw-mini-btn';$('nwLyricsToggle').after(lyricToggle);
 let desktopLyricsOn=true;try{desktopLyricsOn=localStorage.getItem('nwDesktopLyricsOn')!=='0';}catch{}
 function showDesktopLyrics(value){desktopLyricsOn=value;lyricBar.hidden=!value;lyricToggle.textContent='데스크탑 가사 '+(value?'ON':'OFF');lyricToggle.setAttribute('aria-pressed',String(value));try{localStorage.setItem('nwDesktopLyricsOn',value?'1':'0');}catch{}}
 lyricToggle.onclick=()=>showDesktopLyrics(!desktopLyricsOn);$('nwDesktopLyricsClose').onclick=()=>showDesktopLyrics(false);showDesktopLyrics(desktopLyricsOn);
 const barStyle=document.createElement('style');barStyle.textContent=`
 #nwDesktopLyrics{position:fixed;z-index:99970;left:25vw;top:18px;width:50vw;box-sizing:border-box;padding:5px 112px 5px 12px;border:0;border-radius:10px;background:transparent;color:var(--nw-text);text-align:center;isolation:isolate}
 #nwDesktopLyrics::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;border:1px solid var(--nw-border);border-radius:inherit;background:var(--nw-panel);opacity:var(--nw-lyrics-opacity,1)}
 #nwDesktopLyrics[hidden]{display:none}
 #nwDesktopLyricsHandle{position:absolute;inset:0;display:flex;justify-content:flex-end;align-items:center;padding-right:6px;cursor:move;touch-action:none;user-select:none;color:var(--nw-muted)}
 #nwDesktopLyricsTitle{display:none}
 #nwDesktopLyricsHandle .nw-desktop-controls{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:3px;width:100px;cursor:default}
 #nwDesktopLyrics button{display:inline-flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box;flex:0 0 22px;line-height:1!important;text-align:center;letter-spacing:0!important;font-family:Arial,sans-serif!important;font-size:13px!important;font-weight:400!important;padding:0;width:22px;height:22px;border-radius:5px;border:1px solid var(--nw-border);background:var(--nw-control);color:var(--nw-text);cursor:pointer;font-size:13px}
 #nwDesktopLyrics .nw-desktop-opacity{display:flex;align-items:center;gap:3px;font-size:9px;line-height:16px;white-space:nowrap}
 #nwDesktopLyricsOpacity{width:62px;min-width:0;height:14px;padding:0;margin:0;accent-color:var(--nw-accent);cursor:pointer}
 #nwDesktopLyricsCurrent,#nwDesktopLyricsNext{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;line-height:1.15;min-height:1.15em;pointer-events:none;text-shadow:0 1px 3px #0008}
 #nwDesktopLyricsCurrent{font-size:clamp(22px,2.2vw,38px);font-weight:850;color:var(--nw-text)}
 #nwDesktopLyricsNext{font-size:clamp(17px,1.6vw,28px);font-weight:700;color:var(--nw-muted);margin-top:1px}
 @media(max-width:650px){#nwDesktopLyrics,#nwDesktopLyricsToggle{display:none!important}}
 `;document.head.append(barStyle);
 let barDrag=null;
 $('nwDesktopLyricsHandle').onpointerdown=e=>{if(e.button!==0||e.target.closest('button,input,label'))return;const r=lyricBar.getBoundingClientRect();barDrag={x:e.clientX-r.left,y:e.clientY-r.top};e.currentTarget.setPointerCapture(e.pointerId);};
 $('nwDesktopLyricsHandle').onpointermove=e=>{if(!barDrag)return;lyricBar.style.left=Math.max(0,Math.min(innerWidth-lyricBar.offsetWidth,e.clientX-barDrag.x))+'px';lyricBar.style.top=Math.max(0,Math.min(innerHeight-lyricBar.offsetHeight,e.clientY-barDrag.y))+'px';};
 $('nwDesktopLyricsHandle').onpointerup=$('nwDesktopLyricsHandle').onpointercancel=()=>{if(barDrag)rememberBarPosition();barDrag=null;};
 let barPosition=null;try{const p=JSON.parse(localStorage.getItem('nwDesktopLyricsPosition')||'null');if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))barPosition=p;}catch{}
 function keepBarPosition(){if(!barPosition||!matchMedia('(min-width:651px)').matches)return;lyricBar.style.left=Math.max(0,Math.min(innerWidth-lyricBar.offsetWidth,barPosition.x))+'px';lyricBar.style.top=Math.max(0,Math.min(innerHeight-lyricBar.offsetHeight,barPosition.y))+'px';}
 function rememberBarPosition(){const r=lyricBar.getBoundingClientRect();barPosition={x:r.left,y:r.top};try{localStorage.setItem('nwDesktopLyricsPosition',JSON.stringify(barPosition));}catch{}}
 window.addEventListener('resize',keepBarPosition);requestAnimationFrame(keepBarPosition);
 function initDesktopLyrics(){
  const api=window.NWMusicAdminAPI;if(!api)return;
  function text(id,value){if($(id).textContent!==value)$(id).textContent=value;}
  function update(){
   const t=api.current(),time=api.audio.currentTime||0;
   const lines=(t?.syncedLyrics||[]).filter(x=>x&&Number.isFinite(Number(x.time))&&String(x.text||'').trim()&&x.meta!==true&&!/^\s*[\[(].*[\])]\s*$/.test(x.text)&&!/^(Intro|Verse|Chorus|Bridge|Outro|Pre-Chorus|Final|Guitar|Bright Key Change)/i.test(x.text));
   let at=-1;for(let i=0;i<lines.length;i++){if(Number(lines[i].time)<=time)at=i;else break;}
   text('nwDesktopLyricsTitle',t?.title||'NEWT WORLD · 가사');
   text('nwDesktopLyricsCurrent',at>=0?String(lines[at].text):(t?.title||'곡을 선택해주세요'));
   text('nwDesktopLyricsNext',lines[at+1]?String(lines[at+1].text):(lines.length?'':(t?.lyrics?'싱크 가사가 등록되지 않은 곡입니다.':'등록된 가사가 없습니다.')));
   text('nwDesktopLyricsPlay',api.audio.paused?'▶':'❚❚');
  }
  $('nwDesktopLyricsPlay').onclick=()=>$('nwPlay').click();
  $('nwDesktopLyricsPrev').onclick=()=>$('nwPrev').click();
  $('nwDesktopLyricsNextTrack').onclick=()=>$('nwNext').click();
  ['timeupdate','loadedmetadata','play','pause','emptied','seeking'].forEach(name=>api.audio.addEventListener(name,update));
  window.addEventListener('nw-music-library-updated',update);update();
 }
 if(window.NWMusicAdminAPI)initDesktopLyrics();else window.addEventListener('nw-music-ready',initDesktopLyrics,{once:true});

 function hsvToHex(h,s,v){s/=100;v/=100;const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return '#'+rgb.map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('');}
 function fromHex(hex){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(...rgb),min=Math.min(...rgb),d=max-min;val=max*100;sat=max?d/max*100:0;if(d){hue=(max===rgb[0]?(rgb[1]-rgb[2])/d:max===rgb[1]?(rgb[2]-rgb[0])/d+2:(rgb[0]-rgb[1])/d+4)*60;hue=(hue+360)%360;}}
 function apply(hex,save=true){
  if(!/^#[0-9a-f]{6}$/i.test(hex))return;hex=hex.toLowerCase();
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));const shade=k=>'rgb('+rgb.map(n=>Math.round(n*k)).join(',')+')';
  dock.style.setProperty('--nw-player-bg',`radial-gradient(ellipse at 45% 12%,${shade(.65)} 0%,${shade(.32)} 48%,${shade(.16)} 100%)`);
  dock.style.setProperty('--nw-mode-color',hex);
  const linear=rgb.map(n=>{n/=255;return n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4);});
  const luminance=.2126*linear[0]+.7152*linear[1]+.0722*linear[2];
  dock.style.setProperty('--nw-mode-bg',luminance>.179?'#000000':'#ffffff');
  // Keep controls in the chosen hue, with fixed lightness for readable contrast.
  const tone=light=>'hsl('+Math.round(hue)+','+Math.round(sat*.7)+'%,'+light+'%)';
  const palette={control:20,hover:27,active:32,panel:12,border:48,accent:80,text:96,muted:76,ink:12};
  Object.entries(palette).forEach(([name,light])=>dock.style.setProperty('--nw-'+name,tone(light)));
  dock.classList.add('nw-themed');
  Object.entries(palette).forEach(([name,light])=>lyricBar.style.setProperty('--nw-'+name,tone(light)));
  // The modal is attached to body, outside the dock's inherited theme.
  const guide=$('nwBackgroundGuide');
  if(guide){Object.entries(palette).forEach(([name,light])=>guide.style.setProperty('--nw-'+name,tone(light)));guide.classList.add('nw-themed');}
  button.style.setProperty('--nw-color-dot',hex);$('nwColorHex').value=hex;$('nwColorHue').value=String(Math.round(hue));$('nwColorSquare').style.backgroundColor=`hsl(${hue},100%,50%)`;$('nwColorPoint').style.left=sat+'%';$('nwColorPoint').style.top=(100-val)+'%';$('nwColorSquare').setAttribute('aria-valuenow',String(Math.round(val)));$('nwColorSquare').setAttribute('aria-valuetext',`채도 ${Math.round(sat)}%, 밝기 ${Math.round(val)}%`);
  panel.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===hex)));
  if(save)try{localStorage.setItem(key,hex);}catch{}
 }
 function choose(hex,save=true){if(!/^#[0-9a-f]{6}$/i.test(hex))return;fromHex(hex);apply(hex,save);}
 function close(){panel.hidden=true;button.setAttribute('aria-expanded','false');}
 button.onclick=()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)$('nwColorSquare').focus();};
 $('nwColorClose').onclick=()=>{close();button.focus();};
 panel.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>choose(b.dataset.color));
 $('nwColorReset').onclick=()=>{choose(defaultColor,false);try{localStorage.removeItem(key);}catch{}};
 $('nwColorHue').oninput=e=>{hue=Number(e.target.value);apply(hsvToHex(hue,sat,val));};
 $('nwColorHex').oninput=e=>choose(e.target.value);
 $('nwColorHex').onblur=()=>apply(hsvToHex(hue,sat,val),false);
 const square=$('nwColorSquare');let dragging=false;
 function point(e){const r=square.getBoundingClientRect();sat=Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100));val=100-Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100));apply(hsvToHex(hue,sat,val));}
 square.onpointerdown=e=>{if(e.button!==0)return;dragging=true;square.setPointerCapture(e.pointerId);point(e);};square.onpointermove=e=>{if(dragging)point(e);};square.onpointerup=square.onpointercancel=()=>{dragging=false;};
 square.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const n=e.shiftKey?10:1;if(e.key==='ArrowLeft')sat-=n;if(e.key==='ArrowRight')sat+=n;if(e.key==='ArrowUp')val+=n;if(e.key==='ArrowDown')val-=n;sat=Math.max(0,Math.min(100,sat));val=Math.max(0,Math.min(100,val));apply(hsvToHex(hue,sat,val));};
 document.addEventListener('pointerdown',e=>{if(!panel.contains(e.target)&&!button.contains(e.target))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){close();button.focus();}});
 window.addEventListener('popstate',close);$('nwCollapseBtn').addEventListener('click',close);$('nwPlayerSettings').addEventListener('click',close);
 let saved;try{saved=localStorage.getItem(key);}catch{}choose(/^#[0-9a-f]{6}$/i.test(saved||'')?saved:defaultColor,false);

 // Relative text sizing keeps each heading/body/control's original hierarchy.
 const sizeChoice=document.createElement('select');sizeChoice.id='nwFontSize';sizeChoice.className='nw-mini-btn';sizeChoice.setAttribute('aria-label','PC 글자 크기');
 [80,90,100,110,120,130,140,150].forEach(n=>{const o=document.createElement('option');o.value=String(n);o.textContent='크기 '+n+'%';sizeChoice.append(o);});
 const weightChoice=document.createElement('select');weightChoice.id='nwFontWeight';weightChoice.className='nw-mini-btn';weightChoice.setAttribute('aria-label','PC 글자 굵기');
 [['default','굵기: 기본'],['300','가늘게'],['400','보통'],['500','중간'],['700','굵게'],['900','아주 굵게']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;weightChoice.append(o);});
 fontChoice.after(sizeChoice,weightChoice);
 let fontScale=100,fontWeight='default';
 try{const n=Number(localStorage.getItem('nwDesktopFontSize'));if([80,90,100,110,120,130,140,150].includes(n))fontScale=n;fontWeight=localStorage.getItem('nwDesktopFontWeight')||'default';}catch{}
 sizeChoice.value=String(fontScale);weightChoice.value=fontWeight;if(!weightChoice.value)weightChoice.value='default';
 const typeStyle=document.createElement('style');typeStyle.textContent=`
 @media(min-width:651px){
 html.nw-type-measuring body *{transition:none!important}
 html.nw-sized body [data-nw-type-size]{font-size:calc(var(--nw-original-size) * var(--nw-font-scale,1))!important;transition-property:background-color,color,border-color,opacity,transform!important}
 html.nw-weighted body,html.nw-weighted body *{font-weight:var(--nw-font-weight)!important}
 #nwFontSize,#nwFontWeight{height:27px;padding:0 5px;max-width:108px;font-size:10px}
 }
 @media(max-width:650px){#nwFontSize,#nwFontWeight,#nwLyricsAlwaysOnTop,#nwLyricsPipStatus{display:none!important}}
 `;document.head.append(typeStyle);
 let typeFrame=0;
 function measureType(){
  typeFrame=0;const root=document.documentElement;root.classList.add('nw-type-measuring');root.classList.remove('nw-sized');
  const nodes=[...document.body.querySelectorAll('*')].filter(el=>el instanceof HTMLElement&&!['SCRIPT','STYLE','LINK','META'].includes(el.tagName));
  const sizes=nodes.map(el=>getComputedStyle(el).fontSize);
  nodes.forEach((el,i)=>{el.style.setProperty('--nw-original-size',sizes[i]);el.setAttribute('data-nw-type-size','');});
  root.style.setProperty('--nw-font-scale',String(fontScale/100));root.classList.toggle('nw-sized',fontScale!==100);void document.body.offsetHeight;root.classList.remove('nw-type-measuring');keepBarPosition();
 }
 function scheduleType(){if(!typeFrame)typeFrame=requestAnimationFrame(measureType);}
 function setWeight(){const v=weightChoice.value;document.documentElement.style.setProperty('--nw-font-weight',v==='default'?'400':v);document.documentElement.classList.toggle('nw-weighted',v!=='default');}
 sizeChoice.onchange=()=>{fontScale=Number(sizeChoice.value);try{localStorage.setItem('nwDesktopFontSize',String(fontScale));}catch{}measureType();};
 weightChoice.onchange=()=>{try{localStorage.setItem('nwDesktopFontWeight',weightChoice.value);}catch{}setWeight();};
 new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1)))scheduleType();}).observe(document.body,{childList:true,subtree:true});
 window.addEventListener('resize',scheduleType);document.fonts?.addEventListener('loadingdone',scheduleType);setWeight();scheduleType();

 const pipButton=document.createElement('button');pipButton.id='nwLyricsAlwaysOnTop';pipButton.className='nw-mini-btn';pipButton.type='button';pipButton.textContent='항상 위 가사창';pipButton.setAttribute('aria-pressed','false');weightChoice.after(pipButton);
 const pipStatus=document.createElement('span');pipStatus.id='nwLyricsPipStatus';pipStatus.setAttribute('role','status');pipStatus.style.cssText='font-size:11px;flex-basis:100%';pipStatus.hidden=true;pipButton.after(pipStatus);
 let pipWindow=null,pipObserver=null;
 pipButton.onclick=async()=>{
  if(pipWindow&&!pipWindow.closed){pipWindow.close();return;}
  pipStatus.hidden=true;
  if(!window.documentPictureInPicture?.requestWindow){pipStatus.textContent='이 브라우저에서는 항상 위 가사창을 지원하지 않습니다. 지원되는 최신 Chrome 또는 Edge에서 이용해주세요.';pipStatus.hidden=false;return;}
  try{
   pipWindow=await window.documentPictureInPicture.requestWindow({width:Math.round(Math.min(900,innerWidth*.5)),height:140});
   const pd=pipWindow.document;pd.title='뉴트월드 · 항상 위 가사';
   const style=pd.createElement('style');style.textContent='html,body{margin:0;width:100%;height:100%;overflow:hidden}body{background:#071018;color:#fff}#pipBar{box-sizing:border-box;min-height:100%;position:relative;isolation:isolate;display:flex;flex-direction:column;justify-content:center;padding:6px 110px 6px 12px;text-align:center}#pipBar::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--nw-panel);opacity:var(--nw-lyrics-opacity,1)}.line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.15;text-shadow:0 1px 3px #0008}#pipControls{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:96px;display:flex;flex-wrap:wrap;gap:3px;justify-content:center}button{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;line-height:1;text-align:center;letter-spacing:0;font-family:Arial,sans-serif;font-size:14px;font-weight:400;width:28px;height:25px;padding:0;border:1px solid var(--nw-border);border-radius:5px;background:var(--nw-control);color:var(--nw-text);cursor:pointer}label{font-size:10px;display:flex;align-items:center;gap:3px}input{width:58px;margin:0;accent-color:var(--nw-accent)}';
   pd.head.append(style);
   pd.body.innerHTML='<section id="pipBar"><div class="line" id="pipCurrent"></div><div class="line" id="pipNext"></div><div id="pipControls"><button id="pipPrev" aria-label="이전 곡">⏮</button><button id="pipPlay" aria-label="재생 또는 일시정지">▶</button><button id="pipNextTrack" aria-label="다음 곡">⏭</button><label>투명도<input id="pipOpacity" type="range" min="0" max="100" aria-label="배경 투명도"></label></div></section>';
   const target=pd.getElementById('pipBar'),copiedFonts=new Set();
   function syncPip(){
    if(!pipWindow||pipWindow.closed)return;
    target.style.cssText=lyricBar.style.cssText;target.style.removeProperty('left');target.style.removeProperty('top');
    for(const [from,to] of [['nwDesktopLyricsCurrent','pipCurrent'],['nwDesktopLyricsNext','pipNext']]){
     const source=$(from),dest=pd.getElementById(to),cs=getComputedStyle(source);
     if(dest.textContent!==source.textContent)dest.textContent=source.textContent;
     dest.style.fontFamily=cs.fontFamily;dest.style.fontSize=cs.fontSize;dest.style.fontWeight=cs.fontWeight;dest.style.color=cs.color;
    }
    pd.getElementById('pipPlay').textContent=$('nwDesktopLyricsPlay').textContent;
    pd.getElementById('pipOpacity').value=opacityInput.value;
    document.querySelectorAll('link[data-nw-web-font]').forEach(link=>{if(!copiedFonts.has(link.href)){pd.head.append(link.cloneNode());copiedFonts.add(link.href);}});
   }
   pd.getElementById('pipPrev').onclick=()=>$('nwPrev').click();pd.getElementById('pipPlay').onclick=()=>$('nwPlay').click();pd.getElementById('pipNextTrack').onclick=()=>$('nwNext').click();
   pd.getElementById('pipOpacity').oninput=e=>setBarTransparency(e.target.value,true);
   pipObserver=new MutationObserver(syncPip);pipObserver.observe(lyricBar,{childList:true,subtree:true,attributes:true});pipObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class','style']});syncPip();
   pipButton.textContent='항상 위 가사창 닫기';pipButton.setAttribute('aria-pressed','true');
   pipWindow.addEventListener('pagehide',()=>{pipObserver?.disconnect();pipObserver=null;pipWindow=null;pipButton.textContent='항상 위 가사창';pipButton.setAttribute('aria-pressed','false');},{once:true});
  }catch(e){pipStatus.textContent='항상 위 가사창을 열지 못했습니다. 버튼을 다시 눌러주세요. '+e.message;pipStatus.hidden=false;}
 };


 // Custom listbox renders each name in its own face; native select menus cannot
 // reliably do so across browsers. Keep the select as the saved-value adapter.
 fontChoice.style.setProperty('display','none','important');
 const fontPicker=document.createElement('button');fontPicker.id='nwFontPicker';fontPicker.type='button';fontPicker.className='nw-mini-btn';fontPicker.setAttribute('aria-haspopup','listbox');fontPicker.setAttribute('aria-expanded','false');fontPicker.setAttribute('aria-controls','nwFontPreviewList');fontChoice.after(fontPicker);
 const fontList=document.createElement('div');fontList.id='nwFontPreviewList';fontList.hidden=true;fontList.setAttribute('role','listbox');fontList.setAttribute('aria-label','글꼴 모양 미리보기');dock.append(fontList);
 const previewStyle=document.createElement('style');previewStyle.textContent=`
 #nwFontPicker{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 #nwFontPreviewList{position:absolute;z-index:20;right:12px;bottom:65px;width:min(310px,calc(100vw - 40px));max-height:min(420px,60vh);overflow:auto;overscroll-behavior:contain;padding:6px;border:1px solid var(--nw-border);border-radius:12px;background:var(--nw-panel);box-shadow:0 12px 32px #0007}
 #nwFontPreviewList[hidden]{display:none!important}
 #nwFontPreviewList button{display:block;width:100%;height:auto;min-height:42px;text-align:left;padding:7px 12px;border-radius:7px;white-space:normal;line-height:1.3}
 #nwFontPreviewList button:focus-visible{outline:2px solid var(--nw-accent);outline-offset:-2px}
 @media(max-width:650px){#nwFontPicker,#nwFontPreviewList{display:none!important}}
 `;document.head.append(previewStyle);
 const fontItems=[];
 function updateFontPicker(){
  const item=fonts.find(f=>f[0]===fontChoice.value)||fonts[0];fontPicker.textContent=item[1]+' ▾';fontPicker.setAttribute('aria-label','글꼴 선택: '+item[1]);
  fontPicker.style.setProperty('font-family',item[2]||'system-ui,sans-serif','important');
  fontItems.forEach(b=>b.setAttribute('aria-selected',String(b.dataset.font===item[0])));
 }
 function closeFontList(focus=false){fontList.hidden=true;fontPicker.setAttribute('aria-expanded','false');if(focus)fontPicker.focus();}
 const fontPreviewObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){const item=fonts.find(f=>f[0]===entry.target.dataset.font);loadWebFont(item?.[3]);}});},{root:fontList,rootMargin:'70px'});
 fonts.forEach(([value,label,family])=>{
  const b=document.createElement('button');b.type='button';b.dataset.font=value;b.setAttribute('role','option');b.textContent=label;
  b.style.setProperty('font-family',family||'system-ui,sans-serif','important');b.style.setProperty('font-weight','400','important');b.style.setProperty('font-size','21px','important');
  b.onclick=()=>{fontChoice.value=value;fontChoice.dispatchEvent(new Event('change'));updateFontPicker();closeFontList(true);};
  b.onkeydown=e=>{const i=fontItems.indexOf(b);let next;if(e.key==='ArrowDown')next=(i+1)%fontItems.length;if(e.key==='ArrowUp')next=(i+fontItems.length-1)%fontItems.length;if(e.key==='Home')next=0;if(e.key==='End')next=fontItems.length-1;if(next!==undefined){e.preventDefault();fontItems[next].focus();}if(e.key==='Escape'){e.preventDefault();closeFontList(true);}};
  fontItems.push(b);fontList.append(b);fontPreviewObserver.observe(b);
 });
 fontPicker.onclick=()=>{if(!fontList.hidden){closeFontList();return;}fontList.hidden=false;fontPicker.setAttribute('aria-expanded','true');const chosen=fontItems.find(b=>b.dataset.font===fontChoice.value)||fontItems[0];chosen.focus();chosen.scrollIntoView({block:'nearest'});};
 fontPicker.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();if(fontList.hidden)fontPicker.click();}};
 document.addEventListener('pointerdown',e=>{if(!fontList.contains(e.target)&&!fontPicker.contains(e.target))closeFontList();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!fontList.hidden)closeFontList(true);});
 fontChoice.addEventListener('change',updateFontPicker);updateFontPicker();

})();

