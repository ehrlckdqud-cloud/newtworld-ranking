// A single mutation at a time, with liveness and player commands ahead of ICE bursts.
export function createRoomActions(send,{sleep=ms=>new Promise(r=>setTimeout(r,ms)),random=Math.random}={}){
 const queue=[];let running=false,ping=null;
 const priority=m=>['start-native','native-command','native-resume','ready','chat'].includes(m?.type)?0:m?.type==='ping'?1:m?.type==='signal'?3:2;
 async function drain(){if(running)return;running=true;try{while(queue.length){queue.sort((a,b)=>priority(a.action)-priority(b.action));const job=queue.shift();try{let result;for(let attempt=0;;attempt++){try{result=await send(job.action);break;}catch(e){if(e.message!=='ROOM_BUSY_RETRY'||attempt>=4)throw e;await sleep(100*(attempt+1)+Math.floor(random()*200));}}job.resolve(result);}catch(e){job.reject(e);}}}finally{running=false;}}
 return action=>{if(action?.type==='ping'&&ping)return ping;const task=new Promise((resolve,reject)=>queue.push({action,resolve,reject}));if(action?.type==='ping'){ping=task;task.then(()=>{ping=null;},()=>{ping=null;});}void drain();return task;};
}
