export async function waitForConnection(record,{timeout=20000,requireMedia=false,requireCore=false,now=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms)),valid=()=>true}={}){
 const end=now()+timeout;
 while(now()<end){if(!valid())throw Error('ROOM_CHANGED');if(record.channel?.readyState==='open'&&record.pc.connectionState==='connected'&&(!requireMedia||record.mediaReady)&&(!requireCore||record.coreReady))return;if(['failed','closed'].includes(record.pc.connectionState))throw Error('PEER_CONNECTION_FAILED');await sleep(100);}
 throw Error(requireMedia&&record.channel?.readyState==='open'&&record.pc.connectionState==='connected'?'VIDEO_FRAME_TIMEOUT':'PEER_CONNECTION_TIMEOUT');
}
