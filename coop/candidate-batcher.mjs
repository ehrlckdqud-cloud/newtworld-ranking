// ICE candidates share one room transaction instead of one HTTP round trip each.
export function createCandidateBatcher(send,onError=()=>{},{delay=100,schedule=setTimeout,cancel=clearTimeout}={}){
 let pending=[],timer=null,closed=false;
 const flush=()=>{timer=null;if(closed||!pending.length)return;const candidates=pending.splice(0,32);Promise.resolve().then(()=>send({type:'candidates',candidates})).catch(onError);if(pending.length)timer=schedule(flush,delay);};
 return {add(candidate){if(closed)return;if(candidate)pending.push(candidate);if(!candidate){if(timer!==null)cancel(timer);flush();}else if(timer===null)timer=schedule(flush,delay);},cancel(){closed=true;pending=[];if(timer!==null)cancel(timer);timer=null;}};
}
