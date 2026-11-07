const origin='https://newtworld-ms3-coop-5p.ehrlckdqud.chatgpt.site';
export function prepareGunbird2(screen,bytes,{signal,onFailure}){
 return new Promise((resolve,reject)=>{
  const frame=document.createElement('iframe');
  frame.className='arcade-vertical-frame';frame.title='건버드 2';frame.allow='autoplay';frame.tabIndex=-1;
  let ready=false,sent=false,previous=-1,closed=false;
  const post=(type,data={},transfer=[])=>frame.contentWindow?.postMessage({scope:'nw-gunbird2',type,...data},origin,transfer);
  const close=()=>{if(closed)return;closed=true;clearTimeout(timeout);window.removeEventListener('message',receive);signal.removeEventListener('abort',abort);frame.remove();};
  const fail=message=>{close();if(ready)onFailure(message);else reject(Error(message));};
  const abort=()=>fail('게임 준비가 취소됐습니다.');
  const timeout=setTimeout(()=>fail('구동기가 시작되지 않았습니다. 다시 열어주세요.'),90000);
  function receive(event){
   if(event.origin!==origin||event.source!==frame.contentWindow||event.data?.scope!=='nw-gunbird2')return;
   if(event.data.type==='listening'&&!sent){sent=true;post('load',{bytes},[bytes]);}
   if(event.data.type==='error')fail(event.data.message||'게임 구동 오류');
   if(event.data.type==='ready'&&!ready){
    ready=true;clearTimeout(timeout);resolve({
     play(){previous=-1;post('play');},pause(){previous=-1;post('pause');},
     input(mask){if(mask!==previous){post('input',{mask});previous=mask;}},close
    });
   }
  }
  window.addEventListener('message',receive);signal.addEventListener('abort',abort,{once:true});
  if(signal.aborted){abort();return;}
  frame.src=origin+'/arcade-runtime/gunbird2/player.html';screen.prepend(frame);
 });
}
