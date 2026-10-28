// Free test credits only. Future paid coins require a server-approved ledger.
export function applyLocalHostCommand(engine,command,{slot,playing,completed}){
 if(slot!==1||!['coin','start'].includes(command))return false;
 if(!engine||!playing)throw Error('현재 인원으로 시작을 먼저 눌러주세요.');
 if(completed)throw Error('게임이 완료되었습니다.');
 if(command==='coin')engine.coin();else engine.start();
 return true;
}
