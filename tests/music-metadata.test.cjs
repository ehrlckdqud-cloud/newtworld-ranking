const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={TextDecoder,Blob,Uint8Array};vm.createContext(ctx);vm.runInContext(fs.readFileSync('assets/music/music-metadata.js','utf8'),ctx);
const ss=n=>Buffer.from([(n>>21)&127,(n>>14)&127,(n>>7)&127,n&127]);
function frame(id,data,v){const head=Buffer.alloc(v===2?6:10);head.write(id);if(v===2)head.writeUIntBE(data.length,3,3);else if(v===4)ss(data.length).copy(head,4);else head.writeUInt32BE(data.length,4);return Buffer.concat([head,data]);}
function tag(frames,v){const body=Buffer.concat(frames),head=Buffer.from([73,68,51,v,0,0,...ss(body.length)]);return Buffer.concat([head,body]);}
const utf8=s=>Buffer.concat([Buffer.from([3]),Buffer.from(s)]),utf16=s=>Buffer.concat([Buffer.from([1,255,254]),Buffer.from(s,'utf16le')]);
const jpeg=Buffer.from([255,216,255,217]);
for(const v of [2,3,4]){
 const title=v===3?utf16('뉴트월드 2편'):utf8('뉴트월드 2편');
 const pic=v===2?Buffer.concat([Buffer.from([0]),Buffer.from('JPG'),Buffer.from([3,0]),jpeg]):Buffer.concat([Buffer.from([1]),Buffer.from('image/jpeg\0'),Buffer.from([3,255,254]),Buffer.from('커버','utf16le'),Buffer.from([0,0]),jpeg]);
 const raw=tag([frame(v===2?'TT2':'TIT2',title,v),frame(v===2?'TP1':'TPE1',utf8('Selly(lse)'),v),frame(v===2?'ULT':'USLT',Buffer.concat([Buffer.from([3]),Buffer.from('kor\0첫째 줄\n둘째 줄')]),v),frame(v===2?'PIC':'APIC',pic,v)],v);
 const meta=ctx.NWMusicMetadata.parse(raw,'fallback.mp3');assert.equal(meta.title,'뉴트월드 2편');assert.equal(meta.artist,'Selly(lse)');assert.equal(meta.lyrics,'첫째 줄\n둘째 줄');assert.equal(meta.cover.size,4);assert.equal(meta.cover.type,'image/jpeg');
}
const plain=ctx.NWMusicMetadata.parse(Buffer.from([255,251,0,0]),'태그 없는 노래.mp3');assert.equal(plain.title,'태그 없는 노래');assert.equal(plain.artist,'');assert.equal(plain.cover,null);
const broken=ctx.NWMusicMetadata.parse(tag([Buffer.from('TIT2\x7f\x7f\x7f\x7f\0\0')],4),'broken.mp3');assert.equal(broken.title,'broken');
console.log('ID3v2.2/2.3/2.4, Korean UTF-8/UTF-16, lyrics, covers and malformed tags passed.');
