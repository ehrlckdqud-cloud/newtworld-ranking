const assert=require('assert/strict'),fs=require('fs'),harness=require('./harness.cjs');
harness.patch=async m=>{

 const bp='/system/fbneo/patched/neogeo.zip',bz=await JSZip.loadAsync(m.FS.readFile(bp));
 const setups=Array.from({length:5},(_,i)=>'33f9'+(0x104dc0+i*4).toString(16).padStart(8,'0')+( [0x1004fc,0x1005ac,0x1051fc,0x104fec,0x104ddc][i]+0x3c).toString(16).padStart(8,'0')+'33f9'+(0x104dc2+i*4).toString(16).padStart(8,'0')+([0x1004fc,0x1005ac,0x1051fc,0x104fec,0x104ddc][i]+0x40).toString(16).padStart(8,'0')).join('');
 const code=Buffer.from(setups+'2f0e2c7900104db0207c000f87de4eb90002c65a40c033c000104db423c800104db62c5f2cb900104dba4e75','hex');
 for(const name of ['sp-s2.sp1','sp-s3.sp1']){const b=await bz.file(name).async('uint8array'),sum=b.reduce((a,v)=>a+v,0);for(let i=0;i<code.length;i++)b[(0x1e000+i)^1]=code[i];b[0x1e200^1]=0x4e;b[0x1e201^1]=0x75;b[0x10fff]=(b[0x10fff]+sum-b.reduce((a,v)=>a+v,0))&255;bz.file(name,b);}
 m.FS.writeFile(bp,await bz.generateAsync({type:'uint8array',compression:'STORE'}));
};
(async()=>{const h=await harness.create(5),{e}=h,base=h.save(),rows=[];
 let lift; // Isolated native caller rectangle fixture, not a game shortcut.
 for(let inside=-1;inside<5;inside++){
  h.restore(base);lift=e.long(0x10540c);e.removeFree(lift);e.clear(lift,0xb0);e.ww(lift+0x3c,160);e.ww(lift+0x40,320);
  for(let i=0;i<5;i++){if(i)e.wl(e.x.actors[i],0xc1e200);e.ww(0x104dc0+i*4,i===inside?160:20);e.ww(0x104dc2+i*4,i===inside?300:420);}
  e.wl(0x104db0,lift);e.wl(0x104dba,e.long(e.x.actors[0]));e.wl(e.x.actors[0],0xc1e000);
  for(let f=0;f<3;f++)e.step(h.zero);rows.push({inside,lift,p3:[e.word(e.x.actors[2]+0x3c),e.word(e.x.actors[2]+0x40),e.long(e.x.actors[2])],mask:e.byte(0x10ed86),carry:e.word(0x104db4)&1,selected:e.long(0x104db6)});
 }
 for(const row of rows){assert.equal(row.carry,row.inside<0?1:0);if(row.inside>=0)assert.equal(row.selected,e.x.actors[row.inside]);}console.log(rows);fs.writeFileSync('evidence/m3-geometry-'+'fixed'+'.json',JSON.stringify(rows));h.m._nw_close();
})().catch(e=>{console.error(e);process.exitCode=1});
