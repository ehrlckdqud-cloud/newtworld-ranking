(function(){
 'use strict';
 const $=id=>document.getElementById(id),audio=$('nwAudio'),button=$('nwEqualizer'),dock=$('nwMusicDock');
 if(!audio||!button||!dock)return;
 const frequencies=[60,230,910,3600,14000],labels=['60 Hz','230 Hz','910 Hz','3.6 kHz','14 kHz'];
 const presets={'기본':[0,0,0,0,0],'저음 강조':[6,3,0,-1,0],'보컬 강조':[-2,-1,4,3,0],'재즈':[3,1,0,2,3],'팝':[-1,2,3,2,1],'록':[4,2,-1,3,4]};
 let state={enabled:false,gains:[0,0,0,0,0]},context,source,filters,output;
 try{const saved=JSON.parse(localStorage.getItem('nwMusicEQ')||'null');if(saved&&Array.isArray(saved.gains)&&saved.gains.length===5&&saved.gains.every(Number.isFinite)){state={enabled:saved.enabled===true,gains:saved.gains.map(v=>Math.max(-12,Math.min(12,v)))}}}catch{}
 const panel=document.createElement('section');panel.id='nwEQPanel';panel.hidden=true;panel.setAttribute('aria-label','이퀄라이저 설정');
 panel.innerHTML='<div class="nw-eq-head"><b>이퀄라이저</b><button id="nwEQClose" type="button" aria-label="이퀄라이저 닫기">×</button></div><div class="nw-eq-options"><button id="nwEQEnabled" type="button">OFF</button><select id="nwEQPreset" aria-label="이퀄라이저 프리셋">'+Object.keys(presets).map(n=>'<option>'+n+'</option>').join('')+'<option value="custom">직접 조절</option></select><button id="nwEQReset" type="button">초기화</button></div><div class="nw-eq-bands">'+labels.map((label,i)=>'<label><span>'+label+'</span><div class="nw-eq-slider" role="slider" tabindex="0" aria-orientation="vertical" aria-valuemin="-12" aria-valuemax="12" data-band="'+i+'" aria-label="'+label+' 조절"><span class="nw-eq-rail"><span class="nw-eq-thumb"></span></span></div><output>0 dB</output></label>').join('')+'</div><small>저음 ← 주파수 → 고음 · −12 ~ +12 dB<br>자동 저장 · 증폭에 따라 출력 여유 자동 조정</small><p id="nwEQStatus" role="status"></p>';
 dock.append(panel);
 const sliders=[...panel.querySelectorAll('[data-band]')];
 function save(){try{localStorage.setItem('nwMusicEQ',JSON.stringify(state))}catch{}}
 function render(){button.classList.toggle('active',state.enabled);$('nwEQEnabled').textContent=state.enabled?'ON':'OFF';$('nwEQEnabled').setAttribute('aria-pressed',String(state.enabled));sliders.forEach((s,i)=>{s.value=state.gains[i];s.setAttribute('aria-valuenow',String(state.gains[i]));s.style.setProperty('--eq-position',((12-state.gains[i])/24*100)+'%');s.nextElementSibling.textContent=(state.gains[i]>0?'+':'')+state.gains[i]+' dB';s.setAttribute('aria-valuetext',state.gains[i]+' 데시벨');});$('nwEQPreset').value=Object.keys(presets).find(n=>presets[n].every((v,i)=>v===state.gains[i]))||'custom';}
 function apply(){if(!context)return;filters.forEach((filter,i)=>filter.gain.setTargetAtTime(state.enabled?state.gains[i]:0,context.currentTime,.025));const boost=state.enabled?state.gains.reduce((sum,v)=>sum+Math.max(0,v),0):0;output.gain.setTargetAtTime(Math.pow(10,-boost/20),context.currentTime,.025);}
 function start(){
  try{
   if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('이 브라우저에서는 이퀄라이저를 지원하지 않습니다.');context=new Audio();filters=frequencies.map((hz,i)=>{const f=context.createBiquadFilter();f.type=i===0?'lowshelf':i===4?'highshelf':'peaking';f.frequency.value=hz;f.Q.value=.8;return f;});output=context.createGain();source=context.createMediaElementSource(audio);let previous=source;for(const filter of filters){previous.connect(filter);previous=filter;}previous.connect(output);output.connect(context.destination);apply();}
   if(context.state!=='running')context.resume().catch(()=>{$('nwEQStatus').textContent='재생 버튼을 눌러 오디오를 다시 시작해주세요.';});
   return true;
  }catch(error){$('nwEQStatus').textContent=error.message;return false;}
 }
 function change(){if(state.enabled&&!start())state.enabled=false;apply();render();save();}
 function close(){panel.hidden=true;button.setAttribute('aria-expanded','false');}
 button.onclick=()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)$('nwEQEnabled').focus();};
 $('nwEQClose').onclick=()=>{close();button.focus();};
 $('nwEQEnabled').onclick=()=>{state.enabled=!state.enabled;change();};
 $('nwEQPreset').onchange=e=>{if(!presets[e.target.value])return;state.gains=[...presets[e.target.value]];state.enabled=true;change();};
 $('nwEQReset').onclick=()=>{state={enabled:false,gains:[0,0,0,0,0]};change();};
 sliders.forEach((slider,i)=>{
  const update=value=>{state.gains[i]=Math.max(-12,Math.min(12,Math.round(value)));state.enabled=true;change();};
  slider.oninput=()=>update(Number(slider.value));
  let pointer=null;
  const move=e=>{const rect=slider.querySelector('.nw-eq-rail').getBoundingClientRect();if(rect.height>0)update(12-24*(e.clientY-rect.top)/rect.height);};
  slider.onpointerdown=e=>{if(e.button!==0||pointer!==null)return;e.preventDefault();pointer=e.pointerId;slider.setPointerCapture(pointer);slider.focus({preventScroll:true});move(e);};
  slider.onpointermove=e=>{if(e.pointerId===pointer){e.preventDefault();move(e);}};
  slider.onpointerup=slider.onpointercancel=slider.onlostpointercapture=e=>{if(e.pointerId===pointer)pointer=null;};
  slider.onkeydown=e=>{const delta={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1,PageUp:3,PageDown:-3}[e.key];if(delta){e.preventDefault();update(state.gains[i]+delta);}else if(e.key==='Home'||e.key==='End'){e.preventDefault();update(e.key==='Home'?-12:12);}};
 });
 document.addEventListener('pointerdown',e=>{if(state.enabled||context)start();if(!panel.contains(e.target)&&!button.contains(e.target))close();},true);
 document.addEventListener('keydown',e=>{if(state.enabled||context)start();if(e.key==='Escape'&&!panel.hidden){close();button.focus();}},true);
 audio.addEventListener('play',()=>{if(state.enabled||context)start();});
 window.addEventListener('popstate',close);$('nwCollapseBtn').addEventListener('click',close);$('nwPlayerSettings').addEventListener('click',close);
 render();
})();
