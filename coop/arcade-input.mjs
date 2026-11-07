// This FBNeo host exposes one nine-bit input mask. Pack the second controller
// above it and extend only the host callback, leaving game and BIOS bytes intact.
const bytes=hex=>Uint8Array.from(hex.match(/../g),pair=>parseInt(pair,16));
const oldCallback=bytes('0041002102024020000d0020014101470d00200341084d047f20034102742802f8e5080541000b4198ddc8022802007141004721020b20020b');
const twoPorts=bytes('0002402001410147200041014b720d00200341084b0d0020034102742802f8e5084198ddc802280200200041096c76714100470f0b41000b');

export function localArcadeCore(original){
 const hits=[];
 for(let pos=original.indexOf(oldCallback[0]);pos>=0;pos=original.indexOf(oldCallback[0],pos+1)){
  if(oldCallback.every((b,i)=>original[pos+i]===b))hits.push(pos);
 }
 if(hits.length!==1)throw Error('원작 실행 코어 버전을 확인해주세요.');
 const result=original.slice(),at=hits[0];
 result.set(twoPorts.subarray(0,-1),at);
 result.fill(1,at+twoPorts.length-1,at+oldCallback.length-1);
 if(!WebAssembly.validate(result))throw Error('원작 2인 입력 코어를 준비하지 못했습니다.');
 return result;
}
export const controls=[
 {KeyW:1,KeyS:2,KeyA:4,KeyD:8,KeyJ:16,KeyK:32,KeyU:64,Digit1:256},
 {ArrowUp:1,ArrowDown:2,ArrowLeft:4,ArrowRight:8,Numpad1:16,Numpad2:32,Numpad3:64,Digit2:256}
];
export function inputMask(keys,ports,coin){
 const mask=mapping=>Object.entries(mapping).reduce((v,[key,bit])=>v|(keys.has(key)?bit:0),0);
 return mask(controls[0])|(coin?128:0)|(ports===2?mask(controls[1])<<9:0);
}
