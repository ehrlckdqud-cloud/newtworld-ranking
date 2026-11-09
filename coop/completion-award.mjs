const soundURL='https://newtworld-ms3-coop-5p.ehrlckdqud.chatgpt.site/arcade-runtime/completion-award.mp3';
let context,buffer;
export function prepareAwardSound(){
  try{
    context ??= new AudioContext();
    if(context.state!=='running')context.resume().catch(()=>{});
    buffer ??= fetch(soundURL).then(r=>{if(!r.ok)throw Error('reward audio');return r.arrayBuffer()})
      .then(bytes=>context.decodeAudioData(bytes)).catch(()=>{buffer=null;return null});
  }catch{}
}
const seen=new Set();
export function showAward(run,container,existing){
  const key='nwCompletionStar:'+run;
  if(seen.has(key))return;
  try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1')}catch{}
  seen.add(key);
  let box=existing,host;
  if(!box){
    host=document.createElement('div');
    host.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:20';
    if(getComputedStyle(container).position==='static')container.style.position='relative';
    container.append(host);
    const root=host.attachShadow({mode:'open'});
    root.innerHTML='<style>#completionAward{position:absolute;z-index:15;top:12%;left:50%;transform:translateX(-50%);display:flex;align-items:center;flex-direction:column;gap:6px;color:#fff4cb;text-shadow:0 2px 3px #000;pointer-events:none;white-space:nowrap}#completionAward[hidden]{display:none}.award-star{font-size:100px;line-height:1.15;background:linear-gradient(145deg,#fff9bc 10%,#dcae28 40%,#fff5ac 55%,#a66e12 85%);background-clip:text;-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 3px 2px #000);text-shadow:none}#completionAward strong{font-size:26px}#completionAward.celebrate{animation:star-award 5s both}@keyframes star-award{0%{opacity:0;transform:translateX(-50%) scale(.4)}15%,85%{opacity:1;transform:translateX(-50%) scale(1)}100%{opacity:0;transform:translateX(-50%) translateY(-25px)}}@media(prefers-reduced-motion:reduce){#completionAward.celebrate{animation:none}}</style><div id="completionAward" role="status"><span class="award-star">★</span><strong>완주 별 획득!</strong><span>누적 완주 별 +1</span></div>';
    box=root.getElementById('completionAward');
  }
  box.hidden=false;box.classList.remove('celebrate');void box.offsetWidth;box.classList.add('celebrate');
  setTimeout(()=>{if(host)host.remove();else box.hidden=true},5000);
  prepareAwardSound();
  Promise.resolve(buffer).then(b=>{if(!b||context.state!=='running')return;const source=context.createBufferSource();source.buffer=b;source.connect(context.destination);source.start()}).catch(()=>{});
}
