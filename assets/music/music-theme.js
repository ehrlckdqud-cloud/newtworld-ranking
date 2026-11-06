(function(){
 'use strict';
 const $=id=>document.getElementById(id),dock=$('nwMusicDock'),button=$('nwBackgroundColor');
 if(!dock||!button)return;
 const key='nwMusicBackgroundColor',defaultColor='#1382d7';let hue=140,sat=43,val=34;
 const panel=document.createElement('section');panel.id='nwColorPanel';panel.hidden=true;panel.setAttribute('aria-label','플레이어 배경 색상');
 panel.innerHTML=`<div class="nw-color-head"><b>배경 색상</b><button type="button" id="nwColorClose" aria-label="색상 설정 닫기">×</button></div><div class="nw-color-presets"><button type="button" data-color="#315641" aria-label="포레스트" title="포레스트" style="--swatch:#315641"></button><button type="button" data-color="#21805c" aria-label="에메랄드" title="에메랄드" style="--swatch:#21805c"></button><button type="button" data-color="#51bfa0" aria-label="민트" title="민트" style="--swatch:#51bfa0"></button><button type="button" data-color="#227b88" aria-label="틸" title="틸" style="--swatch:#227b88"></button><button type="button" data-color="#589bce" aria-label="스카이" title="스카이" style="--swatch:#589bce"></button><button type="button" data-color="#304f86" aria-label="미드나잇" title="미드나잇" style="--swatch:#304f86"></button><button type="button" data-color="#50449a" aria-label="인디고" title="인디고" style="--swatch:#50449a"></button><button type="button" data-color="#8955b2" aria-label="퍼플" title="퍼플" style="--swatch:#8955b2"></button><button type="button" data-color="#aa87c9" aria-label="라벤더" title="라벤더" style="--swatch:#aa87c9"></button><button type="button" data-color="#df79ac" aria-label="핑크" title="핑크" style="--swatch:#df79ac"></button><button type="button" data-color="#bf4f7e" aria-label="로즈" title="로즈" style="--swatch:#bf4f7e"></button><button type="button" data-color="#c94b4b" aria-label="레드" title="레드" style="--swatch:#c94b4b"></button><button type="button" data-color="#df826b" aria-label="코랄" title="코랄" style="--swatch:#df826b"></button><button type="button" data-color="#bd8b36" aria-label="앰버" title="앰버" style="--swatch:#bd8b36"></button><button type="button" data-color="#80543b" aria-label="웜 브라운" title="웜 브라운" style="--swatch:#80543b"></button><button type="button" data-color="#555963" aria-label="차콜" title="차콜" style="--swatch:#555963"></button></div><div id="nwColorSquare" role="slider" tabindex="0" aria-label="채도와 밝기, 방향키로 조절" aria-valuemin="0" aria-valuemax="100"><span id="nwColorPoint"></span></div><label class="nw-color-hue">색조 <input id="nwColorHue" type="range" min="0" max="359" value="140"></label><div class="nw-color-bottom"><label>색상 코드 <input id="nwColorHex" type="text" maxlength="7" spellcheck="false" aria-label="배경 색상 코드"></label><button id="nwColorReset" type="button">기본값으로 복원</button></div><small>자동 저장 · 같은 기기와 브라우저에 적용</small>`;
 dock.append(panel);
 const themeStyle=document.createElement('style');themeStyle.id='nw-music-theme-controls';themeStyle.textContent="\n#nwMusicDock.nw-themed :is(button,select,input[type=\"text\"]):not([data-color]){\n background:var(--nw-control)!important;color:var(--nw-text)!important;border-color:var(--nw-border)!important}\n#nwMusicDock.nw-themed :is(button,select):not([data-color]):hover{background:var(--nw-hover)!important}\n#nwMusicDock.nw-themed :is(button.active,button[aria-pressed=\"true\"],button[aria-selected=\"true\"]):not([data-color]){\n background:var(--nw-active)!important;color:var(--nw-text)!important;border-color:var(--nw-accent)!important}\n#nwMusicDock.nw-themed #nwPlay{background:var(--nw-accent)!important;color:var(--nw-ink)!important}\n#nwMusicDock.nw-themed :is(#nwColorPanel,#nwEQPanel,#nwTrackMenu,.nw-tools){background:var(--nw-panel)!important;color:var(--nw-text)!important;border-color:var(--nw-border)!important}\n#nwMusicDock.nw-themed :is(.nw-track-artist,.nw-time,.nw-volume-label,#nwColorPanel small,#nwEQPanel small,.nw-lyric-line){color:var(--nw-muted)!important}\n#nwMusicDock.nw-themed .nw-lyrics{background:var(--nw-panel)!important;border-color:var(--nw-border)!important}\n#nwMusicDock.nw-themed .nw-lyric-line.active{background:var(--nw-active)!important;color:var(--nw-text)!important;text-shadow:none}\n#nwMusicDock.nw-themed :is(.nw-range-fill,.nw-eq-thumb,.nw-live-dot){background:var(--nw-accent)!important}\n#nwMusicDock.nw-themed .nw-live-dot{box-shadow:0 0 12px var(--nw-accent)}\n#nwMusicDock.nw-themed :is(.nw-cover-wrap,.nw-music-shell){border-color:var(--nw-border)!important}\n#nwMusicDock.nw-themed .nw-color-hue input{accent-color:var(--nw-accent)}\n#nwMusicDock.nw-themed .nw-eq-rail{background:linear-gradient(to bottom,var(--nw-border) 0%,var(--nw-border) var(--eq-position,50%),var(--nw-accent) var(--eq-position,50%),var(--nw-accent) 100%)!important}\n";themeStyle.textContent+="\n#nwBackgroundGuide.nw-themed{background:var(--nw-panel);color:var(--nw-text);border-color:var(--nw-border)}\n#nwBackgroundGuide.nw-themed::backdrop{background:var(--nw-ink);opacity:.75}\n#nwBackgroundGuide.nw-themed strong{color:var(--nw-accent)}\n#nwBackgroundGuide.nw-themed ol{background:var(--nw-control)}\n#nwBackgroundGuide.nw-themed .nw-bg-guide-note{color:var(--nw-muted)}\n#nwBackgroundGuide.nw-themed #nwBackgroundGuideConfirm{background:var(--nw-accent);color:var(--nw-ink)}\n#nwBackgroundGuide.nw-themed #nwBackgroundGuideConfirm:hover{background:var(--nw-text)}\n";themeStyle.textContent+="\n/* Playback mode icons: white when off, selected theme color when on. */\n#nwMusicDock.nw-themed :is(#nwShuffle,#nwRepeatAll){\n color:#fff!important;background:var(--nw-control)!important;border-color:var(--nw-border)!important}\n#nwMusicDock.nw-themed :is(#nwShuffle,#nwRepeatAll)[aria-pressed=\"true\"]{\n color:var(--nw-mode-color)!important;background:var(--nw-mode-bg)!important;border-color:var(--nw-mode-color)!important;box-shadow:0 0 0 1px var(--nw-mode-color)}\n#nwMusicDock.nw-themed :is(#nwShuffle,#nwRepeatAll) svg{color:inherit;stroke:currentColor}\n";themeStyle.textContent+="\n/* Off modes remain clickable, but have dimmed icons and a clear diagonal slash. */\n#nwMusicDock.nw-themed :is(#nwShuffle,#nwRepeatAll)[aria-pressed=\"false\"]{\n color:#82878d!important;background:#161a1f!important;border-color:#444a50!important;box-shadow:none!important}\n#nwMusicDock :is(#nwShuffle,#nwRepeatAll) .nw-mode-slash{\n stroke:#b0b5bb;stroke-width:2.6;filter:drop-shadow(0 1px 1px #000)}\n#nwMusicDock.nw-themed :is(#nwShuffle,#nwRepeatAll)[aria-pressed=\"true\"]{opacity:1}\n#nwMusicDock :is(#nwShuffle,#nwRepeatAll):focus-visible{outline:2px solid var(--nw-accent,#fff);outline-offset:3px}\n";document.head.append(themeStyle);


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
 #nwDesktopLyrics button{padding:0;width:22px;height:22px;border-radius:5px;border:1px solid var(--nw-border);background:var(--nw-control);color:var(--nw-text);cursor:pointer;font-size:13px}
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
 $('nwDesktopLyricsHandle').onpointerup=$('nwDesktopLyricsHandle').onpointercancel=()=>{barDrag=null;};
 window.addEventListener('resize',()=>{lyricBar.style.left='';lyricBar.style.top='';});
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
})();

