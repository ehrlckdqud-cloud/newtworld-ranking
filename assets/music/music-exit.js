(function(){
 'use strict';
 if(!window.matchMedia('(max-width:650px)').matches)return;
 const baseKey='nwExitBase',guardKey='nwExitGuard';
 let leaving=false;
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
 document.getElementById('nwExitCancel').onclick=()=>dialog.close();
 document.getElementById('nwExitConfirm').onclick=()=>{
  leaving=true;dialog.close();
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
   if(!dialog.open)dialog.showModal();
  }else arm();
 },true);
 window.addEventListener('pageshow',()=>{leaving=false;arm();});
 arm();
})();
