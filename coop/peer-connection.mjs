// Include candidates in SDP so a lost/late trickle request cannot lose the whole route.
export async function gatherDescription(pc,{timeout=2500,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 if(pc.iceGatheringState!=='complete')await new Promise(resolve=>{let timer;const done=()=>{clearTimer(timer);pc.removeEventListener('icegatheringstatechange',changed);resolve();};const changed=()=>{if(pc.iceGatheringState==='complete')done();};pc.addEventListener('icegatheringstatechange',changed);timer=setTimer(done,timeout);changed();});
 return {type:pc.localDescription.type,sdp:pc.localDescription.sdp};
}
export function peerOptions(config,mode='auto'){
 let iceServers=config.iceServers;
 if(mode==='tls')iceServers=iceServers.flatMap(s=>{const urls=(Array.isArray(s.urls)?s.urls:[s.urls]).filter(u=>/^turns:/.test(u));return urls.length?[{...s,urls}]:[];});
 if(mode==='tls'&&!iceServers.length)throw Error('TURN_TLS_UNAVAILABLE');
 return {iceServers,iceTransportPolicy:mode==='tls'?'relay':'all',bundlePolicy:'max-bundle'};
}
export function connectionStage(record){
 const pc=record.pc;
 if(!pc.remoteDescription)return '상대 PC의 연결 응답을 받지 못했습니다';
 if(['new','checking','failed'].includes(pc.iceConnectionState))return '양쪽 PC의 통신 경로를 연결하지 못했습니다';
 if(record.channel?.readyState!=='open')return '통신 경로는 확인됐지만 게임 입력 연결이 열리지 않았습니다';
 return record.mediaReady?'영상·입력 연결 완료를 확인하지 못했습니다':'입력은 연결됐지만 상대 PC에서 게임 영상을 재생하지 못했습니다';
}
