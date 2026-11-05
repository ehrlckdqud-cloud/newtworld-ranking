import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const config=await readFile('site-config.js','utf8');
const app=config.match(/appScriptUrl\s*:\s*['"](https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec)['"]/)?.[1];
if(!app)throw Error('Expected public Apps Script endpoint');
async function api(action,id){
 const url=new URL(app);url.searchParams.set('action',action);url.searchParams.set('callback','nwPublish');if(id)url.searchParams.set('id',id);
 const response=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('Music API HTTP '+response.status);
 const text=(await response.text()).trim();
 let data;try{data=JSON.parse(text.startsWith('nwPublish(')?text.replace(/^nwPublish\(/,'').replace(/\);?$/,''):text);}catch{throw Error('Invalid music API response: '+action);}
 if(!data.ok)throw Error('Music API failed: '+action);return data;
}
const dir='assets/music/published',manifestPath=dir+'/manifest.json';await mkdir(dir,{recursive:true});
let previous={tracks:{}};try{previous=JSON.parse(await readFile(manifestPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const library=await api('musicLibraryGet');if(!Array.isArray(library.tracks)||library.tracks.length>200)throw Error('Invalid music library');
const tracks={};
for(const track of library.tracks){
 if(!track.audioFile)continue;
 if(!/^music-[a-zA-Z0-9-]{16,80}$/.test(track.id)||typeof track.audioFile!=='string')throw Error('Invalid audio record');
 const version=createHash('sha256').update(track.audioFile).digest('hex').slice(0,16);
 const path=dir+'/'+track.id+'-'+version+'.mp3';
 const old=previous.tracks[track.id];let exists=false;try{exists=(await stat(path)).size>0;}catch{}
 if(!exists){
  const data=await api('musicAudio',track.id);
  if(typeof data.base64!=='string'||data.base64.length>11200000||!/^[A-Za-z0-9+/]*={0,2}$/.test(data.base64))throw Error('Invalid MP3 payload');
  const bytes=Buffer.from(data.base64,'base64');
  if(bytes.length<4||bytes.length>8*1024*1024||!(bytes.subarray(0,3).toString()==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224)))throw Error('Invalid MP3 bytes');
  await writeFile(path,bytes);console.log('Published MP3:',track.id,bytes.length);
 }
 tracks[track.id]={audioFile:track.audioFile,audio:path};
}
const manifest={version:1,tracks};const json=JSON.stringify(manifest,null,2)+'\n';
let oldText='';try{oldText=await readFile(manifestPath,'utf8');}catch{}
if(json!==oldText)await writeFile(manifestPath,json);
console.log('Direct MP3 entries:',Object.keys(tracks).length);
