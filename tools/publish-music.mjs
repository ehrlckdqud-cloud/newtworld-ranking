import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const config=await readFile('site-config.js','utf8');
const app=config.match(/appScriptUrl\s*:\s*['"](https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec)['"]/)?.[1];
if(!app)throw Error('Expected public Apps Script endpoint');
async function api(action,id){
 let lastError;
 for(let attempt=0;attempt<3;attempt++){
 try{return await requestApi(action,id);}catch(e){lastError=e;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));}
 }
 throw lastError;
}
async function requestApi(action,id){
 const url=new URL(app);url.searchParams.set('action',action);url.searchParams.set('callback','nwPublish');if(id)url.searchParams.set('id',id);
 url.searchParams.set('_',String(Date.now()));
 const response=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('Music API HTTP '+response.status);
 const text=(await response.text()).trim();
 let data;try{data=JSON.parse(text.startsWith('nwPublish(')?text.replace(/^nwPublish\(/,'').replace(/\);?$/,''):text);}catch{throw Error('Invalid music API response: '+action);}
 if(!data.ok)throw Error('Music API failed: '+action+' '+(data.error||data.code||'unknown error'));return data;
}
const dir='assets/music/published',manifestPath=dir+'/manifest.json';await mkdir(dir,{recursive:true});
let previous={tracks:{}};try{previous=JSON.parse(await readFile(manifestPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const library=await api('musicLibraryGet');if(!Array.isArray(library.tracks)||library.tracks.length>200)throw Error('Invalid music library');
const tracks={};
for(const track of library.tracks){
 if(!track.audioFile&&!track.coverFile)continue;
 if(!/^(?:music-[a-zA-Z0-9-]{16,80}|builtin-[1-6])$/.test(track.id))throw Error('Invalid media record');
 const entry={};
 for(const kind of ['audio','cover']){
  const file=track[kind+'File'];if(!file)continue;if(typeof file!=='string')throw Error('Invalid file version');
  const version=createHash('sha256').update(file).digest('hex').slice(0,16);
  const old=previous.tracks[track.id];
  const prefix=dir+'/'+track.id+'-'+version;
  let path=kind==='audio'?prefix+'.mp3':old?.coverFile===file&&/^assets\/music\/published\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(old.cover||'')?old.cover:'';
  let exists=false;if(path)try{exists=(await stat(path)).size>0;}catch{}
  if(!exists){
   const data=await api(kind==='audio'?'musicAudio':'musicCover',track.id);
   const limit=kind==='audio'?11200000:700000;
   if(typeof data.base64!=='string'||data.base64.length>limit||!/^[A-Za-z0-9+/]*={0,2}$/.test(data.base64))throw Error('Invalid media payload');
   const bytes=Buffer.from(data.base64,'base64');
   if(kind==='audio'){
    if(bytes.length<4||bytes.length>8*1024*1024||!(bytes.subarray(0,3).toString()==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224)))throw Error('Invalid MP3 bytes');
   }else{
    if(bytes.length<12||bytes.length>500000)throw Error('Invalid cover size');
    const ext=bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'jpg':bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'?'webp':null;
    if(!ext)throw Error('Unsupported cover bytes');path=prefix+'.'+ext;
   }
   await writeFile(path,bytes);console.log('Published '+kind+':',track.id,bytes.length);
  }
  entry[kind+'File']=file;entry[kind]=path;
 }
 tracks[track.id]=entry;
}

const manifest={version:1,tracks};const json=JSON.stringify(manifest,null,2)+'\n';
let oldText='';try{oldText=await readFile(manifestPath,'utf8');}catch{}
if(json!==oldText)await writeFile(manifestPath,json);
console.log('Direct MP3 entries:',Object.keys(tracks).length);
