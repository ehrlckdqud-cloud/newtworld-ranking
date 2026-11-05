(function(){
 'use strict';
 const $=id=>document.getElementById(id),dock=$('nwMusicDock'),button=$('nwBackgroundColor');
 if(!dock||!button)return;
 const key='nwMusicBackgroundColor',defaultColor='#315641';let hue=140,sat=43,val=34;
 const panel=document.createElement('section');panel.id='nwColorPanel';panel.hidden=true;panel.setAttribute('aria-label','플레이어 배경 색상');
 panel.innerHTML=`<div class="nw-color-head"><b>배경 색상</b><button type="button" id="nwColorClose" aria-label="색상 설정 닫기">×</button></div><div class="nw-color-presets"><button type="button" data-color="#315641" aria-label="포레스트" style="--swatch:#315641"></button><button type="button" data-color="#304f86" aria-label="미드나잇" style="--swatch:#304f86"></button><button type="button" data-color="#555963" aria-label="차콜" style="--swatch:#555963"></button><button type="button" data-color="#80543b" aria-label="웜 브라운" style="--swatch:#80543b"></button></div><div id="nwColorSquare" role="slider" tabindex="0" aria-label="채도와 밝기, 방향키로 조절" aria-valuemin="0" aria-valuemax="100"><span id="nwColorPoint"></span></div><label class="nw-color-hue">색조 <input id="nwColorHue" type="range" min="0" max="359" value="140"></label><div class="nw-color-bottom"><label>색상 코드 <input id="nwColorHex" type="text" maxlength="7" spellcheck="false" aria-label="배경 색상 코드"></label><button id="nwColorReset" type="button">기본값으로 복원</button></div><small>자동 저장 · 같은 기기와 브라우저에 적용</small>`;
 dock.append(panel);
 function hsvToHex(h,s,v){s/=100;v/=100;const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return '#'+rgb.map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('');}
 function fromHex(hex){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(...rgb),min=Math.min(...rgb),d=max-min;val=max*100;sat=max?d/max*100:0;if(d){hue=(max===rgb[0]?(rgb[1]-rgb[2])/d:max===rgb[1]?(rgb[2]-rgb[0])/d+2:(rgb[0]-rgb[1])/d+4)*60;hue=(hue+360)%360;}}
 function apply(hex,save=true){
  if(!/^#[0-9a-f]{6}$/i.test(hex))return;hex=hex.toLowerCase();
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));const shade=k=>'rgb('+rgb.map(n=>Math.round(n*k)).join(',')+')';
  if(hex===defaultColor)dock.style.removeProperty('--nw-player-bg');else dock.style.setProperty('--nw-player-bg',`radial-gradient(ellipse at 45% 12%,${shade(.65)} 0%,${shade(.32)} 48%,${shade(.16)} 100%)`);
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
