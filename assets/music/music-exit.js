(function(){
 'use strict';
 if(!window.matchMedia('(max-width:650px)').matches&&!/Android/i.test(navigator.userAgent))return;
 const baseKey='nwExitBase',guardKey='nwExitGuard';
 let leaving=false,watcher=null;
 function isRoot(){return !location.hash&&!history.state?.nwMusicPlayer;}
 function arm(){
  if(leaving||!isRoot()||history.state?.[guardKey])return;
  const state={...history.state};delete state[baseKey];delete state[guardKey];
  history.replaceState({...state,[baseKey]:true},'',location.href);
  history.pushState({...state,[guardKey]:true},'',location.href);
 }
 const dialog=document.createElement('dialog');dialog.id='nwExitDialog';dialog.setAttribute('aria-labelledby','nwExitTitle');
 dialog.innerHTML='<h2 id="nwExitTitle">종료하시겠습니까?</h2><p>음악이 재생 중이라면 종료되므로 계속 들으려면 홈 버튼을 눌러주세요.</p><div class="nw-exit-actions"><button type="button" id="nwExitCancel" autofocus>취소</button><button type="button" id="nwExitConfirm">확인</button></div>';
 document.body.appendChild(dialog);
 function releaseWatcher(){if(watcher){watcher.destroy();watcher=null;}}
 function showExit(){releaseWatcher();if(!dialog.open)dialog.showModal();}
 function syncWatcher(){
  if(leaving||!isRoot()||dialog.open||document.querySelector('dialog[open]')){releaseWatcher();return;}
  if(!watcher&&typeof window.CloseWatcher==='function'){
   watcher=new window.CloseWatcher();
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
  history.go(-2);
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
 window.addEventListener('pageshow',()=>{leaving=false;refresh();});
 window.addEventListener('hashchange',refresh);
 // Recheck after click handlers change routes/player state, with user activation.
 document.addEventListener('click',()=>queueMicrotask(refresh));
 document.addEventListener('keydown',()=>queueMicrotask(refresh));
 // The player can also be restored asynchronously on startup.
 const observer=new MutationObserver(syncWatcher);
 observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','open']});
 refresh();
})();
