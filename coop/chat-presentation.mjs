/** Local presentation is immediate; server echo acknowledges without replaying the bubble. */
export function createChatPresentation({show,reject}){
 const seen=new Map();
 const key=e=>`${e.slot}:${e.messageId}`;
 function display(e){const k=key(e);if(seen.has(k))return false;seen.set(k,e);if(seen.size>200)seen.delete(seen.keys().next().value);show(e);return true;}
 return {receive:display,send(e,post){display(e);return Promise.resolve().then(()=>post(e)).catch(error=>{seen.delete(key(e));reject(e,error);throw error;});}};
}
