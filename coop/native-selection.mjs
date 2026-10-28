/** Original portrait/door scene stays native. Only five colored native-font cursors are composited. */
export function drawFiveSelection(ctx,module,engine,colors){
 if(!engine?.selection||engine.phase!=='attract'||![0x432d4,0x433e6].includes(engine.long(0x10023c)))return;
 const groups=Array.from({length:4},()=>[]);engine.selection.forEach((p,i)=>{if(i<(engine.playerCount??5))groups[[0,2,1,3][p.character]].push(i);});
 ctx.fillStyle='#000';for(let k=0;k<4;k++)ctx.fillRect(34+k*68,47,35,19);
 for(let column=0;column<4;column++)for(let n=0;n<groups[column].length;n++){
  const i=groups[column][n],p=engine.selection[i],compact=groups[column].length>2,size=compact?6:8,x=36+column*68+(compact?n%2*16:0),y=48+(compact?Math.floor(n/2)*6:n*8);
  ctx.fillStyle=colors[i];
  for(const [j,t]of [0x350,0x331+i].entries()){const ptr=module._nw_glyph(t,1);for(let dy=0;dy<size;dy++)for(let dx=0;dx<size;dx++){const src=(Math.floor(dy*8/size)*8+Math.floor(dx*8/size))*4;if(module.HEAPU8[ptr+src+3])ctx.fillRect(x+j*size+dx,y+dy,1,1);}}
  if(p.confirmed)ctx.fillRect(x+size*2+1,y+2,compact?2:3,compact?2:3);
 }
}

/** Per-seat continue overlay in original ROM lettering. The ongoing game stays visible. */
export function drawFiveContinue(ctx,module,engine,colors){
 if(engine?.phase!=='playing'||engine.nativeContinue)return;
 const text=(s,x,y,size=5)=>{
  for(const [i,ch]of [...s].entries()){
   const ptr=module._nw_glyph(0x300+ch.charCodeAt(0),1);
   for(let dy=0;dy<size;dy++)for(let dx=0;dx<size;dx++){
    const a=ptr+(Math.floor(dy*8/size)*8+Math.floor(dx*8/size))*4;
    if(module.HEAPU8[a+3])ctx.fillRect(x+i*size+dx,y+dy,1,1);
   }
  }
 };
 ctx.save();
 for(let i=0;i<5;i++){
  const p=engine.players[i];if(!['continue','selecting'].includes(p.state))continue;
  const x=2+i*60,y=175;ctx.fillStyle='rgba(10,12,23,.92)';ctx.fillRect(x,y,58,47);
  ctx.strokeStyle=colors[i];ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,57,46);
  ctx.fillStyle=colors[i];text(`${i+1}P`,x+24,y+3);
  ctx.fillStyle='#fff4c3';
  if(p.state==='continue'){
   text('CONTINUE?',x+6,y+13);
   const seconds=Math.max(0,Math.min(9,Math.ceil((p.deadline-engine.frame)/module._nw_fps())-1));
   text(String(seconds),x+25,y+23,8);text('J START',x+11,y+37);
  }else{
   text(['MARCO','TARMA','ERI','FIO'][p.character],x+8,y+15);
   text('A/D SELECT',x+4,y+27);text('J OK',x+19,y+37);
  }
 }
 ctx.restore();
}
