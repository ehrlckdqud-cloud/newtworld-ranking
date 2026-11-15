(()=>{
 const form=document.querySelector('#nwEditUpdate'),fields=form.elements,feedback=form.querySelector('[role=status]'),publish=form.querySelector('[type=submit]');
 const parts=form.querySelector('#updateParts'),first=parts.firstElementChild;
 const control=(row,key)=>row.querySelector('[name="'+key+'"]');
 let items=[],current,id;
 fields.addPart.onclick=()=>{
   const row=document.querySelector('#updatePartTemplate').content.firstElementChild.cloneNode(true);
   row.dataset.id=crypto.randomUUID();parts.append(row);
   row.querySelector('[data-remove]').onclick=()=>row.remove();
   control(row,'title').focus();
 };
 function select(){
   current=items.find(x=>x.id===fields.entry.value);
   parts.replaceChildren(first);
   fields.deleteEntry.disabled=!current;
   fields.addPart.hidden=!!current;
   id=current?.id||crypto.randomUUID();
   fields.date.value=current?.date||new Date(Date.now()+32400000).toISOString().slice(0,10);
   for(const key of ['title','body','link'])control(first,key).value=current?.[key]||'';
   publish.textContent=current?'수정 발행':'홈에 발행';
 }
 function render(selected){
   fields.entry.replaceChildren(new Option('새 업데이트',''),...items.map(x=>new Option(x.date+' · '+x.title,x.id)));
   fields.entry.value=selected||'';select();
 }
 async function load(){
   form.querySelector('fieldset').disabled=true;publish.disabled=true;fields.deleteEntry.disabled=true;
   try{items=await readNewtPublicUpdates();render(fields.entry.value);publish.disabled=false;feedback.textContent='';}
   catch(e){feedback.textContent=e.message}
   finally{form.querySelector('fieldset').disabled=false}
 }
 fields.entry.onchange=()=>{select();feedback.textContent=''};
 fields.reload.onclick=load;
 fields.deleteEntry.onclick=async()=>{
   if(!current||!confirm('“'+current.title+'” 공지를 홈과 상세 목록에서 삭제할까요?'))return;
   const target=current;form.querySelector('fieldset').disabled=true;
   try{
     const r=await NWContent.call('contentUpdateDelete',{id:target.id,revision:target.revision});
     if(!r.ok)throw Error(r.error||'삭제하지 못했어요.');
     items=items.filter(x=>x.id!==target.id);render('');feedback.textContent='선택한 공지를 삭제했어요.';
   }catch(e){feedback.textContent=e.message}
   finally{form.querySelector('fieldset').disabled=false}
 };
 form.onsubmit=async e=>{
   e.preventDefault();if(publish.disabled)return;
   const batch=Array.from(parts.children,row=>{
     const item={id:row===first?id:row.dataset.id,revision:row===first?(current?.revision??null):null,date:fields.date.value};
     for(const k of ['title','body','link'])item[k]=control(row,k).value.trim();
     return item;
   });
   form.querySelector('fieldset').disabled=true;
   try{
     const r=await NWContent.call('contentUpdatePublish',{items:batch});if(!r.ok)throw Error(r.error||'저장하지 못했어요.');
     const saved=batch.map((x,i)=>({...x,...r.saved[i]}));
     const ids=new Set(saved.map(x=>x.id));items=[...saved,...items.filter(x=>!ids.has(x.id))].sort((a,b)=>b.date.localeCompare(a.date)||b.order-a.order);
     render(saved[0].id);feedback.textContent=saved.length+'건을 발행했어요. 홈을 다시 열면 반영됩니다.';
   }catch(err){feedback.textContent=err.message}
   finally{form.querySelector('fieldset').disabled=false}
 };
 const admin=document.querySelector('#adminBody');
 if(!admin.hidden)load();else{const observer=new MutationObserver(()=>{if(!admin.hidden){observer.disconnect();load()}});observer.observe(admin,{attributes:true,attributeFilter:['hidden']})}
})();