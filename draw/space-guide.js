// Uses the already loaded game assets; opening the guide adds no audio or animation loop.
export function installSpaceGuide(media){
 const root=document.getElementById('nwspace'),button=document.getElementById('spGuide');
 if(!button||root.querySelector('#spGuideDialog'))return;
 const dialog=document.createElement('dialog');dialog.id='spGuideDialog';dialog.className='space-guide';dialog.setAttribute('aria-labelledby','spGuideTitle');
 dialog.innerHTML=`<div class="guide-heading"><div><small>NEWTWORLD · GAME GUIDE</small><h2 id="spGuideTitle">우주대탈출 게임 설명</h2></div><button type="button" class="guide-close" aria-label="게임 설명 닫기" autofocus>닫기 ×</button></div>
 <p class="guide-intro">내 닉네임과 대표사진을 싣고 우주로 출발! 우주선들이 스스로 이동하고 공격하는 <strong>자동 생존 추첨 게임</strong>입니다.</p>
 <ol class="guide-flow"><li><b>출발과 무장</b><span>탑승자와 당첨 인원을 설정하고 출발하면 H무기를 획득해 전투를 시작합니다.</span></li><li><b>우주 전투</b><span>적과 운석을 피하고 아이템을 획득하며 거대 우주선과 최종 모선에 맞섭니다.</span></li><li><b>탈출과 당첨</b><span>최종 모선을 물리치면 당첨자 우주선들이 모여 함께 탈출합니다.</span></li></ol>
 <p class="guide-time">기본 비행시간은 180초이며, 보스 전투가 남아 있으면 더 이어질 수 있어요.</p>
 <h3 class="guide-section-title">우주선과 아이템 알아보기</h3>
 <div class="guide-items">
 <article class="guide-item"><div class="guide-art"><canvas data-art="ship" width="320" height="320" role="img" aria-label="대표사진, 닉네임과 에너지바가 표시된 탐험가 우주선"></canvas></div><div><h3>탐험가 우주선</h3><p>참가자가 탑승한 우주선입니다. 중앙 창문에는 대표사진, 아래에는 <strong>닉네임과 4칸 에너지바</strong>가 표시됩니다.</p><p class="guide-health"><span class="health-green">3~4칸 · 녹색</span><span class="health-yellow">2칸 · 노란색</span><span class="health-red">1칸 · 붉은색</span></p><p>닉네임도 남은 체력과 같은 색으로 바뀝니다. 붉은색은 위험 신호! 최종 모선의 전기는 체력이 남아 있어도 한 번에 탈락할 수 있어요.</p></div></article>
 <article class="guide-item"><div class="guide-art"><canvas data-art="h" width="320" height="320" role="img" aria-label="H무기 아이템"></canvas></div><div><h3>H무기 <small>기본 연사</small></h3><p>출발 초반에 획득하는 기본 무기입니다. 양팔과 꼭지점, <strong>세 곳에서 위쪽으로 직진하는 총알</strong>을 연속 발사합니다. 우주선이 적과 공격 방향을 맞추며 싸웁니다.</p></div></article>
 <article class="guide-item"><div class="guide-art"><canvas data-art="c" width="320" height="320" role="img" aria-label="C무기 아이템"></canvas></div><div><h3>C무기 <small>유도 공격</small></h3><p>적을 처치하면 낮은 확률로 등장합니다. 획득하면 <strong>20초 동안 양팔에서 적을 추적하는 유도탄</strong>을 발사하고, 꼭지점에서는 H무기 공격을 유지합니다. 효과가 끝나면 기본 공격으로 돌아갑니다.</p></div></article>
 <article class="guide-item"><div class="guide-art"><canvas data-art="gas" width="320" height="320" role="img" aria-label="GAS 회복 아이템"></canvas></div><div><h3>GAS <small>에너지 회복</small></h3><p>게임이 어느 정도 진행된 뒤 적을 처치하면 낮은 확률로 등장합니다. 체력이 줄어든 우주선들이 획득하려고 다가가며, 먹으면 <strong>OK 효과음과 함께 에너지 4칸을 모두 회복</strong>합니다.</p></div></article>
 </div><p class="guide-footer">직접 조작할 필요 없이, 내 우주선의 활약을 지켜보세요.</p>`;
 root.append(dialog);
 function paint(){for(const canvas of dialog.querySelectorAll('canvas')){const c=canvas.getContext('2d');c.clearRect(0,0,320,320);c.save();c.scale(2,2);switch(canvas.dataset.art){case 'ship':c.save();c.translate(80,57);media.drawRocketCraft(c,{hReady:true,hp:4},0,23);c.restore();c.font='700 16px system-ui';c.textAlign='center';c.lineJoin='round';c.lineWidth=5;c.strokeStyle='#000';c.fillStyle='#16c65b';c.strokeText('탐험가',80,119);c.fillText('탐험가',80,119);c.fillStyle='#000';c.fillRect(61,130,38,9);c.fillStyle='#16c65b';for(let i=0;i<4;i++)c.fillRect(63+i*9,132,7,5);break;case 'h':media.drawHItem(c,0,80,107,3);break;case 'c':media.drawC(c,'item',0,80,107,3,true);break;case 'gas':media.drawFuel(c,80,122,0,3);break;}c.restore();}}
 button.addEventListener('click',()=>{if(dialog.open)return;paint();dialog.showModal();});
 dialog.querySelector('.guide-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 dialog.addEventListener('close',()=>button.focus());
}
