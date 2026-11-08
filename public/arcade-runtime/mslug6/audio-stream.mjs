// One rendering-thread consumer for the PSP's stereo PCM stream.
export async function attachAudioStream(context,latency){
 if(!context.audioWorklet||!globalThis.SharedArrayBuffer)return null;
 const response=await fetch(new URL('./audio-worklet.mjs',import.meta.url));
 if(!response.ok)throw Error('PSP 오디오 모듈을 불러올 수 없습니다.');
 const moduleURL=URL.createObjectURL(new Blob([await response.arrayBuffer()],{type:'text/javascript'}));
 try{await context.audioWorklet.addModule(moduleURL);}finally{URL.revokeObjectURL(moduleURL);}
 const target=Math.ceil(context.sampleRate*latency/1000);
 let capacity=1024;
 while(capacity<target*4)capacity*=2;
 const shared=new SharedArrayBuffer(32+capacity*8);
 const state=new Int32Array(shared,0,8),pcm=new Float32Array(shared,32);
 const node=new AudioWorkletNode(context,'nw-psp-pcm',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{shared,capacity,target}});
 node.connect(context.destination);
 const queued=()=>(Atomics.load(state,0)-Atomics.load(state,1))>>>0;
 return {
  available(){return Math.max(0,target-queued());},
  push(heap,left,right,count){
   if(count>capacity-queued())return 0;
   const write=Atomics.load(state,0)>>>0;
   for(let i=0;i<count;i++){
    const j=((write+i)&(capacity-1))*2;
    pcm[j]=heap[left+i];pcm[j+1]=heap[right+i];
   }
   Atomics.store(state,0,(write+count)|0);
   return count;
  },
  close(){node.disconnect();},
  state
 };
}
