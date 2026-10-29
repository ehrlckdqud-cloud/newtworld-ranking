/** Draws original ROM glyphs; state is read from each player's native records. */
export function makeHUD(module,engine,ctx){
 const panels=Array.from({length:5},()=>{const h=document.createElement('canvas');h.width=64;h.height=42;return {h,c:h.getContext('2d')};});let h,c;const cache=new Map();
 const weapon=[0x10eaf0,0x10eafe,0x10538c,0x10517c,0x104f6c],vehicle=[0x10ec14,0x10ec40,0x1053a2,0x105192,0x104f82],score=[0x10ed18,0x10ed20,0x10535c,0x10514c,0x104f3c];
 function tile(x,y,t,p){const key=t+':'+p;let im=cache.get(key);if(!im){const ptr=module._nw_glyph(t,p);im=c.createImageData(8,8);for(let j=0;j<256;j+=4){im.data[j]=module.HEAPU8[ptr+j+2];im.data[j+1]=module.HEAPU8[ptr+j+1];im.data[j+2]=module.HEAPU8[ptr+j];im.data[j+3]=module.HEAPU8[ptr+j+3];}cache.set(key,im);}c.putImageData(im,x,y);}
 function label(x,y,s,p){[...String(s)].forEach((v,i)=>tile(x+i*8,y,0x300+v.charCodeAt(0),p));}
 return ()=>{if(![0xed54c,0xed652,0xed682].includes(engine.long(0x10039c)))return;
  for(let i=0;i<(engine.playerCount??5);i++){if(['continue','selecting'].includes(engine.players[i].state))continue;({h,c}=panels[i]);c.clearRect(0,0,64,42);const p=engine.players[i],v=vehicle[i],mounted=p.state==='active'&&engine.word(v)!==0,a=weapon[i],value=engine.long(score[i]).toString(16);label(Math.max(0,64-value.length*8),0,value,0);
   [0xba0,0xba1,0xba2,0xba3,0xbbc,0xbbd,0xbbe,0xbbf].forEach((t,j)=>tile(j*8,8,t,13));tile(0,16,0xbb0,13);tile(56,16,0xbb7,13);for(let j=0;j<8;j++)tile(j*8,24,0xbc0+j,13);
   const ammo=mounted?engine.word(v+0x20):engine.word(a+10),bombs=mounted&&engine.byte(v+0x29)===1?engine.byte(v+0x25):engine.byte(a+5);if(ammo===65535)for(let j=0;j<3;j++)tile(8+j*8,16,0x39d+j,2);else label(8,16,String(ammo).slice(-4),2);label(40,16,String(bombs).slice(-2),2);
   const max=[0,48,0,48,48,48,0,0,48,48,48,48,0][engine.byte(v+0x27)]||0,gauge=mounted&&max>0,energy=Math.min(max,engine.word(v+0x1c));if(gauge){const pal=energy<max/2&&engine.frame%16>=12?14:13;tile(0,26,0xba5,pal);for(let j=0;j<6;j++)tile(8+j*8,26,0xba6+Math.max(0,Math.min(8,Math.ceil(energy*48/max)-j*8)),pal);tile(56,26,0xbaf,pal);}
   label(8,gauge?34:26,`${i+1}UP=${Math.max(0,p.lives-(p.state==='active'?1:0))}`,1);ctx.imageSmoothingEnabled=false;ctx.drawImage(h,0,0,64,gauge?42:34,i*60,0,60,gauge?42:34);
  }
 };
}
