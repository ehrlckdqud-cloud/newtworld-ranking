import {arcadePackages} from './arcade-packages.mjs';
const endpoint='https://script.google.com/macros/s/REPLACE_WITH_DEPLOYMENT_ID/exec';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export async function admitArcade(member,game,launch,fetcher=fetch){
 if((!arcadePackages.has(game)&&!['mslug6','mslugxx'].includes(game))||!uuid.test(launch))return {ok:false,error:'게임 입장 정보를 확인해주세요.'};
 const payload={action:'contentArcadeEntry',...member,game,launch,expectedCost:500};
 const response=await fetcher(endpoint,{method:'POST',body:new URLSearchParams({payload:JSON.stringify(payload)}),signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error('입장 응답을 확인하지 못했습니다. 같은 화면에서 다시 시도해주세요.');
 const result=await response.json();
 if(!result.ok)return {ok:false,error:result.error||'게임 입장이 거절되었습니다.'};
 const run=result.run;
 if(run?.kind!=='member'||run.id!=='arcade-'+launch||run.game!=='arcade:'+game||run.cost!==500)throw Error('게임 입장 영수증을 확인하지 못했습니다.');
 return {ok:true,game,launch,cost:run.cost};
}
