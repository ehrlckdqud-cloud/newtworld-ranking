// Read-only native object observations. No ROM, session credentials or member data.
export function createGameDiagnostics({now=()=>Date.now()}={}){
 let samples=[],lastAt=-Infinity,error=null,lastEngine=null;
 const signed=n=>n>32767?n-65536:n;
 function capture(engine,{force=false}={}){
  if(!engine||!['playing','complete','game-over'].includes(engine.phase))return;
  if(engine!==lastEngine||engine.frame<(samples.at(-1)?.frame??0)){samples=[];lastAt=-Infinity;lastEngine=engine;}
  const at=now();if(!force&&at-lastAt<2000)return;lastAt=at;
  try{
   const ram=engine.ram();
   const byte=a=>ram[(a&65535)^1];
   const word=a=>ram[a&65535]|ram[(a+1)&65535]<<8;
   const long=a=>((word(a)<<16)|word(a+2))>>>0;
   const object=a=>({
    address:a,routine:long(a),parent:long(a+0x38),
    localX:signed(word(a+0x28)),localY:signed(word(a+0x2c)),
    screenX:signed(word(a+0x3c)),screenY:signed(word(a+0x40)),
    // Labels are offsets, not speculative interpretations of native fields.
    words0c:Array.from({length:14},(_,i)=>word(a+0x0c+i*2)),
    words44:Array.from({length:54},(_,i)=>word(a+0x44+i*2))
   });
   const linked=a=>{
    const p=long(a+4),n=long(a+8);
    return p>=0x100000&&p<=0x10fff4&&n>=0x100000&&n<=0x10fff4&&long(p+8)===a&&long(n+4)===a;
   };
   const objects=[];
   for(let a=0x1004fc;a<=0x10535c;a+=0xb0){
    const routine=long(a);
    if(routine&&routine!==0x567a&&linked(a))objects.push(object(a));
   }
   const players=engine.x.actors.slice(0,5).map((a,i)=>({
    slot:i+1,participating:!!engine.players[i]?.participating,
    departed:!!engine.players[i]?.departed,
    state:String(engine.players[i]?.state||'').slice(0,24),
    lives:engine.players[i]?.lives??0,...object(a)
   }));
   samples.push({at,frame:engine.frame,mission:byte(0x10040c),substage:byte(0x10040d),
    director:long(0x10039c),activeMask:byte(0x10ed86),playerCount:engine.playerCount,players,objects});
   if(samples.length>30)samples.shift();error=null;
  }catch{error='native-state-unavailable';}
 }
 return {capture,report:()=>({schema:1,intervalMs:2000,limit:30,error,samples:structuredClone(samples)})};
}
