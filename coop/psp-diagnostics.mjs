import {assertPspSupport} from './psp-contract.mjs?v=1';
const picker=document.querySelector('#iso');
const check=document.querySelector('#check');
const run=document.querySelector('#run');
const status=document.querySelector('#status');
const game=document.querySelector('#game');
const DATA='https://cdn.emulatorjs.org/4.2.3/data/';
let launched=false;
const setStatus=message=>{status.textContent=message;};
const validate=()=>{
  assertPspSupport(window);
  const canvas=document.createElement('canvas');
  if(!canvas.getContext('webgl2'))throw Error('PSP 실행에 필요한 WebGL2가 없습니다.');
  const file=picker.files?.[0];
  if(!file)throw Error('먼저 본인 소유의 PSP ISO를 선택하세요.');
  if(!/\.iso$/i.test(file.name)||file.size<1024*1024)throw Error('ISO 파일 이름과 크기를 확인하세요.');
  return file;
};
function refresh(){
  if(launched)return;
  try{const file=validate();run.disabled=false;setStatus('환경 검사 통과 · '+file.name+' ('+(file.size/1024/1024).toFixed(1)+' MiB) · 뉴트젬 차감 없음');}
  catch(error){run.disabled=true;setStatus('실행 준비 불가: '+error.message);}
}
picker.addEventListener('change',refresh);
check.addEventListener('click',refresh);
run.addEventListener('click',()=>{
  if(launched)return;
  let file;
  try{file=validate();}catch(error){setStatus(error.message);return;}
  launched=true;run.disabled=true;picker.disabled=true;
  // Blob URLs must stay alive for the lifetime of the PSP emulator instance.
  const fileUrl=URL.createObjectURL(file);
  window.addEventListener('pagehide',()=>URL.revokeObjectURL(fileUrl),{once:true});
  window.EJS_player='#game';
  window.EJS_core='psp';
  window.EJS_gameUrl=fileUrl;
  window.EJS_gameName='Metal Slug 6 PSP (local diagnostics)';
  window.EJS_pathtodata=DATA;
  window.EJS_threads=true;
  window.EJS_startOnLoaded=true;
  window.EJS_onGameStart=()=>{
    setStatus('PSP 코어에서 게임 시작 콜백 수신. 실제 미션 1 진입과 이동/사격/사운드는 화면에서 직접 확인해야 합니다. 입장료 차감 없음.');
  };
  window.EJS_onExit=()=>setStatus('PSP 에뮬레이터 종료 · 뉴트젬 차감 없음');
  game.hidden=false;
  setStatus('PSP 코어 다운로드/실행 준비 중 · 뉴트젬 차감 없음');
  const script=document.createElement('script');
  script.src=DATA+'loader.js';
  script.onerror=()=>setStatus('EmulatorJS 로더를 불러오지 못했습니다. COEP 정책과 CDN 응답 헤더를 확인하세요.');
  document.head.append(script);
});
refresh();
