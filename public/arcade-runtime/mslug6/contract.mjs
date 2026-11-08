// Small, testable contract shared by the PSP launcher and server integration.
export const PSP_GAME='mslug6';
export const PSP_PRICE=500;
export const PSP_CORE='ppsspp';
export function assertPspSupport(env=globalThis){
  if(!env.isSecureContext)throw Error('PSP 게임은 HTTPS 환경에서만 실행할 수 있습니다.');
  if(!env.crossOriginIsolated||typeof env.SharedArrayBuffer==='undefined')
    throw Error('PSP 실행 서버에 COOP/COEP 격리 설정이 필요합니다. 현재 환경에서는 뉴트젬이 차감되지 않습니다.');
  if(!env.WebAssembly)throw Error('현재 브라우저는 PSP 실행을 지원하지 않습니다.');
}
export function validatePspPackage(manifest,base){
  if(manifest?.game!==PSP_GAME||typeof manifest.url!=='string')throw Error('PSP 게임 패키지 응답이 올바르지 않습니다.');
  let url;
  try{url=new URL(manifest.url,base);}catch{throw Error('PSP 파일 주소가 올바르지 않습니다.');}
  const origin=new URL(base).origin;
  // The endpoint may stream a file or redirect to a temporary signed storage URL.
  // Never allow an arbitrary external host to be injected by an API response.
  if(url.protocol!=='https:'||url.origin!==origin)throw Error('PSP 게임 파일 주소가 승인된 서버가 아닙니다.');
  return url.href;
}
export function validateArcadeCharge(result,launch){
  if(!result?.ok||result.game!==PSP_GAME||result.launch!==launch||result.cost!==PSP_PRICE)
    throw Error(result?.error||'입장료 승인 정보를 확인하지 못했습니다.');
  return true;
}

