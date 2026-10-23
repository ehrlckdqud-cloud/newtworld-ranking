export function initSpaceLayout(){
 const body=document.body,root=document.getElementById('nwspace'),toggle=document.getElementById('spTopToggle'),grip=document.getElementById('spRosterResize');if(!toggle||!grip||!root)return;
 let saved={};try{saved=JSON.parse(localStorage.getItem('nw-space-layout-v31')||'{}');}catch{}
 let collapsed=saved.collapsed===true,width=Number(saved.width)||210,drag=null,frame=0;
 const limit=value=>Math.max(84,Math.min(420,Math.max(84,innerWidth*.4),value));
 const save=()=>{try{localStorage.setItem('nw-space-layout-v31',JSON.stringify({collapsed,width}));}catch{}};
 const apply=()=>{width=limit(width);root.style.setProperty('--roster-width',width+'px');grip.setAttribute('aria-valuemin','84');grip.setAttribute('aria-valuemax',String(Math.min(420,Math.max(84,innerWidth*.4))));grip.setAttribute('aria-valuenow',String(Math.round(width)));};
 const fold=()=>{body.classList.toggle('space-top-collapsed',collapsed);toggle.textContent=collapsed?'설정 바 펼치기 ▾':'접기 ▴';toggle.title=collapsed?'상단 바 펼치기':'상단 바 접기';toggle.setAttribute('aria-expanded',String(!collapsed));};
 toggle.onclick=()=>{collapsed=!collapsed;fold();save();};
 grip.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();drag={id:e.pointerId,x:e.clientX,width};grip.setPointerCapture(e.pointerId);body.classList.add('space-roster-resizing');};
 grip.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;width=limit(drag.width+drag.x-e.clientX);if(!frame)frame=requestAnimationFrame(()=>{frame=0;apply();});};
 const finish=e=>{if(!drag||drag.id!==e.pointerId)return;drag=null;if(frame){cancelAnimationFrame(frame);frame=0;}apply();body.classList.remove('space-roster-resizing');save();};
 grip.onpointerup=grip.onpointercancel=grip.onlostpointercapture=finish;
 grip.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();width=e.key==='Home'?84:e.key==='End'?420:width+(e.key==='ArrowLeft'?10:-10);apply();save();};
 grip.ondblclick=()=>{width=210;apply();save();};window.addEventListener('resize',apply);apply();fold();
}
