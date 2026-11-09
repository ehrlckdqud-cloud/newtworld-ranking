// FBNeo system RAM offsets are in host word order, as in the Arcade code notes.
const layouts={
 mslug:[0x81b6,0x6ed1,6],mslug2:[0xe86e,0xe877,6],mslugx:[0xc46a,0xc2f4,6],
 mslug3:[0xed18,0x040d,5],mslug4:[0x66d6,0x0bcd,6],mslug5:[0xde14,0x0bad,5]
};
export function neoRecord(game, report){
 const layout=layouts[game];if(!layout)return null;
 const [scoreAt,stageAt,ending]=layout;
 let armed=false,lastStage=-1,best=0,star=false,saved=0,savedStar=false,pending=false,next=0;
 async function flush(force=false){
  if(pending||(saved===best&&savedStar===star)||(!force&&Date.now()<next))return;
  const score=best,completed=star;pending=true;next=Date.now()+5000;
  try{await report(score,completed);saved=score;savedStar=completed;}catch{}finally{pending=false;}
 }
 return {start(){armed=true;},sample(core){
  if(!armed)return;
  const ram=core.HEAPU8,base=core._nw_ram(),read=i=>ram[base+i];
  const state=read(0xfdb7),stage=read(stageAt);
  if(state===3){armed=false;lastStage=-1;return;}
  if(state!==1&&state!==2)return;
  if(stage===lastStage+1)lastStage=stage;
  if(lastStage<0)return;
  const digits=[1,0,3,2].map(n=>read(scoreAt+n).toString(16).padStart(2,'0')).join('');
  if(/^\d{8}$/.test(digits))best=Math.max(best,Number(digits));
  if(lastStage===ending)star=true;
  void flush();
 },flush:()=>flush(true)};
}
