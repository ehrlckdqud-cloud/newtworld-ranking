// This disc boots MS6.PRX directly. Resolve guest RAM by validating both its
// version-specific text and the MIPS instructions that read the 1P credit word.
const anchor=new TextEncoder().encode('CPlayerProfile::setCreditMode invalid value specified');
const readCredit=[0x08,0xe6,0x63,0x8c,0x08,0x00,0xe0,0x03,0x2a,0x10,0x03,0x00];
let creditOffset;
function locateCredits(heap){
 if(!heap)return;
 const valid=offset=>readCredit.every((v,i)=>heap[offset-0xa6e608+0x806ff8+i]===v);
 if(creditOffset===undefined||!valid(creditOffset)){
  creditOffset=undefined;
  for(let i=heap.indexOf(anchor[0]);i!==-1;i=heap.indexOf(anchor[0],i+1)){
   if(!anchor.every((v,j)=>heap[i+j]===v))continue;
   const offset=i-0x9f53c0+0xa6e608;
   if(offset>=0 && offset+4<=heap.length && valid(offset)){creditOffset=offset;break;}
  }
 }
 return creditOffset;
}
export function insertCredit(heap){
 const offset=locateCredits(heap);
 if(offset===undefined)return false;
 const ram=new DataView(heap.buffer,heap.byteOffset,heap.byteLength),credits=ram.getUint32(offset,true);
 if(credits>99)return false;
 ram.setUint32(offset,Math.min(99,credits+1),true);return true;
}
// The bundled checkpoint was captured while paused at PRESS START. Its credit
// marker acknowledges a real restore without reading GPU pixels on the client.
export async function restoreTitle(emulator,checkpoint,signal){
 emulator.gameManager.loadState(checkpoint);
 const until=performance.now()+8000;
 while(performance.now()<until){
  signal.throwIfAborted();
  const heap=emulator.Module.HEAPU8,offset=locateCredits(heap);
  if(offset!==undefined){
   const ram=new DataView(heap.buffer,heap.byteOffset,heap.byteLength);
   if(ram.getUint32(offset,true)===87){
    ram.setUint32(offset,15,true);
    const frame=emulator.Module._get_current_frame_count();
    const deadline=performance.now()+4000;
    while(emulator.Module._get_current_frame_count()-frame<3){
     signal.throwIfAborted();
     if(performance.now()>deadline)throw Error('타이틀 화면을 표시할 수 없습니다.');
     await new Promise(r=>setTimeout(r,24));
    }
    return;
   }
  }
  await new Promise(r=>setTimeout(r,80));
 }
 throw Error('타이틀 상태를 복원하지 못했습니다.');
}
