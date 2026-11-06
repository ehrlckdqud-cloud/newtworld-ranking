(function(){
 'use strict';
 const button=document.getElementById('nwBackgroundHelp');if(!button)return;
 const key='nwBackgroundGuideAcknowledged';let acknowledged=false,autoShown=false;
 try{acknowledged=localStorage.getItem(key)==='1';}catch{}
 const dialog=document.createElement('dialog');dialog.id='nwBackgroundGuide';dialog.setAttribute('aria-labelledby','nwBackgroundGuideTitle');
 dialog.innerHTML='<h2 id="nwBackgroundGuideTitle">끊김없이 백그라운드에서 음악을 들으려면</h2><p>휴대폰에서 뉴트월드의 배터리 사용을 <strong>제한 없음</strong>으로 설정해주세요.</p><ol><li>휴대폰 <b>설정</b> 열기</li><li><b>애플리케이션 → 뉴트월드</b> 선택</li><li><b>배터리 → 제한 없음</b> 선택</li></ol><p class="nw-bg-guide-note">안드로이드 기준이며, 기종에 따라 메뉴 이름이 다를 수 있어요. 설정 오른쪽의 ‘백그라운드 재생’ 버튼에서 이 안내를 다시 볼 수 있어요.</p><button type="button" id="nwBackgroundGuideConfirm">확인</button>';
 document.body.appendChild(dialog);
 function show(){if(!dialog.open)dialog.showModal();}
 window.NWShowBackgroundGuide=function(){if(!window.matchMedia('(max-width:650px)').matches||acknowledged||autoShown)return;autoShown=true;show();};
 button.addEventListener('click',show);
 document.getElementById('nwBackgroundGuideConfirm').onclick=()=>{acknowledged=true;try{localStorage.setItem(key,'1');}catch{}dialog.close();button.focus({preventScroll:true});};
 window.addEventListener('popstate',()=>{if(dialog.open)dialog.close();});
})();
