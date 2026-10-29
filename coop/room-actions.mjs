// Serialize writes from this client. Retry only an explicit, uncommitted CAS conflict.
export function createRoomActions(send,{sleep=ms=>new Promise(r=>setTimeout(r,ms)),random=Math.random}={}){
 let tail=Promise.resolve();
 return action=>{const task=tail.then(async()=>{for(let attempt=0;;attempt++){try{return await send(action);}catch(e){if(e.message!=='ROOM_BUSY_RETRY'||attempt>=4)throw e;await sleep(100*(attempt+1)+Math.floor(random()*200));}}});tail=task.catch(()=>{});return task;};
}
