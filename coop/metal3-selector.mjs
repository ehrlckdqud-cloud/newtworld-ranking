export function metal3Selector(onChange){
 const key='nw-picture-quality:mslug3';
 let saved;
 try{saved=localStorage.getItem(key);}catch{}
 const select=document.createElement('select');
 select.setAttribute('aria-label','화질보정');
 for(const [value,title] of [['off','원본'],['on','Scale2x'],['xbrz','xBRZ 2배']]){
  select.add(new Option('화질보정 · '+title,value));
 }
 const advanced=select.options[2];
 advanced.disabled=true;
 select.value=saved==='on'?'on':'off';
 select.onchange=()=>{
  saved=select.value;
  try{localStorage.setItem(key,saved);}catch{}
  onChange();
 };
 return {
  button:select,get enabled(){return select.value!=='off';},get mode(){return select.value;},
  allowXbrz(){advanced.disabled=false;if(saved==='xbrz')select.value=saved;},
  unavailable(){advanced.textContent='xBRZ 사용 불가';}
 };
}
