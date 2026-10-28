/** Five compact result panels, using native ROM glyphs and native score records.
 * A clean end-of-mission frame keeps the original level/pose behind the panels;
 * result accounting, bonuses, sound and transition timing remain native.
 */
export function makeResults(module,engine,ctx,createSurface=()=>document.createElement('canvas')){
 const rescue=[0x10ed04,0x10ed0c,0x1053d8,0x1051c8,0x104fb8],score=[0x10ed18,0x10ed20,0x10535c,0x10514c,0x104f3c];
 const colors=['#ff6464','#65afff','#68dc83','#ffc45e','#c892ff'],cache=new Map();
 let background=null,counts=[],before=[],activeMask=0,wasResults=false;
 const bcd=v=>Number(v.toString(16));
 function text(s,x,y,size=6,pal=1){for(const [i,ch]of [...String(s)].entries()){const tile=0x300+ch.charCodeAt(0),key=tile+':'+pal;let surface=cache.get(key);if(!surface){surface=createSurface();surface.width=surface.height=8;const c=surface.getContext('2d'),im=c.createImageData(8,8),ptr=module._nw_glyph(tile,pal);for(let n=0;n<256;n+=4){im.data[n]=module.HEAPU8[ptr+n+2];im.data[n+1]=module.HEAPU8[ptr+n+1];im.data[n+2]=module.HEAPU8[ptr+n];im.data[n+3]=module.HEAPU8[ptr+n+3];}c.putImageData(im,0,0);cache.set(key,surface);}ctx.drawImage(surface,x+i*size,y,size,size);}}
 return function draw(paintHUD){
  const controller=engine.long(0x10039c);
  if(controller===0xed652){background=ctx.getImageData(0,0,304,224);activeMask=engine.byte(0x10ed86);counts=rescue.map((a,i)=>activeMask&(1<<i)?engine.word(a):0);before=score.map(a=>bcd(engine.long(a)));wasResults=false;return false;}
  if(controller!==0xed682){if(wasResults){background=null;wasResults=false;}return false;}
  if(!background)return false;
  wasResults=true;ctx.putImageData(background,0,0);paintHUD?.();ctx.save();ctx.imageSmoothingEnabled=false;
  text('RECAPTURED PRISONER',98,35,6,1);
  for(let i=0;i<(engine.playerCount??5);i++){
   const x=i<3?4+i*100:54+(i-3)*100,y=i<3?46:133,w=96,h=80;
   ctx.fillStyle='rgba(16,13,24,.86)';ctx.fillRect(x,y,w,h);
   ctx.strokeStyle='#3151bd';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,w-2,h-2);
   ctx.strokeStyle='#faf5cf';ctx.lineWidth=1;ctx.strokeRect(x+3.5,y+3.5,w-7,h-7);
   text(`${i+1}P`,x+39,y+7,8,1);ctx.fillStyle=colors[i];ctx.fillRect(x+8,y+18,w-16,1);
   if(!(activeMask&(1<<i))){text('OUT',x+39,y+40,6,0);continue;}
   const remaining=Math.min(counts[i],Math.max(0,engine.word(rescue[i]))),counted=counts[i]-remaining,earned=Math.max(0,bcd(engine.long(score[i]))-before[i]);
   text('POW',x+9,y+25,6,0);text(String(counted).padStart(2,'0'),x+66,y+23,8,1);
   text('POINTS',x+9,y+40,6,0);const points=String(Math.max(counted*10000,earned));text(points,x+w-9-points.length*6,y+50,6,1);
   const bonus=Math.max(0,earned-counts[i]*10000);if(bonus)text('GREAT!',x+30,y+65,6,1);else if(remaining===0)text('COMPLETE',x+24,y+65,6,0);
  }
  ctx.restore();return true;
 };
}
