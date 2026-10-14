(()=>{
'use strict';
const $=id=>document.getElementById(id),APP=window.NW_CONFIG?.appScriptUrl||'';
let busy=false,authorized=false,epoch=0,active=null,canceling=false;
const OFFLINE='AI비서가 잠시 쉬고 있어요. 잠시 후 다시 이용해 주세요.';
function credentials(){return {token:localStorage.getItem('nwProfileToken')||'',device:localStorage.getItem('nwProfileDevice')||''};}
function remember(id){try{localStorage.setItem('nwAiLastJob',JSON.stringify({id,...credentials()}));}catch(_){}}
function remembered(){try{const j=JSON.parse(localStorage.getItem('nwAiLastJob')||'null'),c=credentials();return j&&j.token===c.token&&j.device===c.device?j.id:null;}catch(_){return null;}}
function forget(){try{localStorage.removeItem('nwAiLastJob');}catch(_){}}
function lock(){authorized=false;busy=false;epoch++;active=null;$('question').disabled=true;$('ask').disabled=true;$('sample').disabled=true;$('result').hidden=true;$('queueInfo').hidden=true;$('answer').textContent='';$('loginLink').hidden=false;controls();}
function controls(){['check','ask','sample'].forEach(id=>$(id).disabled=busy||(id!=='check'&&!authorized));$('question').disabled=busy||!authorized;$('cancelQueue').hidden=!active||active.status!=='queued';$('cancelQueue').disabled=canceling||!authorized;}
function request(action,extra={}){return new Promise(resolve=>{
 if(!APP)return resolve({ok:false,error:OFFLINE});
 const cb='nwai_'+crypto.randomUUID().replace(/-/g,''),script=document.createElement('script');let timer,done=false;
 function finish(d){if(done)return;done=true;clearTimeout(timer);script.remove();delete window[cb];resolve(d);}
 window[cb]=finish;script.onerror=()=>finish({ok:false,error:OFFLINE});timer=setTimeout(()=>finish({ok:false,error:OFFLINE}),25000);
 script.src=APP+(APP.includes('?')?'&':'?')+new URLSearchParams({action,callback:cb,...credentials(),...extra,_:Date.now()});document.body.append(script);
});}
function post(action,extra){return new Promise(resolve=>{
 const nonce=crypto.randomUUID(),frame=document.createElement('iframe'),form=document.createElement('form'),input=document.createElement('input');let timer,done=false;
 frame.name='nwai_'+nonce;frame.hidden=true;form.hidden=true;form.method='POST';form.action=APP;form.target=frame.name;
 input.type='hidden';input.name='payload';input.value=JSON.stringify({action,nonce,...credentials(),...extra});form.append(input);
 function finish(d){if(done)return;done=true;clearTimeout(timer);window.removeEventListener('message',receive);frame.remove();form.remove();resolve(d);}
 function receive(e){const google=/^https:\/\/(?:script\.google\.com|[a-z0-9-]+\.googleusercontent\.com)$/.test(e.origin);const parent=e.origin===location.origin&&e.source===window.parent&&window.parent!==window;if((!google&&!parent)||e.data?.channel!=='nw-ai'||e.data.nonce!==nonce)return;finish(e.data.result);}
 window.addEventListener('message',receive);timer=setTimeout(()=>finish({ok:false,error:'전송 확인이 지연되고 있어요. AI비서 연결을 눌러 접수 상태를 확인해 주세요.'}),40000);document.body.append(frame,form);form.submit();
});}
function accept(d){if(d?.auth===false){lock();$('status').textContent='회원식별을 완료한 회원만 이용할 수 있어요.';return false;}if(!d?.ok){$('status').textContent=d?.error||OFFLINE;return false;}return true;}
function duration(s){return s<60?Math.ceil(s/10)*10+'초':Math.ceil(s/60)+'분';}
function display(d){
 active={id:d.id,status:d.status};$('queueInfo').hidden=!['queued','processing'].includes(d.status);
 if(d.status==='queued'){$('queueState').textContent=d.ahead?'내 앞에 대기·처리 중인 질문 '+d.ahead+'개 · 대기 순서 '+(d.ahead+1)+'번째':'내 앞에 대기 중인 질문 0개 · 곧 답변 준비가 시작돼요.';}
 if(d.status==='processing')$('queueState').textContent='내 질문의 답변을 준비하고 있어요.';
 const estimate=d.estimate;
 $('queueEstimate').textContent=estimate?'최근 '+estimate.sampleCount+'개 답변 기준, 예상 답변 도착 약 '+duration(estimate.minSeconds)+'~'+duration(estimate.maxSeconds)+' (실제 소요 시간은 달라질 수 있어요).':'소요 시간을 측정하고 있어요. 완료 기록이 쌓이면 예상 시간을 표시해요.';
 controls();
}
async function follow(id,e,initial){
 remember(id);$('result').hidden=true;$('answer').textContent='';let d=initial,start=Date.now();
 while(Date.now()-start<900000){
  if(e!==epoch)return;
  if(!d)d=await request('aiResult',{id});
  if(e!==epoch||!accept(d))return;
  display(d);
  if(d.status==='done'){$('answer').textContent=d.answer;$('result').hidden=false;$('queueInfo').hidden=true;active=null;$('status').textContent='답변이 도착했어요.';return;}
  if(d.status==='canceled'){$('queueInfo').hidden=true;active=null;forget();$('status').textContent='대기를 취소했어요. 새 질문을 보낼 수 있어요.';return;}
  if(d.status==='failed'){$('queueInfo').hidden=true;active=null;forget();$('status').textContent=d.error||OFFLINE;return;}
  $('status').textContent=d.existing?'다른 기기에서 보낸 기존 질문의 진행 상태를 확인하고 있어요. 새 질문은 아직 접수되지 않았어요.':d.status==='queued'?'질문이 접수됐어요. 대기 순서를 확인해 주세요.':'AI비서가 답변을 준비하고 있습니다…';
  await new Promise(r=>setTimeout(r,5000));d=null;
 }
 $('status').textContent='답변 대기 시간이 길어지고 있어요. AI비서 연결을 눌러 다시 확인해 주세요.';
}
async function check(){if(busy)return;busy=true;controls();const e=epoch;$('status').textContent='회원 인증과 AI비서 연결을 확인하고 있습니다…';try{const d=await request('aiStatus');if(e!==epoch||!accept(d))return;authorized=true;$('loginLink').hidden=true;
 if(d.active){await follow(d.active.id,e,d.active);return;}
 const last=remembered();if(last){const result=await request('aiResult',{id:last});if(e!==epoch)return;if(result?.ok&&result.status==='done'){display(result);$('answer').textContent=result.answer;$('result').hidden=false;active=null;}else forget();}
 $('status').textContent=d.online?'연결됐어요. AI비서에게 질문해 주세요.':OFFLINE;
 }finally{if(e===epoch){busy=false;controls();}}}
$('check').onclick=check;
$('sample').onclick=()=>{$('question').value='뉴트와 살라만더는 어떤 관계인가요?';};
$('ask').onclick=async()=>{
 if(busy||!authorized)return;const question=$('question').value.trim();if(!question){$('status').textContent='질문을 입력해 주세요.';return;}
 busy=true;controls();const e=epoch;$('result').hidden=true;$('answer').textContent='';$('status').textContent='질문을 접수하고 있습니다…';
 try{const d=await post('aiQuestion',{question,requestId:crypto.randomUUID()});if(e!==epoch||!accept(d))return;await follow(d.id,e,d.status?d:null);
 }finally{if(e===epoch){busy=false;controls();}}
};
$('cancelQueue').onclick=async()=>{
 if(canceling||!authorized||active?.status!=='queued')return;const id=active.id,e=epoch;canceling=true;controls();
 try{const d=await post('aiCancel',{id});if(e!==epoch)return;if(!accept(d)){if(d?.job)display(d.job);return;}
 // Stop an outstanding poll from replacing the confirmed cancellation.
 epoch++;busy=false;active=null;forget();$('queueInfo').hidden=true;$('status').textContent='대기를 취소했어요. 새 질문을 보낼 수 있어요.';
 }finally{canceling=false;controls();}
};
$('loginLink').onclick=e=>{if(window.parent!==window){e.preventDefault();window.parent.postMessage('nw-ai-open-profile',location.origin);}};
window.addEventListener('storage',e=>{if(['nwProfileToken','nwProfileDevice'].includes(e.key)||e.key===null){lock();controls();if(!busy)check();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy)check();});
check();
})();
