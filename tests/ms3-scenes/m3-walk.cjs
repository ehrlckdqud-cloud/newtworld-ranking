const fs=require('fs'),{createCanvas}=require('@napi-rs/canvas');
(async()=>{const h=await require('./harness.cjs').create(4),{e}=h,c=createCanvas(304*4,250*4),ctx=c.getContext('2d'),rows=[];
 h.scene(2,2);
 for(let f=0;f<9600;f++){
  for(let i=0;i<4;i++)e.ww(e.x.actors[i]+0x84,120);
  e.step([0,1,2,3,4].map(i=>i<4?8|(f%6<3?16:0)|(f%90<4?32:0):0));
  if(f%600===599){const j=Math.floor(f/600);ctx.drawImage(h.image(),j%4*304,Math.floor(j/4)*250);ctx.fillStyle='white';ctx.fillText('frame '+f+' x '+e.word(0x100524),j%4*304+5,Math.floor(j/4)*250+240);const row={f,sub:e.byte(0x10040d),players:e.state().players,objects:[]};for(let a=0x10044c;a<0x10540c;a+=0xb0)if(e.linked(a)&&e.long(a)!==0x567a)row.objects.push({a,r:e.long(a),x:e.word(a+0x3c),y:e.word(a+0x40)});rows.push(row);}
 }
 fs.writeFileSync('evidence/m3-walk.png',c.toBuffer('image/png'));fs.writeFileSync('evidence/m3-walk.json',JSON.stringify(rows));const s=h.save();fs.writeFileSync('evidence/m3-walk-state.bin',s.data);fs.writeFileSync('evidence/m3-walk-host.json',JSON.stringify(s.host));h.m._nw_close();
})().catch(e=>{console.error(e);process.exitCode=1});
