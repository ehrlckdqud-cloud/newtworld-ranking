(()=>{
 const form=document.querySelector('#nwEditUpdate'),fields=form.elements,feedback=form.querySelector('[role=status]'),publish=form.querySelector('[type=submit]');
 let items=[],current,id;
 function select(){
   current=items.find(x=>x.id===fields.entry.value);
   id=current?.id||crypto.randomUUID();
   fields.date.value=current?.date||new Date(Date.now()+32400000).toISOString().slice(0,10);
   for(const key of ['title','body','link'])fields[key].value=current?.[key]||'';
   publish.textContent=current?'수정 발행':'홈에 발행';
 }
 function render(selected){
   fields.entry.replaceChildren(new Option('새 업데이트',''),...items.map(x=>new Option(x.date+' · '+x.title,x.id)));
   fields.entry.value=selected||'';select();
 }
 async function load(){
   publish.disabled=true;
   try{items=await readNewtPublicUpdates();render(fields.entry.value);publish.disabled=false;feedback.textContent='';}
   catch(e){feedback.textContent=e.message}
 }
 fields.entry.onchange=()=>{select();feedback.textContent=''};
 fields.reload.onclick=load;
 form.onsubmit=async e=>{
   e.preventDefault();if(publish.disabled)return;
   const data={id,revision:current?.revision??null};
   for(const k of ['date','title','body','link'])data[k]=fields[k].value.trim();
   form.querySelector('fieldset').disabled=true;
   try{
     const r=await NWContent.call('contentUpdatePublish',data);if(!r.ok)throw Error(r.error||'저장하지 못했어요.');
     items=[r.item,...items.filter(x=>x.id!==id)].sort((a,b)=>b.date.localeCompare(a.date)||b.order-a.order);
     render(r.item.id);feedback.textContent='발행했어요. 홈을 다시 열면 반영됩니다.';
   }catch(err){feedback.textContent=err.message}
   finally{form.querySelector('fieldset').disabled=false}
 };
 const admin=document.querySelector('#adminBody');
 if(!admin.hidden)load();else{const observer=new MutationObserver(()=>{if(!admin.hidden){observer.disconnect();load()}});observer.observe(admin,{attributes:true,attributeFilter:['hidden']})}
})();