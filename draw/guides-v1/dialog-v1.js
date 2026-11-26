(()=>{
  'use strict';
  const script=document.currentScript;
  const raceRoute=location.pathname.split('/')[1];
  const hostedGame=location.hostname==='newtworld-ms3-coop-5p.ehrlckdqud.chatgpt.site'
    ? {'wild-run-91':'wild','pet-race':'pets'}[raceRoute] : null;
  const game=hostedGame || script.dataset.game;
  const names={pin:'생존핀볼',pond:'생존연못',wild:'양서파충류 달리기 대회',pets:'멍냥이 달리기 대회'};
  if(!Object.hasOwn(names,game))return;
  const guide=new URL(game+'.html',script.src);
  const race=game==='wild'||game==='pets';
  // The race finish engine and its UI are independently versioned. Keep the
  // server's scorer and select the published UI before the old UI auto-mounts.
  function connectRaceRanking(){
    const gameId=game==='wild'?'wild-run-91':'pet-race';
    const entry=document.querySelector('script[type="module"][data-draw-ranking-game="'+gameId+'"]');
    if(!entry)return false;
    const canonical=new URL('../draw-ranking-ui.mjs',script.src).href;
    if(entry.src===canonical || document.querySelector('[data-ndr-trigger],dialog.ndr-dialog'))return true;
    const fallback=entry.src;
    entry.removeAttribute('data-draw-ranking-game');
    const parsed=document.readyState==='loading'
      ? new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true})) : Promise.resolve();
    const mount=ui=>parsed.then(()=>ui.mountDrawRanking(gameId));
    import(canonical).then(mount).catch(()=>import(fallback).then(mount))
      .catch(error=>console.warn('달리기 순위 화면을 열지 못했습니다.',error));
    return true;
  }
  if(race && !connectRaceRanking() && document.readyState==='loading'){
    const observer=new MutationObserver(()=>{if(connectRaceRanking())observer.disconnect();});
    observer.observe(document.documentElement,{childList:true,subtree:true});
    document.addEventListener('DOMContentLoaded',()=>observer.disconnect(),{once:true});
  }
  // Sites 254 uses a classic script that mounts its own UI and calls finish(entries).
  function watchHostedRace(){
    let loading=false;
    const observer=new MutationObserver(attach);
    function attach(){
      if (loading || !window.NWDrawRanks || !document.querySelector('dialog.ndr-ranking[data-ndr="'+game+'"]')) return;
      loading=true;
      observer.disconnect();
      import(new URL('../hosted-race-ranking.mjs',script.src).href)
        .then(module=>module.connectHostedRace(game))
        .catch(error=>console.warn('달리기 순위 화면을 갱신하지 못했습니다.',error));
    }
    if (!document.querySelector('script[src*="rankings-v1.js"]') && !window.NWDrawRanks) return;
    observer.observe(document.documentElement,{childList:true,subtree:true});
    attach();
    window.addEventListener('load',()=>{attach();if(!document.querySelector('script[src*="rankings-v1.js"]'))observer.disconnect();},{once:true});
  }
  if(race) {
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',watchHostedRace,{once:true});
    else watchHostedRace();
  }
  function install(){
    const original=race?document.getElementById('guide'):null;
    const full=document.getElementById(game==='pin'?'focus':'pondFull');
    if(!(original||full)||document.querySelector('[data-draw-guide-button]'))return;
    const button=original||document.createElement('button');
    button.dataset.drawGuideButton='';button.setAttribute('aria-haspopup','dialog');
    if(!original){button.type='button';button.textContent='게임 안내';full.before(button);}
    const style=document.createElement('style');
    style.textContent=`
      [data-draw-guide-button]{white-space:nowrap;flex:none}
      .pond-head-actions [data-draw-guide-button],.head-actions [data-draw-guide-button]{min-width:0;width:auto;padding:5px 9px;color:#fff9dd;background:#193c32;border:1px solid #99ab96;border-radius:7px;font:650 14px system-ui;line-height:1.35;cursor:pointer}
      dialog[data-draw-guide]{padding:0!important;border:1px solid #a6b4a5!important;background:#f8f8f1!important;border-radius:14px;width:min(820px,calc(100vw - 24px))!important;max-width:calc(100vw - 12px)!important;height:min(850px,88vh);height:min(850px,88dvh);max-height:94dvh!important;position:fixed;inset:0;margin:auto;box-sizing:border-box;overflow:hidden;color:#172e28;box-shadow:0 18px 70px #07171475}
      dialog[data-draw-guide]:not([open]){display:none!important}dialog[data-draw-guide][open]{display:block!important}
      dialog[data-draw-guide]::backdrop{background:#071713aa}dialog[data-draw-guide] iframe{display:block;border:0;width:100%;height:100%;background:#f8f8f1}
      dialog[data-draw-guide]>.nw-guide-close{position:absolute;z-index:1;right:9px;top:9px;width:auto;min-width:40px;min-height:36px;margin:0;padding:4px 8px;color:#fff;background:#203d36;border:1px solid #afbfac;border-radius:7px;font:600 14px system-ui;cursor:pointer}
      @media(max-width:540px){.pond-head-actions [data-draw-guide-button],.head-actions [data-draw-guide-button]{padding:5px 6px;font-size:13px}dialog[data-draw-guide]{width:calc(100vw - 12px)!important;height:94dvh}}
    `;
    document.head.append(style);
    const dialog=original?document.getElementById('dlg'):document.createElement('dialog');
    if(!dialog)return;
    const close=document.createElement('button');close.type='button';close.className='nw-guide-close';close.textContent='닫기';
    close.onclick=()=>dialog.close();
    const frame=document.createElement('iframe');frame.title=names[game]+' 게임 안내 내용';frame.src=guide.href;
    const saved=document.createDocumentFragment();
    let previousLabel=null;
    // The existing race button owns pausing and resuming. Decorate the dialog it opens.
    button.addEventListener('click',()=>{
      if(dialog.hasAttribute('data-draw-guide')||(original&&!dialog.open))return;
      previousLabel=dialog.getAttribute('aria-label');
      if(original)while(dialog.firstChild)saved.append(dialog.firstChild);
      else (document.fullscreenElement||document.body).append(dialog);
      dialog.dataset.drawGuide='';dialog.setAttribute('aria-label',names[game]+' 게임 안내');
      dialog.append(close,frame);
      if(!dialog.open)dialog.showModal();
      close.focus({preventScroll:true});
    });
    dialog.addEventListener('close',()=>{
      if(!dialog.hasAttribute('data-draw-guide'))return;
      dialog.replaceChildren(saved);dialog.removeAttribute('data-draw-guide');
      if(previousLabel===null)dialog.removeAttribute('aria-label');else dialog.setAttribute('aria-label',previousLabel);
      button.focus({preventScroll:true});
    });
    dialog.addEventListener('click',e=>{
      if(!dialog.hasAttribute('data-draw-guide')||e.target!==dialog)return;
      const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();
    });
    window.addEventListener('message',e=>{
      if(dialog.open && dialog.hasAttribute('data-draw-guide') && e.source===frame.contentWindow && e.origin===guide.origin && e.data==='nw-guide-close')dialog.close();
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
