// Delegate to each game's existing pause button so music/timers pause together.
export function installPauseShortcut(button, doc = document) {
  if (!button) return;
  const label = () => {
    const text = button.textContent.replace(/\s*\(Space\)\s*$/, '').trim().replace('계속 비행', '계속하기');
    if (text === '일시정지' || text === '계속하기') {
      const next = `${text} (Space)`;
      if (button.textContent !== next) button.textContent = next;
    }
  };
  label();
  button.setAttribute('aria-keyshortcuts', 'Space');
  const observer = new MutationObserver(label);
  observer.observe(button, {childList:true, characterData:true, subtree:true});
  let held = false;
  const down = event => {
    if (event.code !== 'Space' && event.key !== ' ') return;
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (target?.isContentEditable || target?.closest?.('input,textarea,select,[role="textbox"]')) return;
    if (target !== button && target?.closest?.('button,a,[role="button"]')) return;
    if (doc.querySelector('dialog[open],[aria-modal="true"]')) return;
    if (button.disabled || button.closest('[hidden],[inert]') || !button.getClientRects().length) return;
    event.preventDefault();
    if (event.repeat || held) return;
    held = true;
    button.click();
  };
  const up = event => {
    if ((event.code === 'Space' || event.key === ' ') && held) {
      event.preventDefault(); // Avoid a second native click on a focused pause button.
      held = false;
    }
  };
  const blur = () => { held = false; };
  doc.addEventListener('keydown', down);
  doc.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  return () => {observer.disconnect();doc.removeEventListener('keydown',down);doc.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};
}
installPauseShortcut(document.querySelector('#pause,#pondPause,#sppause'));
function installResumeButton(control, arena, paused) {
  if (!control || !arena) return;
  const resume = document.createElement('button');
  resume.type = 'button';
  resume.textContent = '▶ 경기 계속하기';
  resume.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:50;min-height:48px;padding:10px 22px;border:1px solid #a9d5ca;border-radius:12px;background:#102c29;color:white;font:700 16px system-ui;white-space:nowrap;pointer-events:auto;cursor:pointer';
  const sync = () => { resume.hidden = !paused(); resume.style.display = resume.hidden ? 'none' : 'block'; };
  resume.addEventListener('click', () => { if (paused()) control.click(); sync(); });
  sync();
  arena.append(resume);
  const observer = new MutationObserver(sync);
  observer.observe(control, {childList:true, characterData:true, subtree:true, attributes:true, attributeFilter:['disabled']});
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pageshow', sync);
  return sync;
}
const pauseControl=document.querySelector('#pause,#pondPause,#sppause');
if(pauseControl){
 const space=pauseControl.id==='sppause';
 const arena=document.querySelector(space?'#nwspace .stage':pauseControl.id==='pondPause'?'#pondRoot':'#arena');
 const active=document.querySelector('#spnames');
 const sync=installResumeButton(pauseControl,arena,()=>!pauseControl.disabled&&(!space||active?.disabled)&&/계속/.test(pauseControl.textContent));
 if(space&&active&&sync)new MutationObserver(sync).observe(active,{attributes:true,attributeFilter:['disabled']});
}
function installMobileExit(pauseGame, exitUrl) {
  if (!matchMedia('(pointer:coarse)').matches && navigator.maxTouchPoints < 1) return;
  const dialog = document.createElement('dialog');
  dialog.style.cssText = 'box-sizing:border-box;width:max-content!important;max-width:90vw!important;height:fit-content!important;min-height:0!important;max-height:90dvh!important;inset:0;margin:auto;padding:14px 18px 10px!important;border:1px solid #72998e;border-radius:14px;background:#122a26;color:#fff;text-align:center;z-index:1000';
  dialog.setAttribute('aria-label','게임을 종료하시겠습니까?');
  const title=document.createElement('p');
  title.textContent='게임을 종료하시겠습니까?';
  title.style.cssText='height:auto!important;min-height:0!important;margin:0 0 10px!important;padding:0!important;font:700 17px/1.35 system-ui;color:white';
  const buttons=['취소','확인'].map(text=>{
    const b=document.createElement('button');b.type='button';b.textContent=text;
    b.style.cssText='margin:0 4px;height:38px!important;min-height:0!important;width:auto!important;padding:4px 18px;border:1px solid #799e91;border-radius:8px;background:#21463d;color:white;font:600 15px system-ui';
    return b;
  });
  const content=document.createElement('div');
  content.style.cssText='display:block!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important';
  content.append(title,...buttons);dialog.append(content);

  let leaving=false;
  const arm=()=>{if(!history.state?.nwDrawExit)history.pushState({...history.state,nwDrawExit:true},'');};
  arm();
  // Renew the entry with activation if the browser would skip a pre-interaction entry.
  let activated=false;
  function activate(){
    if(activated||dialog.open)return;
    if(navigator.userActivation&&!navigator.userActivation.isActive)return;
    activated=true;
    if(history.state?.nwDrawExit)history.replaceState({...history.state,nwDrawExit:false},'');
    arm();
  }
  for(const type of ['click','keydown','touchend'])document.addEventListener(type,activate,{capture:true,once:true});
  function ask(){
    pauseGame();
    if(!dialog.open){
      (document.fullscreenElement||document.body).append(dialog);
      dialog.showModal();dialog.style.setProperty('display','block','important');buttons[0].focus();
    }
  }
  dialog.addEventListener('close',()=>dialog.style.removeProperty('display'));
  window.addEventListener('popstate',()=>{if(!leaving&&!history.state?.nwDrawExit){arm();ask();}});
  window.navigation?.addEventListener('navigate',event=>{
    if(leaving||event.navigationType!=='traverse'||!event.cancelable||event.destination.index>=navigation.currentEntry.index)return;
    event.preventDefault();ask();
  });
  buttons[0].onclick=()=>dialog.close();
  dialog.addEventListener('cancel',e=>{e.preventDefault();dialog.close();});
  buttons[1].onclick=()=>{leaving=true;location.replace(exitUrl);};
}
if(pauseControl)installMobileExit(()=>{
  const running=pauseControl.id!=='sppause'||document.querySelector('#spnames')?.disabled;
  if(running&&!pauseControl.disabled&&!/계속/.test(pauseControl.textContent))pauseControl.click();
},new URL('../index.html#draw',location.href).href);
