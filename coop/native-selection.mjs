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

/** Native 0x43606/0x43640 top-screen CONTINUE? tiles, captured with _nw_cell.
 * ROM text 0x42eca uses font A / palette 4; digit table 0x42ede uses 0xa60+n.
 * Keep the original two-row lettering and palette, fit into each 60px player HUD.
 */
export function drawFiveContinue(ctx,module,engine,colors){
 if(engine?.phase!=='playing'||engine.nativeContinue)return;
 const tile=(id,palette,x,y,scale=1)=>{
  const ptr=module._nw_glyph(id,palette),src=module.HEAPU8;
  for(let yy=0;yy<8;yy++)for(let xx=0;xx<8;xx++){
   const at=ptr+(yy*8+xx)*4;if(!src[at+3])continue;
   ctx.fillStyle=`rgb(${src[at+2]},${src[at+1]},${src[at]})`;
   const left=Math.round(x+xx*scale),top=Math.round(y+yy*scale);
   ctx.fillRect(left,top,Math.round(x+(xx+1)*scale)-left,Math.round(y+(yy+1)*scale)-top);
  }
 };
 const text=(s,x,y)=>{for(const [i,ch]of [...s].entries())tile(0x300+ch.charCodeAt(0),1,x+i*5,y,5/8);};
 ctx.save();
 for(let i=0;i<(engine.playerCount??5);i++){
  const p=engine.players[i];if(!['continue','selecting'].includes(p.state))continue;
  const x=i*60+1; text(`${i+1}UP`,x+21,0);
  if(p.state==='continue'){
   const seconds=Math.max(0,Math.min(9,Math.ceil((p.deadline-engine.frame)/module._nw_fps())-1));
   const row=[0xa83,0xa8f,0xa8e,0xaa4,0xa89,0xa8e,0xaa5,0xa85,0xa6f,null,0xa60+seconds],scale=58/88;
   for(const [j,id]of row.entries())if(id!==null){tile(id,4,x+j*8*scale,9,scale);tile(id+0x10,4,x+j*8*scale,9+8*scale,scale);}
  }else{
   text(['MARCO','TARMA','ERI','FIO'][p.character],x+14,10);
   text('A/D SELECT',x+4,19);text('J OK',x+19,27);
  }
 }
 ctx.restore();
}
