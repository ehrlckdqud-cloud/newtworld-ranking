const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
fs.mkdirSync(path.join(__dirname,'evidence'),{recursive:true});process.chdir(__dirname);
if(!process.env.MS3_CORE_JS||!process.env.MS3_ROM_ZIP)throw Error('Set MS3_CORE_JS and MS3_ROM_ZIP to authorized local assets');
function load(file){const m=new Module(file,module);m.filename=file;m.paths=module.paths;m._compile(fs.readFileSync(file,'utf8'),file);return m.exports;}
exports.create=async function(count=4){
 global.JSZip=load(root+'/coop/jszip.js');load(root+'/coop/engine.js');
 const m=await load(process.env.MS3_CORE_JS)({print:()=>{},printErr:()=>{}});
 const profile=JSON.parse(fs.readFileSync(root+'/coop/native/profile.json'));
 await(await import(root+'/coop/native/prepare-coop.mjs')).prepareCoopROM(m,fs.readFileSync(process.env.MS3_ROM_ZIP),profile);
 if(exports.patch)await exports.patch(m);
 assert(m._nw_load());
 const {FiveSession}=await import(root+'/coop/native/five-session.mjs');
 const e=new FiveSession(m,profile,{sharedSelection:true,playerCount:count,characters:Array.from({length:count},(_,i)=>i%4)});
 const zero=[0,0,0,0,0];let video;
 m.onVideo=(ptr,w,h,pitch)=>{video={ptr,w,h,pitch};};
 for(let f=0;f<3100;f++){if(f===1100)e.coin();if(f===1620)e.start();e.step(f>=1680&&f<1686?[16,0,0,0,0]:zero);}
 for(let i=0;i<count;i++){const input=zero.slice();input[i]=16;e.step(input);e.step(zero);}
 for(let f=0;f<1500&&e.phase!=='playing';f++)e.step(zero);
 assert.equal(e.phase,'playing');for(let f=0;f<180;f++)e.step(zero);
 function save(){const n=m._nw_snapshot();return {data:m.HEAPU8.slice(m._nw_snapshot_ptr(),m._nw_snapshot_ptr()+n),host:e.checkpoint()};}
 function restore(s){m.HEAPU8.set(s.data,m._nw_snapshot_buffer(s.data.length));assert(m._nw_restore());e.restore(s.host);}
 function scene(mission,substage){e.wb(0x10ed7a,mission);e.wb(0x10ed7b,substage);e.wl(0x10039c,0xed0f6);}
 function image(){const {createCanvas}=require('@napi-rs/canvas');const {ptr,w,h,pitch}=video,c=createCanvas(w,h),ctx=c.getContext('2d'),im=ctx.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=ptr+y*pitch+x*4,d=(y*w+x)*4;im.data[d]=m.HEAPU8[a+2];im.data[d+1]=m.HEAPU8[a+1];im.data[d+2]=m.HEAPU8[a];im.data[d+3]=255;}ctx.putImageData(im,0,0);return c;}
 return {m,e,profile,zero,save,restore,scene,image};
};
