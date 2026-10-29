export async function waitForConnection(record,{timeout=20000,now=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms)),valid=()=>true}={}){
 const end=now()+timeout;
 while(now()<end){if(!valid())throw Error('ROOM_CHANGED');if(record.channel?.readyState==='open'&&record.pc.connectionState==='connected')return;if(['failed','closed'].includes(record.pc.connectionState))throw Error('PEER_CONNECTION_FAILED');await sleep(100);}
 throw Error('PEER_CONNECTION_TIMEOUT');
}
