const endpoint='https://script.google.com/macros/s/REPLACE_WITH_DEPLOYMENT_ID/exec';
export async function payCoin(member,{requestId,room,slot,quantity=1},fetcher=fetch){
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>99)throw Error('INVALID_QUANTITY');
 const cost=quantity*200;
 const response=await fetcher(endpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({payload:JSON.stringify({action:'contentCoopCoin',token:member.token,device:member.device,requestId,room,slot,quantity,expectedCost:cost})}),signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error('PAYMENT_PENDING_RETRY');
 const result=await response.json();if(!result.ok){const error=Error(result.error||'PAYMENT_FAILED');error.definitive=true;throw error;}
 const run=result.run;if(run?.id!==requestId||run.game!=='mslug3'||run.room!==room||run.slot!==slot||run.cost!==cost||(run.quantity??1)!==quantity||run.kind!=='member')throw Error('PAYMENT_RECEIPT_INVALID');
 return result;
}
