export function pictureQuality(game,onChange){
 const key='nw-picture-quality:'+game,button=document.createElement('select');
 button.className='picture-quality';button.setAttribute('aria-label','화질보정');
 const modes=[['off','원본'],['on','Scale2x'],['xbrz','xBRZ 2배'],['xbrz4','xBRZ 4배'],['xbrz6','xBRZ 6배']];
 for(const [value,title] of modes)button.add(new Option('화질보정 · '+title,value));
 let saved;try{saved=localStorage.getItem(key);}catch{}
 button.value=modes.some(([v])=>v===saved)?saved:'off';
 function change(mode){
  button.value=mode;try{localStorage.setItem(key,mode);}catch{}
  onChange(mode);
 }
 button.onchange=()=>change(button.value);
 return {button,get mode(){return button.value;},get enabled(){return button.value!=='off';},
  unavailable(){for(const option of button.options)if(option.value.startsWith('xbrz'))option.disabled=true;
   if(button.value.startsWith('xbrz'))change('off');}
 };
}
export function xbrzFactor(mode){return ({xbrz:2,xbrz4:4,xbrz6:6})[mode]||0;}
export function qualityBar(){const bar=document.createElement('div');bar.className='quality-bar';return bar;}
