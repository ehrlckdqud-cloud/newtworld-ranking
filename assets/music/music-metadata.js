/* Bounded ID3v2.2/2.3/2.4 reader; metadata remains editable before publishing. */
(function(root){
 'use strict';
 const ascii=b=>String.fromCharCode(...b),safe=n=>Number.isFinite(n)&&n>=0;
 function sync(b,p){return ((b[p]&127)*2097152)+((b[p+1]&127)<<14)+((b[p+2]&127)<<7)+(b[p+3]&127);}
 function u32(b,p){return b[p]*16777216+(b[p+1]<<16)+(b[p+2]<<8)+b[p+3];}
 function decode(b,enc){try{return new TextDecoder(enc===0?'iso-8859-1':enc===1?'utf-16':enc===2?'utf-16be':'utf-8').decode(b).replace(/^\uFEFF/,'').replace(/\0+$/,'').trim();}catch(_){return '';}}
 function afterTerm(b,p,enc){const step=enc===1||enc===2?2:1;for(;p+step<=b.length;p+=step)if(b[p]===0&&(step===1||b[p+1]===0))return p+step;return b.length;}
 function unsync(b){const out=[];for(let i=0;i<b.length;i++){out.push(b[i]);if(b[i]===255&&b[i+1]===0)i++;}return Uint8Array.from(out);}
 function parse(buffer,name='track.mp3'){
  const bytes=new Uint8Array(buffer),result={title:name.replace(/\.mp3$/i,''),artist:'',lyrics:'',cover:null};
  if(bytes.length<10||ascii(bytes.subarray(0,3))!=='ID3')return result;
  const version=bytes[3];if(![2,3,4].includes(version))return result;
  let data=bytes.subarray(10,Math.min(bytes.length,10+sync(bytes,6))),p=0;
  if((bytes[5]&128)&&version<4)data=unsync(data);
  if(version===2&&(bytes[5]&64))return result; // compressed tag
  if(bytes[5]&64){if(data.length<4)return result;p=version===3?4+u32(data,0):sync(data,0);}
  let frontCover=false;
  while(p+(version===2?6:10)<=data.length){
   const head=version===2?6:10,id=ascii(data.subarray(p,p+(version===2?3:4)));
   if(!/^[A-Z0-9]{3,4}$/.test(id))break;
   const size=version===2?(data[p+3]<<16)+(data[p+4]<<8)+data[p+5]:version===4?sync(data,p+4):u32(data,p+4);
   if(!safe(size)||!size||p+head+size>data.length)break;
   const flags=version===2?0:data[p+9];let body=data.subarray(p+head,p+head+size);p+=head+size;
   if((version===3&&(flags&192))||(version===4&&(flags&12)))continue; // encrypted/compressed frames
   if(version===4&&((flags&2)||(bytes[5]&128)))body=unsync(body);
   if((version===3&&(flags&32))||(version===4&&(flags&64)))body=body.subarray(1);
   if(version===4&&(flags&1))body=body.subarray(4);
   if(!body.length)continue;
   const enc=body[0];
   if(['TIT2','TT2','TPE1','TP1'].includes(id)){
    const value=decode(body.subarray(1),enc).replace(/\0/g,' / ');if(value)result[id==='TIT2'||id==='TT2'?'title':'artist']=value;
   }else if((id==='USLT'||id==='ULT')&&body.length>4){
    const start=afterTerm(body,4,enc);const value=decode(body.subarray(start),enc);if(value)result.lyrics=value;
   }else if(id==='APIC'||id==='PIC'){
    let q=1,mime='';
    if(id==='PIC'){mime=ascii(body.subarray(1,4)).toUpperCase()==='PNG'?'image/png':'image/jpeg';q=4;}
    else{const end=afterTerm(body,1,0);mime=ascii(body.subarray(1,end-1)).toLowerCase();q=end;}
    const type=body[q++];q=afterTerm(body,q,enc);const image=body.subarray(q);
    if(['image/jpeg','image/jpg','image/png','image/webp'].includes(mime)&&image.length&&image.length<=8*1024*1024&&(!result.cover||(!frontCover&&type===3))){result.cover=new Blob([image],{type:mime==='image/jpg'?'image/jpeg':mime});frontCover=type===3;}
   }
  }
  return result;
 }
 root.NWMusicMetadata={parse};
})(typeof window==='undefined'?globalThis:window);
