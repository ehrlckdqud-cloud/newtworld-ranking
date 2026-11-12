/* NewtWorld guide: self-contained, no changes to membership/auth/game logic. */
(function(){
  'use strict';
  const SEEN_KEY='nwSiteGuideFirstShownV1';
  const MAIN_ROOM='https://open.kakao.com/o/gHSfUKXh';
  const OWNER_CHAT='https://open.kakao.com/me/LSEE';
  const ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5c3.2-1.5 5.8-1.4 8 .2 2.2-1.6 4.8-1.7 8-.2v13c-3.2-1.5-5.8-1.4-8 .2-2.2-1.6-4.8-1.7-8-.2zM12 5.7v13"/></svg>';
  const $=id=>document.getElementById(id);
  function makeButton(id, cls, mobile){
    const b=document.createElement('button');
    b.id=id;b.type='button';b.className='nw-guide-launch '+cls;b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-controls','nwGuideModal');
    b.innerHTML=ICON+'<span>'+(mobile?'뉴트월드 이용안내':'이용안내')+'</span>'+(mobile?'<small>처음 방문하셨나요? 이용방법을 확인하세요!</small>':'');
    return b;
  }
  function setup(){
    if($('nwGuideModal'))return;
    const top=document.querySelector('.pc-top-spacer');
    if(top){
      const b=makeButton('nwGuidePcLaunch','nw-guide-pc-launch',false);
      top.insertBefore(b,top.firstChild);
    }
    const row=document.querySelector('.pc-top-row');
    if(row){
      const p=document.createElement('div');
      p.className='nw-guide-mobile-portal';
      const logo=document.createElement('img');
      logo.src='assets/branding/newtworld-top-logo.png';logo.alt='NEWT WORLD';logo.className='nw-guide-mobile-logo';logo.loading='eager';
      p.append(logo,makeButton('nwGuideMobileLaunch','nw-guide-mobile-launch',true));
      row.insertAdjacentElement('afterend',p);
    }
    const modal=document.createElement('div');
    modal.id='nwGuideModal';modal.className='nw-guide-modal';modal.hidden=true;modal.setAttribute('aria-hidden','true');
    modal.innerHTML=[
      '<div class="nw-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="nwGuideTitle" aria-describedby="nwGuideIntro">',
      '<div class="nw-guide-head"><div><h2 id="nwGuideTitle">📖 뉴트월드 이용안내</h2><p>기존 회원도, 메탈슬러그를 즐기러 오신 분도 환영합니다!</p></div><button type="button" class="nw-guide-close" data-nw-guide-close aria-label="이용안내 닫기">×</button></div>',
      '<div class="nw-guide-scroll" id="nwGuideScroll">',
      '<p class="nw-guide-intro" id="nwGuideIntro">뉴트월드는 <strong>양서류 커뮤니티의 교류와 메인방 활성화, 추첨 이벤트 및 온라인게임</strong>을 위해 만들어졌습니다. 유튜브에서 메탈슬러그 영상을 보고 오신 분도 환영해요! 다만 게임 이용에는 <strong>메인방 가입과 회원식별</strong>이 필요합니다.</p>',
      '<div class="nw-guide-tabs" role="tablist" aria-label="이용안내 회원 유형">',
      '<button type="button" class="nw-guide-tab" role="tab" id="nwGuideTabNew" aria-controls="nwGuidePanelNew" aria-selected="true" data-nw-guide-tab="new">🎮 처음 방문했어요</button>',
      '<button type="button" class="nw-guide-tab" role="tab" id="nwGuideTabMember" aria-controls="nwGuidePanelMember" aria-selected="false" data-nw-guide-tab="member">👤 기존 메인방 회원</button>',
      '</div>',
      '<section class="nw-guide-panel" id="nwGuidePanelNew" role="tabpanel" aria-labelledby="nwGuideTabNew" data-nw-guide-panel="new"><h3>외부 방문자의 이용순서</h3>',
      '<ol><li><strong>뉴트월드 사이트 입장</strong></li><li><strong>뉴트월드 앱 설치</strong> 후 앱으로 접속</li><li><strong>뉴트월드 카카오톡 메인방 입장</strong></li><li><strong>매일 밤 10시경 신규 회원정보 자동등록</strong> (집계 시점에 따라 다음 등록에 반영될 수 있어요)</li><li>등록 후 앱으로 다시 접속 → <strong>내페이지</strong> 열기</li><li><strong>인증코드 문구 복사</strong> 후 메인방에 그대로 붙여넣기</li><li><strong>방장 확인 및 승인</strong> 후 회원식별 완료 🎉</li></ol>',
      '<p>회원정보 자동등록과 방장 인증 승인은 서로 다른 절차입니다. 등록 후에도 인증코드를 꼭 전송해 주세요.</p>',
      '<div class="nw-guide-actions"><a class="nw-guide-action" href="'+MAIN_ROOM+'" target="_blank" rel="noopener noreferrer">🦎 메인방 입장</a><button class="nw-guide-action secondary" type="button" data-nw-guide-install>📱 앱 설치 안내</button></div></section>',
      '<section class="nw-guide-panel" id="nwGuidePanelMember" role="tabpanel" aria-labelledby="nwGuideTabMember" data-nw-guide-panel="member" hidden><h3>기존 메인방 회원의 이용순서</h3>',
      '<ol><li><strong>뉴트월드 사이트 입장</strong></li><li><strong>뉴트월드 앱 설치</strong> 후 앱으로 접속</li><li><strong>내페이지</strong> 선택</li><li><strong>회원식별 인증코드 문구 복사</strong></li><li>뉴트월드 카카오톡 <strong>메인방에 문구 전송</strong></li><li><strong>방장 확인 및 승인</strong> 후 회원식별 완료 🎉</li></ol>',
      '<p>인증코드는 내페이지에서 복사해 메인방에 전송해 주세요. 카카오톡 내부 브라우저에서는 내페이지가 보이지 않을 수 있으므로 설치한 앱 또는 일반 브라우저를 이용해 주세요.</p>',
      '<div class="nw-guide-actions"><button class="nw-guide-action" type="button" data-nw-guide-profile>👤 내페이지 열기</button><button class="nw-guide-action secondary" type="button" data-nw-guide-install>📱 앱 설치 안내</button></div></section>',
      '<section class="nw-guide-section"><h3><img src="assets/newt-gem.svg" alt="" width="23" height="23"> <span class="nw-guide-mint">뉴트젬(Newt Gem) 획득 방법</span></h3>',
      '<p>뉴트젬은 뉴트월드 메인방의 랭킹 점수를 바탕으로 적립되는 <strong class="nw-guide-mint">전용 게임·이벤트 포인트</strong>입니다. <strong class="nw-guide-mint">랭킹 점수 1점 = 뉴트젬 1개</strong>입니다.</p>',
      '<div class="nw-guide-score"><div>💬 일정 길이 이상 채팅 1회<strong>+1젬</strong></div><div>🖼️ 사진 1회<strong>+5젬</strong></div><div>🎬 영상 1회<strong>+10젬</strong></div></div>',
      '<div class="nw-guide-note"><strong class="nw-guide-mint">🕙 매일 밤 10시 전후 업데이트</strong><br>메인방의 채팅·사진·영상 활동 점수와 이를 반영한 뉴트젬은 <strong>매일 밤 10시 전후(한국시간)</strong>에 갱신됩니다. 활동 직후에는 점수와 뉴트젬이 바로 표시되지 않을 수 있으니, 다음 집계 후 내페이지에서 확인해 주세요.</div>',
      '<p>뉴트젬은 생존추첨, 생존연못, 우주탈출, 온라인 협동전 및 혼자하기 고전게임 등에 사용됩니다. 게임별 요금은 다르며 시작 전 차감 안내를 확인할 수 있습니다.</p>',
      '<p>보유량과 사용내역은 <strong>내페이지</strong>에서 확인하세요. 뉴트젬이 부족하거나 문의가 필요하다면 <a class="nw-guide-mint" href="'+OWNER_CHAT+'" target="_blank" rel="noopener noreferrer">방장에게 개인문의</a>를 남겨 주세요.</p></section>',
      '<section class="nw-guide-section"><h3>🕹️ 뉴트월드에서 즐길 수 있는 것</h3><ul><li><strong>온라인 협동전:</strong> 다른 회원과 메탈슬러그 등의 고전게임을 함께 플레이</li><li><strong>혼자하기:</strong> 메탈슬러그 시리즈 등 추억의 고전게임 플레이</li><li><strong>생존추첨 및 이벤트게임:</strong> 다양한 추첨과 이벤트 참여</li><li><strong>활동왕 랭킹:</strong> 메인방 활동 점수·등급·뉴트젬 확인</li></ul>',
      '<p>월간 랭킹 점수는 매월 1일 초기화되지만, 누적 점수는 유지됩니다. 메인방 퇴장 시 회원정보는 삭제되고 재입장하면 신규 회원으로 처리됩니다.</p></section>',
      '<section class="nw-guide-section"><h3>❓ 자주 묻는 질문</h3>',
      '<details><summary>유튜브에서 왔는데 메탈슬러그 게임만 할 수 있나요?</summary><p>뉴트월드는 메인방 중심 커뮤니티입니다. 게임을 즐기려면 메인방에 입장하고 회원식별을 완료해 주세요.</p></details>',
      '<details><summary>메인방에 들어왔는데 내페이지에 정보가 없어요.</summary><p>신규 회원정보는 매일 밤 10시경 자동등록됩니다. 가입 시점에 따라 다음 집계에 반영될 수 있습니다.</p></details>',
      '<details><summary>인증코드 전송만 하면 바로 이용할 수 있나요?</summary><p>아니요. 방장이 확인하고 승인해야 회원식별이 완료됩니다. 인증코드는 발급 후 유효기간이 있으니 내페이지 안내도 확인해 주세요.</p></details>',
      '<details><summary>뉴트젬이 바로 올라가지 않아요.</summary><p>메인방 점수 및 뉴트젬은 매일 밤 10시 전후(한국시간)에 업데이트됩니다. 다음 집계가 끝난 뒤 확인해 주세요.</p></details>',
      '<details><summary>카카오톡 링크에서 내페이지가 보이지 않아요.</summary><p>카카오톡 내부 브라우저에서는 내페이지가 숨겨질 수 있습니다. 설치한 뉴트월드 앱 또는 일반 브라우저에서 다시 열어 주세요.</p></details>',
      '<details><summary>게임마다 뉴트젬이 차감되나요?</summary><p>게임과 이용 방식에 따라 차감 금액과 시점이 다릅니다. 게임 시작 전 표시되는 뉴트젬 안내를 확인해 주세요.</p></details>',
      '</section>',
      '<section class="nw-guide-section"><h3>💚 함께 지키는 뉴트월드 이용 예절</h3><p>양서류 초보자도 편하게 질문할 수 있도록 서로 존중하고 배려해 주세요. 회원 비하나 무시를 삼가고, 게임과 이벤트는 안내에 따라 공정하게 즐겨 주세요. 오류·개선 의견은 방장에게 알려주세요.</p><p><strong>양서류가 좋아서 오셨든, 메탈슬러그를 즐기러 오셨든 모두 환영합니다!</strong></p>',
      '<div class="nw-guide-actions"><a class="nw-guide-action" href="'+MAIN_ROOM+'" target="_blank" rel="noopener noreferrer">🦎 뉴트월드 메인방</a><a class="nw-guide-action secondary" href="'+OWNER_CHAT+'" target="_blank" rel="noopener noreferrer">💬 방장 개인문의</a></div></section>',
      '</div><div class="nw-guide-foot"><button class="nw-guide-action" type="button" data-nw-guide-close>확인했어요</button></div></div>'
    ].join('');
    document.body.appendChild(modal);
    const scroll=$('nwGuideScroll');
    const tabs=Array.from(modal.querySelectorAll('[data-nw-guide-tab]'));
    const panels=Array.from(modal.querySelectorAll('[data-nw-guide-panel]'));
    let focusBefore=null, htmlOverflow='', bodyOverflow='';
    function selectTab(which){
      tabs.forEach(b=>{const active=b.dataset.nwGuideTab===which;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
      panels.forEach(p=>p.hidden=p.dataset.nwGuidePanel!==which);
      scroll.scrollTop=0;
    }
    function markSeen(){try{localStorage.setItem(SEEN_KEY,'1');}catch(e){try{sessionStorage.setItem(SEEN_KEY,'1');}catch(_){}}}
    function hasSeen(){try{return localStorage.getItem(SEEN_KEY)==='1';}catch(e){try{return sessionStorage.getItem(SEEN_KEY)==='1';}catch(_){return false;}}}
    function openGuide(which){
      if(!modal.hidden)return;
      focusBefore=document.activeElement;
      selectTab(which==='member'?'member':'new');
      htmlOverflow=document.documentElement.style.overflow;bodyOverflow=document.body.style.overflow;
      modal.hidden=false;modal.setAttribute('aria-hidden','false');
      document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
      markSeen();
      modal.querySelector('.nw-guide-close').focus({preventScroll:true});
    }
    function closeGuide(){
      if(modal.hidden)return;
      modal.hidden=true;modal.setAttribute('aria-hidden','true');
      document.documentElement.style.overflow=htmlOverflow;document.body.style.overflow=bodyOverflow;
      if(focusBefore&&focusBefore.isConnected&&typeof focusBefore.focus==='function')focusBefore.focus({preventScroll:true});
    }
    window.NWOpenSiteGuide=openGuide;
    document.querySelectorAll('#nwGuidePcLaunch,#nwGuideMobileLaunch').forEach(b=>b.addEventListener('click',()=>openGuide('new')));
    tabs.forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.nwGuideTab)));
    modal.querySelectorAll('[data-nw-guide-close]').forEach(b=>b.addEventListener('click',closeGuide));
    modal.addEventListener('click',e=>{
      if(e.target===modal)closeGuide();
      const install=e.target.closest('[data-nw-guide-install]');
      if(install){closeGuide();const b=$('homeInstallBtn');if(b){b.scrollIntoView({behavior:'smooth',block:'center'});b.click();}else alert('사이트 메인 화면의 뉴트월드 어플 설치 버튼을 이용해 주세요.');}
      const profile=e.target.closest('[data-nw-guide-profile]');
      if(profile){closeGuide();const b=$('nwMyPageBtn');if(b&&!b.hidden){b.click();}else alert('뉴트월드 앱 또는 일반 브라우저에서 내페이지를 열어 주세요.');}
    });
    document.addEventListener('keydown',e=>{
      if(modal.hidden)return;
      if(e.key==='Escape'){e.preventDefault();closeGuide();return;}
      if(e.key==='Tab'){
        const nodes=Array.from(modal.querySelectorAll('a[href],button:not([disabled]),summary,[tabindex="0"]')).filter(el=>el.getClientRects().length&&el.getAttribute('aria-selected')!=='false');
        if(!nodes.length)return;
        const first=nodes[0],last=nodes[nodes.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    });
    // Only on the first main-page visit; never interrupt deep links or active overlays.
    if((!location.hash||location.hash==='#')&&!hasSeen()){
      setTimeout(()=>{
        if(hasSeen()||document.visibilityState==='hidden'||document.querySelector('.nw-app-overlay.open,.nw-workout-overlay.open'))return;
        openGuide('new');
      },500);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();