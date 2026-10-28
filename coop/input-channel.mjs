/** One receiver per authenticated peer connection; payload cannot choose its seat. */
export function inputReceiver({slot,accept,enabled=()=>true,now=()=>performance.now()}){
 let sequence=-1,windowAt=0,count=0;
 return raw=>{
  if(typeof raw!=='string'||raw.length>160||!enabled())return false;
  let m;try{m=JSON.parse(raw)}catch{return false;}
  if(m.type!=='input'||!Number.isInteger(m.bits)||m.bits<0||m.bits>127||!Number.isSafeInteger(m.sequence)||m.sequence<=sequence||m.sequence<0)return false;
  const t=now();if(t-windowAt>=1000){windowAt=t;count=0;}if(++count>90)return false;
  sequence=m.sequence;accept(slot,m.bits,t);return true;
 };
}
