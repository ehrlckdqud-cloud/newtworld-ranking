// Retry only a definite lifecycle refusal. Never repeat an uncertain payment.
export async function requestContinue(send,{valid=()=>true,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 for(let attempt=0;;attempt++){
  if(!valid())throw Error('ROOM_CHANGED');
  try{return await send();}catch(error){
   if(error.message!=='CONTINUE_NOT_AVAILABLE'||attempt>=10)throw error;
   await sleep(150);
  }
 }
}
