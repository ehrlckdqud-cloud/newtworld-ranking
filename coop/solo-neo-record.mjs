// FBNeo system RAM offsets are in host word order, as in the Arcade code notes.
const layouts={
 mslug:[0x81b6,0x6ed1,6],mslug2:[0xe86e,0xe877,6],mslugx:[0xc46a,0xc2f4,6],
 mslug3:[0xed18,0x040d,5],mslug4:[0x66d6,0x0bcd,6],mslug5:[0xde14,0x0bad,5]
};
export function neoRecord(game, report){
 const layout=layouts[game];if(!layout)return null;
 const [scoreAt,stageAt,ending]=layout;
 let sawFinalBoss=false,armed=false,lastStage=-1,best=0,star=false,saved=0,savedStar=false,pending=false,next=0;
 let retrying=false,closing=false;
 async function flush(force=false){
  if(pending||(saved===best&&savedStar===star)||(!force&&!(star&&!savedStar&&!retrying)&&Date.now()<next))return;
  const score=best,completed=star;pending=true;next=Date.now()+5000;
  try{await report(score,completed);saved=score;savedStar=completed;retrying=false;}catch{retrying=true;next=Date.now()+5000;return;}finally{pending=false;}
  if((star&&!completed)||closing)void flush(closing);
 }
 return {start(){armed=true;},sample(core){
  if(star)void flush();
  if(!armed)return;
  const ram=core.HEAPU8,base=core._nw_ram(),read=i=>ram[base+i];
  const state=read(0xfdb7),stage=read(stageAt);
  // Ending and game mode can change on the same emulated frame.
  if(lastStage===ending-1&&stage===ending&&(state===1||state===2||state===3)){
   star=true;void flush();
  }
  if(state===3){armed=false;lastStage=-1;sawFinalBoss=false;return;}
  if(state!==1&&state!==2)return;
  if(stage===lastStage+1)lastStage=stage;
  if(lastStage<0)return;
  const digits=[1,0,3,2].map(n=>read(scoreAt+n).toString(16).padStart(2,'0')).join('');
  if(/^\d{8}$/.test(digits))best=Math.max(best,Number(digits));
  if(game==='mslug4'&&lastStage===5){
   const field=a=>read(a)|(read(a+1)<<8);
   if(field(0x42aa)>0)sawFinalBoss=true;
   if(sawFinalBoss&&field(0x42aa)===0&&field(0xb5e)===0x9fd4)star=true;
  }
  if(lastStage===ending)star=true;
  void flush();
 },flush:()=>{closing=true;return flush(true);}};
}
