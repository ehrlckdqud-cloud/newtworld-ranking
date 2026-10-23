// Viewport width is deliberately not a device test: a narrow PC window stays usable.
export function isSpaceDesktop(nav=globalThis.navigator){
 if(!nav)return false;
 const ua=nav.userAgent||'',platform=nav.platform||'',touch=Number(nav.maxTouchPoints)||0;
 if(nav.userAgentData?.mobile===true||/Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini|Silk|Kindle/i.test(ua))return false;
 if(/Mac/i.test(platform)&&touch>1)return false; // iPadOS desktop-style UA.
 if(/Linux.*arm|Linux.*aarch/i.test(platform)&&touch>0&&!/CrOS/i.test(ua))return false;
 return true;
}
