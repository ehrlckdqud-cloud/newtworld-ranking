// At most one frame is in flight so rendering never queues old game inputs or frames.
export function createFilterWorker(){
 let worker,busy=false;
 function reset(){worker?.terminate();worker=null;busy=false;}
 function submit(frame,factor,paint,fail){
  if(busy)return;
  try{
   worker??=new Worker(new URL('./picture-worker.mjs',import.meta.url),{type:'module'});
   const owner=worker;
   worker.onmessage=({data:bitmap})=>{
    if(owner===worker){busy=false;try{paint(bitmap);}finally{bitmap.close();}}
    else bitmap.close();
   };
   worker.onerror=()=>{if(owner===worker){reset();fail();}};
   busy=true;worker.postMessage({w:frame.width,h:frame.height,factor,buffer:frame.data.buffer},[frame.data.buffer]);
  }catch{reset();fail();}
 }
 return {submit,reset,get busy(){return busy;}};
}
