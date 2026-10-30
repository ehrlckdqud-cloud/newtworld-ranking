// Terminal room errors cannot be repaired by replaying the same bearer token.
export const endedRoomMessage=error=>({
 UNAUTHORIZED:'방 접속 정보가 만료되어 채널 목록으로 돌아왔습니다. 다시 입장해주세요.',
 PLAYER_DISCONNECTED:'접속이 끊겨 방에서 퇴장되었습니다. 다시 입장해주세요.',
 KICKED_FROM_ROOM:'방장에 의해 강퇴되었습니다. 이 방에는 다시 입장할 수 없습니다.',
 ROOM_NOT_FOUND:'방이 종료되어 채널 목록으로 돌아왔습니다.',
 MEMBER_MISMATCH:'방 접속 회원 정보가 변경되었습니다. 다시 입장해주세요.'
}[error?.message||error]||'');

// Leaving the local room must not depend indefinitely on a server acknowledgement.
export async function leaveRoomSafely({flush,leave,exit,isCurrent,timeoutMs=10000}){
 let expired=false,timer;
 const task=(async()=>{
  try{await flush();}catch{}
  if(!expired&&isCurrent())await leave();
 })();
 try{await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(Error('LEAVE_TIMEOUT'));},timeoutMs);})]);}
 catch(error){return error;}
 finally{expired=true;clearTimeout(timer);if(isCurrent())exit();}
}
