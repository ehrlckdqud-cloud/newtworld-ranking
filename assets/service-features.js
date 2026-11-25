// The public response contains only the two operator-controlled switches.
window.NWServiceFeatures=Promise.resolve(window.NWConfigReady).then(()=>new Promise(resolve=>{
 const url=window.NW_CONFIG?.appScriptUrl;
 const paused={login:false,ai:false};
 if(!url){resolve(paused);return;}
 const callback='nwFeatures_'+crypto.randomUUID().replace(/-/g,'');
 const script=document.createElement('script');
 const timer=setTimeout(()=>finish(paused),15000);
 function finish(flags){
  clearTimeout(timer);script.remove();delete window[callback];
  document.documentElement.classList.toggle('nw-login-enabled',flags.login);
  document.documentElement.classList.toggle('nw-ai-enabled',flags.ai);
  resolve(flags);
 }
 window[callback]=data=>finish(data?.ok?{login:data.login===true,ai:data.ai===true}:paused);
 script.onerror=()=>finish(paused);
 script.src=url+'?'+new URLSearchParams({action:'serviceFeatures',callback});
 document.head.append(script);
}));
