import {siteHeaders} from './site-session.mjs?v=98';
const endpoint='https://newtworld-ms3-coop-5p.ehrlckdqud.chatgpt.site/api/social';
const el=(tag,label)=>{const node=document.createElement(tag);if(label!==undefined)node.textContent=label;return node;};
export function initSocial(){
 const launcher=el('button','접속 회원 · 친구'),dialog=el('dialog'),toast=el('div');
 launcher.className='nw-social-launch';dialog.className='nw-social';toast.className='nw-social-toast';toast.hidden=true;toast.setAttribute('role','status');
 document.body.append(launcher,dialog,toast);
 const heading=el('h2','회원 · 친구'),close=el('button','닫기'),head=el('header'),tabs=el('nav'),list=el('div'),thread=el('section'),title=el('h3'),log=el('div'),input=el('input'),send=el('button','전송'),form=el('form'),notice=el('output'),setting=el('label'),check=el('input');
 head.append(heading,close);dialog.append(head,tabs,setting,list,thread,notice);thread.append(title,log,form);form.append(input,send);input.maxLength=500;input.placeholder='귓속말 입력 (최대 500자)';input.setAttribute('aria-label','귓속말');check.type='checkbox';setting.append(check,' 친구 접속 알림');log.className='nw-social-log';list.className='nw-social-list';thread.hidden=true;notice.setAttribute('role','status');
 let people=[],previous=null,notify=true,tab='online',target=null,timer=0,loading=false,refreshAgain=false,nonce=null,lastThread='',threadGeneration=0;
 const names={online:'접속 회원',friends:'친구',messages:'귓속말'};
 const act=async(action,props={})=>{
  const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',...siteHeaders()},body:JSON.stringify({action,...props}),signal:AbortSignal.timeout(10000)});
  const data=await r.json();if(!r.ok)throw Error(data.error||'연결에 실패했습니다.');return data;
 };
 const show=(message)=>{if(dialog.open)notice.textContent=message;toast.textContent=message;toast.hidden=false;clearTimeout(timer);timer=setTimeout(()=>toast.hidden=true,4500);};
 const safely=fn=>Promise.resolve().then(fn).catch(e=>{notice.textContent=e.message||'다시 시도해주세요.';});
 const actionButton=(label,fn)=>{const b=el('button',label);b.type='button';b.onclick=()=>safely(async()=>{b.disabled=true;try{await fn();}finally{b.disabled=false;}});return b;};
 function switchTab(key){tab=key;target=null;threadGeneration++;input.value='';nonce=null;thread.hidden=true;notice.textContent='';draw();}
 for(const [id,label] of Object.entries(names)){const b=actionButton(label,()=>switchTab(id));b.dataset.tab=id;tabs.append(b);}
 close.onclick=()=>dialog.close();dialog.onclose=()=>{target=null;threadGeneration++;thread.hidden=true;launcher.focus();};
 launcher.onclick=()=>{if(!dialog.open)dialog.showModal();switchTab('online');safely(refresh);};
 function draw(){
  const count=people.filter(p=>p.online).length,unread=people.reduce((n,p)=>n+p.unread,0),incoming=people.filter(p=>p.relation==='received').length;
  launcher.textContent='접속 회원 '+count+' · 친구'+(unread||incoming?' ● '+(unread+incoming):'');
  check.checked=notify;for(const b of tabs.children){b.setAttribute('aria-pressed',String(b.dataset.tab===tab));b.textContent=names[b.dataset.tab]+(b.dataset.tab==='friends'&&incoming?' ('+incoming+')':b.dataset.tab==='messages'&&unread?' ('+unread+')':'');}
  if(!dialog.open)return;
  const rows=people.filter(p=>tab==='online'?p.online:tab==='friends'?p.relation:p.unread||p.hasChat||p.id===target).sort((a,b)=>b.online-a.online||a.name.localeCompare(b.name,'ko'));
  list.replaceChildren();
  for(const p of rows){
   const row=el('div'),name=el('span'),light=el('i');light.className=p.online?'online':'';name.append(light,document.createTextNode(p.name+' · '+(p.online?'접속 중':'오프라인')));row.append(name);
   const mutate=async(action)=>{await act(action,{to:p.id});await refresh();};
   if(p.online||p.hasChat||p.unread)row.append(actionButton('귓속말'+(p.unread?' '+p.unread:''),async()=>{target=p.id;threadGeneration++;input.value='';nonce=null;lastThread='';log.replaceChildren();thread.hidden=false;await readThread();}));
   if(p.relation==='received')row.append(actionButton('수락',()=>mutate('accept')),actionButton('거절',()=>mutate('remove')));
   else if(!p.relation)row.append(actionButton('친구 추가',()=>mutate('request')));
   else if(tab==='friends')row.append(actionButton(p.relation==='sent'?'요청 취소':'친구 삭제',()=>mutate('remove')));
   list.append(row);
  }
  if(!rows.length)list.append(el('p',tab==='online'?'다른 접속 회원이 없습니다.':tab==='friends'?'친구나 친구 요청이 없습니다.':'아직 귓속말이 없습니다.'));
 }
 async function readThread(){
  const id=target,g=++threadGeneration;if(!id||!dialog.open)return;
  const p=people.find(x=>x.id===id);title.textContent=(p?.name||'회원')+'님과의 귓속말';send.disabled=input.disabled=!p?.online;
  const data=await act('thread',{to:id});if(g!==threadGeneration||target!==id||!dialog.open)return;
  const last=data.messages.at(-1)?.id||0;if(lastThread!==id+'/'+last){lastThread=id+'/'+last;log.replaceChildren(...data.messages.map(m=>el('p',(m.sender===id?p?.name:'나')+' · '+m.body)));log.scrollTop=log.scrollHeight;}
  if(p?.unread&&last)await act('read',{to:id,through:last});
 }
 async function refresh(){
  if(loading){refreshAgain=true;return;}loading=true;
  try{const data=await act('state');notify=data.notify;people=data.people;
   if(previous){const joined=people.filter(p=>notify&&p.relation==='friend'&&p.online&&previous.get(p.id)?.relation==='friend'&&!previous.get(p.id)?.online);if(joined.length)show(joined.map(p=>p.name).join(', ')+'님이 접속했습니다.');
    const newMail=people.filter(p=>p.unread>(previous.get(p.id)?.unread||0));if(newMail.length)show(newMail.map(p=>p.name).join(', ')+'님의 귓속말이 도착했습니다.');}
   previous=new Map(people.map(p=>[p.id,p]));draw();if(target)await readThread();
  }finally{loading=false;if(refreshAgain){refreshAgain=false;safely(refresh);}}
 }
 check.onchange=()=>safely(async()=>{await act('notify',{enabled:check.checked});await refresh();});
 input.oninput=()=>nonce=null;form.onsubmit=e=>{e.preventDefault();const id=target,text=input.value.trim();if(!id||!text||send.disabled)return;send.disabled=true;const requestId=nonce??=crypto.randomUUID();safely(async()=>{try{await act('send',{to:id,text,nonce:requestId});if(id===target&&nonce===requestId){input.value='';nonce=null;}await refresh();}finally{send.disabled=!people.find(p=>p.id===target)?.online;}});};
 // A modal consumes game keys; notifications never take focus.
 dialog.addEventListener('keydown',e=>e.stopPropagation());
 safely(refresh);const poll=setInterval(()=>safely(refresh),8000);
 window.addEventListener('nw-site-blocked',()=>{clearInterval(poll);dialog.close();launcher.remove();toast.remove();},{once:true});
}
