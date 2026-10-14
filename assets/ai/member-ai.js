(()=>{
'use strict';
const $=id=>document.getElementById(id),APP=window.NW_CONFIG?.appScriptUrl||'';
let busy=false,authorized=false,epoch=0;
const OFFLINE='AI비서가 잠시 쉬고 있어요. 잠시 후 다시 이용해 주세요.';
function credentials(){return {token:localStorage.getItem('nwProfileToken')||'',device:localStorage.getItem('nwProfileDevice')||''};}
function lock(){authorized=false;epoch++;$('question').disabled=true;$('ask').disabled=true;$('sample').disabled=true;$('result').hidden=true;$('answer').textContent='';$('loginLink').hidden=false;}
function controls(){['check','ask','sample'].forEach(id=>$(id).disabled=busy||(id!=='check'&&!authorized));$('question').disabled=busy||!authorized;}
function request(action,extra={}){return new Promise(resolve=>{
 if(!APP)return resolve({ok:false,error:OFFLINE});
 const cb='nwai_'+crypto.randomUUID().replace(/-/g,''),script=document.createElement('script');let timer;
 function finish(d){clearTimeout(timer);script.remove();delete window[cb];resolve(d);}
 window[cb]=finish;script.onerror=()=>finish({ok:false,error:OFFLINE});timer=setTimeout(()=>finish({ok:false,error:OFFLINE}),25000);
 script.src=APP+(APP.includes('?')?'&':'?')+new URLSearchParams({action,callback:cb,...credentials(),...extra,_:Date.now()});document.body.append(script);
});}
function post(extra){return new Promise(resolve=>{
 const nonce=crypto.randomUUID(),frame=document.createElement('iframe'),form=document.createElement('form'),input=document.createElement('input');let timer;
 frame.name='nwai_'+nonce;frame.hidden=true;form.hidden=true;form.method='POST';form.action=APP;form.target=frame.name;
 input.type='hidden';input.name='payload';input.value=JSON.stringify({action:'aiQuestion',nonce,...credentials(),...extra});form.append(input);
 function finish(d){clearTimeout(timer);window.removeEventListener('message',receive);frame.remove();form.remove();resolve(d);}
 function receive(e){if(!/^https:\/\/(?:script\.google\.com|[a-z0-9-]+\.googleusercontent\.com)$/.test(e.origin)||e.data?.channel!=='nw-ai'||e.data.nonce!==nonce)return;finish(e.data.result);}
 window.addEventListener('message',receive);timer=setTimeout(()=>finish({ok:false,error:'전송 확인이 지연되고 있어요. 연결을 확인한 뒤 다시 시도해 주세요.'}),40000);document.body.append(frame,form);form.submit();
});}
function accept(d){if(d?.auth===false){lock();$('status').textContent='회원식별을 완료한 회원만 이용할 수 있어요.';return false;}if(!d?.ok){$('status').textContent=d?.error||OFFLINE;return false;}return true;}
async function check(){if(busy)return;busy=true;controls();const e=epoch;$('status').textContent='회원 인증과 AI비서 연결을 확인하고 있습니다…';try{const d=await request('aiStatus');if(e!==epoch)return;if(!accept(d))return;authorized=true;$('loginLink').hidden=true;$('status').textContent=d.online?'연결됐어요. AI비서에게 질문해 주세요.':OFFLINE;}finally{busy=false;controls();}}
$('check').onclick=check;
$('sample').onclick=()=>{$('question').value='뉴트와 살라만더는 어떤 관계인가요?';};
$('ask').onclick=async()=>{
 if(busy||!authorized)return;const question=$('question').value.trim();if(!question){$('status').textContent='질문을 입력해 주세요.';return;}
 busy=true;controls();const e=epoch;$('result').hidden=true;$('answer').textContent='';$('status').textContent='AI비서가 답변을 준비하고 있습니다…';
 try{let d=await post({question,requestId:crypto.randomUUID()});if(e!==epoch||!accept(d))return;const id=d.id,start=Date.now();
 while(Date.now()-start<600000){await new Promise(r=>setTimeout(r,5000));if(e!==epoch)return;d=await request('aiResult',{id});if(e!==epoch||!accept(d))return;
 if(d.status==='done'){$('answer').textContent=d.answer;$('result').hidden=false;$('status').textContent='답변이 도착했어요.';return;}
 if(d.status==='failed'){$('status').textContent=d.error||OFFLINE;return;}
 $('status').textContent=d.status==='queued'?'앞선 질문을 처리하고 있어요. 잠시 기다려 주세요.':'AI비서가 답변을 준비하고 있습니다…';}
 $('status').textContent='답변 대기 시간이 길어지고 있어요. 잠시 후 다시 시도해 주세요.';
 }finally{busy=false;controls();}
};
window.addEventListener('storage',e=>{if(['nwProfileToken','nwProfileDevice'].includes(e.key)||e.key===null){lock();controls();if(!busy)check();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy)check();});
check();
})();
