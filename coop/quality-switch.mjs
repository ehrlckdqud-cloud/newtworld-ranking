export function qualitySwitch(game,onChange){
 const key='nw-picture-quality:'+game;
 let enabled=false;
 try{enabled=localStorage.getItem(key)==='on';}catch{}
 const button=document.createElement('button');
 button.type='button';
 function render(){
  button.textContent='화질보정 '+(enabled?'ON':'OFF');
  button.setAttribute('aria-pressed',String(enabled));
 }
 button.onclick=()=>{
  enabled=!enabled;
  try{localStorage.setItem(key,enabled?'on':'off');}catch{}
  render();onChange(enabled);
 };
 render();
 return {button,get enabled(){return enabled;}};
}
