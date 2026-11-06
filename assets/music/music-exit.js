(function(){
 'use strict';
 if(!window.matchMedia('(max-width:650px)').matches&&!/Android/i.test(navigator.userAgent))return;
 const baseKey='nwExitBase',guardKey='nwExitGuard';
 let leaving=false,watcher=null,guardReady=false;
 function isRoot(){return !['#workout','#attendance','#partner','#profile','#members','#ai','#draw'].includes(location.hash)&&!history.state?.nwMusicPlayer;}
 function arm(fromPlayer=false){
  if(leaving||!isRoot())return;
  // Install the history boundary during a real interaction, like the player entry.
  // Startup-only history entries can be skipped by mobile Back implementations.
  if(!fromPlayer&&!navigator.userActivation?.hasBeenActive)return;
  if(guardReady&&history.state?.[guardKey])return;
  const old=history.state||{},state={...old};delete state[baseKey];delete state[guardKey];
  const depth=old[guardKey]?Number(old.nwExitDepth||2)+1:2;
  history.replaceState({...state,[baseKey]:true,nwExitDepth:depth},'',location.href);
  history.pushState({...state,[guardKey]:true,nwExitDepth:depth},'',location.href);
  guardReady=true;
 }
 const dialog=document.createElement('dialog');dialog.id='nwExitDialog';dialog.setAttribute('aria-labelledby','nwExitTitle');
 dialog.innerHTML='<h2 id="nwExitTitle">종료하시겠습니까?</h2><p>음악이 재생 중이라면 종료되므로 계속 들으려면 홈 버튼을 눌러주세요.</p><div class="nw-exit-actions"><button type="button" id="nwExitCancel" autofocus>취소</button><button type="button" id="nwExitConfirm">확인</button></div>';
 document.body.appendChild(dialog);
 function releaseWatcher(){if(watcher){watcher.destroy();watcher=null;}}
 function showExit(){releaseWatcher();if(!dialog.open)dialog.showModal();}
 function syncWatcher(){
  if(leaving||!isRoot()||dialog.open||document.querySelector('dialog[open]')){releaseWatcher();return;}
  if(!watcher&&typeof window.CloseWatcher==='function'){
   try{watcher=new window.CloseWatcher();}catch(_){return;}
   watcher.addEventListener('close',()=>{watcher=null;if(!leaving&&isRoot())showExit();});
  }
 }
 dialog.addEventListener('close',syncWatcher);
 document.getElementById('nwExitCancel').onclick=()=>{dialog.close();syncWatcher();};
 document.getElementById('nwExitConfirm').onclick=()=>{
  leaving=true;releaseWatcher();dialog.close();
  window.NWMusicAdminAPI?.stopForExit();
  // Skip our two entries and return control to the installing browser.
  // A web app cannot forcibly close an Android activity.
  window.close();
  history.go(-Number(history.state?.nwExitDepth||2));
 };
 window.addEventListener('popstate',event=>{
  if(leaving)return;
  if(history.state?.[baseKey]&&isRoot()){
   event.stopImmediatePropagation();
   const state={...history.state};delete state[baseKey];
   history.pushState({...state,[guardKey]:true},'',location.href);
   showExit();
  }else{arm();syncWatcher();}
 },true);
 function refresh(){arm();syncWatcher();}
 window.NWExitGuard={prepareForPlayer(fromUser){arm(fromUser===true);},afterPlayerChange(){queueMicrotask(refresh);}};
 window.addEventListener('pageshow',()=>{leaving=false;refresh();});
 window.addEventListener('hashchange',refresh);
 // Recheck after click handlers change routes/player state, with user activation.
 document.addEventListener('click',()=>queueMicrotask(()=>{arm(true);syncWatcher();}));
 document.addEventListener('keydown',()=>queueMicrotask(()=>{arm(true);syncWatcher();}));
 // The player can also be restored asynchronously on startup.
 const observer=new MutationObserver(syncWatcher);
 observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','open']});
 refresh();
})();
