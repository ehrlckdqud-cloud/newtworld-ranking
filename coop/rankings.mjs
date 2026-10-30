import {testHeaders} from './test-access.mjs?v=81';
const API='https://newtworld-ms3-coop-5p.pluckypeach517.chatgpt.site';
export const starLabel=n=>n>5?`★ × ${n}`:n>0?'★'.repeat(n):'☆';
export function initRankings(){
 const dialog=document.getElementById('rankingsDialog'),body=document.getElementById('rankRows'),status=document.getElementById('rankStatus');let request=0;
 async function load(sort='stars'){const id=++request;status.textContent='기록을 불러오는 중…';body.replaceChildren();for(const b of dialog.querySelectorAll('[data-sort]'))b.setAttribute('aria-pressed',String(b.dataset.sort===sort));
  try{const r=await fetch(API+'/api/rankings',{method:'POST',headers:{'content-type':'application/json',...testHeaders()},body:JSON.stringify({sort,member:{token:localStorage.getItem('nwProfileToken'),device:localStorage.getItem('nwProfileDevice')}})});const d=await r.json();if(!r.ok)throw Error(d.error);if(id!==request)return;
  status.textContent=`내 기록 · 완주 별 ${d.mine.stars}개 · 개인 최고점 ${d.mine.best_score.toLocaleString()}점`;
  for(const p of d.rows){const tr=document.createElement('tr');if(p.self)tr.className='my-rank';for(const value of [p.rank,p.name,starLabel(p.stars),p.best_score.toLocaleString()]){const td=document.createElement('td');td.textContent=value;tr.append(td);}tr.children[2].className='completion-stars';tr.children[2].title=`누적 완주 ${p.stars}회`;body.append(tr);}if(!d.rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.textContent='첫 번째 기록의 주인공이 되어보세요.';tr.append(td);body.append(tr);}
  }catch(e){if(id===request)status.textContent='기록을 불러오지 못했습니다. 잠시 후 다시 열어주세요.';}
 }
 document.querySelectorAll('[data-open-rankings]').forEach(b=>b.onclick=()=>{dialog.showModal();load();});dialog.querySelector('[data-close-rankings]').onclick=()=>dialog.close();dialog.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>load(b.dataset.sort));
}
export function showCompletionStar(run){const key='nwCompletionStar:'+run;if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1');const box=document.getElementById('completionAward');box.hidden=false;box.classList.remove('celebrate');void box.offsetWidth;box.classList.add('celebrate');setTimeout(()=>{box.hidden=true;},5000);}
