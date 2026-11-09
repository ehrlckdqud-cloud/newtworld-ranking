export function metal3Selector(onChange){
 const key='nw-picture-quality:mslug3';
 let saved;
 try{saved=localStorage.getItem(key);}catch{}
 const select=document.createElement('select');
 select.setAttribute('aria-label','화질보정');
 for(const [value,title] of [['off','원본'],['on','Scale2x'],['xbrz','xBRZ 2배'],['xbrz4','xBRZ 4배 · 1280×896'],['xbrz6','xBRZ 6배 · 1920×1344']]){
  select.add(new Option('화질보정 · '+title,value));
 }
 const advanced=Array.from(select.options).slice(2);
 for(const option of advanced)option.disabled=true;
 select.value=saved==='on'?'on':'off';
 select.onchange=()=>{
  saved=select.value;
  try{localStorage.setItem(key,saved);}catch{}
  onChange();
 };
 return {
  button:select,get enabled(){return select.value!=='off';},get mode(){return select.value;},
  allowXbrz(){for(const option of advanced)option.disabled=false;if(advanced.some(option=>option.value===saved))select.value=saved;},
  unavailable(){for(const option of advanced)option.textContent+=' (사용 불가)';}
 };
}
