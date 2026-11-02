const fs=require('fs'),{createCanvas}=require('@napi-rs/canvas'),harness=require('./harness.cjs');

(async()=>{const count=Number(process.env.COUNT||4);const h=await harness.create(Number(process.env.COUNT||4)),{e}=h,c=createCanvas(304*4,250*4),ctx=c.getContext('2d'),rows=[],trace=[];let savedScene=false;h.scene(4,2);
 for(let f=0;f<4500;f++){
  for(let i=0;i<count;i++)e.ww(e.x.actors[i]+0x84,120);
  if(f===1200){for(let a=0x10044c;a<0x10540c;a+=0xb0)if(e.linked(a)&&e.word(a+0x4e)>4000){e.ww(a+0x4e,0);e.wb(a+0x5b,e.byte(a+0x5b)|128);}}
  const bits=Array.from({length:5},(_,i)=>i>=count?0:8|(f%6<3?16:0)|(f%120<30?32:0));
  e.step(bits);
  if(f<4500){if(f===1300){const snap=h.save();fs.writeFileSync('evidence/m5-entry.bin',snap.data);fs.writeFileSync('evidence/m5-entry-host.json',JSON.stringify(snap.host));savedScene=true;}if(!savedScene){for(let a=0x10044c;a<0x10540c;a+=0xb0)if(e.linked(a)&&e.long(a)===0x66996){const snap=h.save();fs.writeFileSync('evidence/m5-entry.bin',snap.data);fs.writeFileSync('evidence/m5-entry-host.json',JSON.stringify(snap.host));savedScene=true;break;}}const proxies=[];for(let a=0x10044c;a<0x10540c;a+=0xb0)if(e.linked(a)&&e.long(a)>=0x66fb2&&e.long(a)<=0x671ce)proxies.push({a,r:e.long(a),owner:e.word(a+0x84),witness:e.byte(a+0x92)});if(proxies.length)trace.push({f,proxies});}
  if(e.byte(0x10040c)===85){console.log('CRASH',f);break;}
  if(f%1000===999){const j=Math.floor(f/1000);ctx.drawImage(h.image(),j%4*304,Math.floor(j/4)*250);ctx.fillStyle='white';ctx.fillText('f '+f+' sub '+e.byte(0x10040d),j%4*304+5,Math.floor(j/4)*250+240);const row={f,sub:e.byte(0x10040d),players:e.state().players,objects:[]};for(let a=0x10044c;a<0x10540c;a+=0xb0)if(e.linked(a)&&e.long(a)!==0x567a)row.objects.push({a,r:e.long(a),hp:e.word(a+0x4e),x:e.word(a+0x3c),y:e.word(a+0x40)});rows.push(row);console.log(f,row.sub,row.objects.filter(o=>o.hp>0&&o.hp<20000).map(o=>[o.a.toString(16),o.r.toString(16),o.hp]));}
 }
 fs.writeFileSync('evidence/m5-'+'fixed'+'-'+count+'p-trace.json',JSON.stringify(trace));fs.writeFileSync('evidence/m5-natural.png',c.toBuffer('image/png'));fs.writeFileSync('evidence/m5-natural.json',JSON.stringify(rows));const s=h.save();fs.writeFileSync('evidence/m5-natural.bin',s.data);fs.writeFileSync('evidence/m5-natural-host.json',JSON.stringify(s.host));h.m._nw_close();
})().catch(e=>{console.error(e);process.exitCode=1});
