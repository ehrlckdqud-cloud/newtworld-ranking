// Luminance patterns from the PSP mode menu and title. Sampling the upper screen excludes changing prompts.
const menu=[55,52,52,54,50,33,33,34,34,34,34,33,56,53,53,54,41,30,27,35,27,18,19,18,20,17,17,17,57,64,94,148,41,59,71,49,69,55,71,64,18,19,17,17,59,65,68,89,39,46,40,53,49,47,52,60,26,25,25,20,90,92,67,89,49,41,33,41,44,38,46,44,29,22,18,24,104,85,54,48,45,26,18,20,27,25,27,26,34,31,35,35,40,69,36,47,35,25,16,14,8,9,9,9,13,22,48,38,36,56,54,46,30,10,12,15,22,21,8,16,21,12,13,26,39,54,41,69];
const title=[1,70,176,176,116,108,159,176,176,176,176,176,176,176,70,1,0,75,190,183,65,72,93,122,139,136,122,98,189,190,75,0,0,75,190,153,63,80,93,98,92,90,66,65,149,190,75,0,0,75,189,89,69,82,83,97,99,73,70,47,92,190,75,0,0,75,188,105,50,67,68,69,75,79,130,164,135,190,75,0,0,75,190,175,57,56,66,64,60,61,127,135,136,190,75,0,0,75,190,172,73,59,63,75,82,75,125,133,131,190,75,0,0,75,190,190,158,160,177,189,190,177,149,156,121,190,75,0];

function correlation(samples,reference){
 const mean=samples.reduce((a,b)=>a+b,0)/samples.length;
 const center=reference.reduce((a,b)=>a+b,0)/reference.length;
 let product=0,variance=0,refVariance=0;
 for(let i=0;i<samples.length;i++){
  const x=samples[i]-mean,y=reference[i]-center;
  product+=x*y;variance+=x*x;refVariance+=y*y;
 }
 return variance>samples.length*36?product/Math.sqrt(variance*refVariance):0;
}
export async function prepareTitle(emulator,isLoading){
 const probe=document.createElement('canvas');
 probe.width=16;probe.height=8;
 const context=probe.getContext('2d',{willReadFrequently:true});
 const until=performance.now()+100000;
 let lastSelection=-Infinity;
 while(isLoading() && performance.now()<until){
  await new Promise(requestAnimationFrame);
  const canvas=document.querySelector('#game canvas');
  if(canvas?.width && canvas.height){
   // WebGL discards the back buffer after presentation. Read the PSP framebuffer
   // through the core so the startup check also works on accelerated renderers.
   const png=await Promise.race([emulator.gameManager.screenshot(),new Promise((_,reject)=>setTimeout(()=>reject(Error('PSP 화면 응답 시간이 초과됐습니다.')),5000))]);
   const frame=await createImageBitmap(new Blob([png],{type:'image/png'}));
   context.imageSmoothingQuality='high';
   context.drawImage(frame,0,0,frame.width,frame.height*0.66,0,0,16,8);
   frame.close();
   const rgba=context.getImageData(0,0,16,8).data;
   const gray=Array.from({length:128},(_,i)=>.299*rgba[i*4]+.587*rgba[i*4+1]+.114*rgba[i*4+2]);
   if(correlation(gray,title)>.87)return;
   if(correlation(gray,menu)>.82 && performance.now()-lastSelection>2200){
    lastSelection=performance.now();
    emulator.gameManager.simulateInput(0,0,1);
    try{await new Promise(r=>setTimeout(r,160));}finally{emulator.gameManager.simulateInput(0,0,0);}
   }
  }
  await new Promise(r=>setTimeout(r,100));
 }
 throw Error('메탈슬러그 6 타이틀 화면에 도달하지 못했습니다.');
}

// This disc boots MS6.PRX directly. Resolve guest RAM by validating both its
// version-specific text and the MIPS instructions that read the 1P credit word.
const anchor=new TextEncoder().encode('CPlayerProfile::setCreditMode invalid value specified');
const readCredit=[0x08,0xe6,0x63,0x8c,0x08,0x00,0xe0,0x03,0x2a,0x10,0x03,0x00];
let creditOffset;
export function insertCredit(heap){
 if(!heap)return false;
 const valid=offset=>readCredit.every((v,i)=>heap[offset-0xa6e608+0x806ff8+i]===v);
 if(creditOffset===undefined||!valid(creditOffset)){
  creditOffset=undefined;
  for(let i=heap.indexOf(anchor[0]);i!==-1;i=heap.indexOf(anchor[0],i+1)){
   if(!anchor.every((v,j)=>heap[i+j]===v))continue;
   const offset=i-0x9f53c0+0xa6e608;
   if(offset>=0 && offset+4<=heap.length && valid(offset)){creditOffset=offset;break;}
  }
 }
 if(creditOffset===undefined)return false;
 const ram=new DataView(heap.buffer,heap.byteOffset,heap.byteLength);
 const credits=ram.getUint32(creditOffset,true);
 if(credits>99)return false;
 if(credits<99)ram.setUint32(creditOffset,credits+1,true);
 return true;
}
