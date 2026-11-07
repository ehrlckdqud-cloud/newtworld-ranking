const origin='https://newtworld-ms3-coop-5p.ehrlckdqud.chatgpt.site';
export function prepareCabinet(game,screen,bytes,{signal,onFailure}){
 const title=game==='gunbird2'?'건버드 2':game==='puyopuyo2'?'뿌요뿌요 2':null;
 if(!title)throw Error('지원하지 않는 게임입니다.');
 const scope='nw-'+game;
 return new Promise((resolve,reject)=>{
  const frame=document.createElement('iframe');
  frame.className='arcade-vertical-frame';frame.title=title;frame.allow='autoplay';frame.tabIndex=-1;
  let ready=false,sent=false,previous=-1,closed=false;
  const post=(type,data={},transfer=[])=>frame.contentWindow?.postMessage({scope,type,...data},origin,transfer);
  const close=()=>{if(closed)return;closed=true;clearTimeout(timeout);window.removeEventListener('message',receive);signal.removeEventListener('abort',abort);frame.remove();};
  const fail=message=>{close();if(ready)onFailure(message);else reject(Error(message));};
  const abort=()=>fail('게임 준비가 취소됐습니다.');
  const timeout=setTimeout(()=>fail('구동기가 시작되지 않았습니다. 다시 열어주세요.'),game==='puyopuyo2'?180000:90000);
  function receive(event){
   if(event.origin!==origin||event.source!==frame.contentWindow||event.data?.scope!==scope)return;
   if(event.data.type==='listening'&&!sent){sent=true;post('load',{bytes},[bytes]);}
   if(event.data.type==='error')fail(event.data.message||'게임 구동 오류');
   if(event.data.type==='ready'&&!ready){
    ready=true;clearTimeout(timeout);resolve({
     play(){previous=-1;post('play');},pause(){previous=-1;post('pause');},
     setPlayers(count){previous=-1;post('players',{count});},
     input(mask){if(mask!==previous){post('input',{mask});previous=mask;}},close
    });
   }
  }
  window.addEventListener('message',receive);signal.addEventListener('abort',abort,{once:true});
  if(signal.aborted){abort();return;}
  frame.src=origin+'/arcade-runtime/'+game+'/player.html';screen.prepend(frame);
 });
}

export const prepareGunbird2=(screen,bytes,options)=>prepareCabinet('gunbird2',screen,bytes,options);
