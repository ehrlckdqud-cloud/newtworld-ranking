(function(root){
'use strict';
const BASE='https://ehrlckdqud-cloud.github.io/newtworld-ranking/';
function merge(base,remote,manifest,sync={}){
 const map=new Map(base.map(t=>[t.id,{...t}]));
 for(const t of remote.tracks||[])map.set(t.id,{...map.get(t.id),...t});
 const deleted=new Set(remote.state?.deleted||[]);
 return [...new Set([...(remote.state?.order||[]),...map.keys()])].filter(id=>map.has(id)&&!deleted.has(id)).map(id=>{
  const t=map.get(id),pub=manifest.tracks?.[id];
  if(t.audioFile)t.audio=pub?.audioFile===t.audioFile?pub.audio:null;
  if(t.coverFile)t.cover=pub?.coverFile===t.coverFile?pub.cover:null;
  if(!t.audio)return null;
  const audio=new URL(t.audio,BASE);if(audio.protocol!=='https:'||audio.origin!==new URL(BASE).origin)return null;
  const cover=t.cover?new URL(t.cover,BASE).href:'';
  const times=sync[id];return {...t,audio:audio.href,cover,syncedLyrics:(t.syncedLyrics||[]).map((l,i)=>({...l,time:Number.isFinite(Number(times?.[i]))?Number(times[i]):Number(l.time)||0}))};
 }).filter(Boolean);
}
if(typeof module==='object')module.exports={merge};
else{
 function script(url){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=reject;document.head.append(s)});}
 function read(action){return new Promise((resolve,reject)=>{
  const cb='nwNative_'+Math.random().toString(36).slice(2),s=document.createElement('script');let timer;
  const finish=(value,error)=>{clearTimeout(timer);s.remove();delete window[cb];error?reject(error):resolve(value)};
  window[cb]=d=>d?.ok?finish(d):finish(null,Error('곡 서버 응답 오류'));s.onerror=()=>finish(null,Error('곡 서버 연결 실패'));
  timer=setTimeout(()=>finish(null,Error('곡 서버 응답 지연')),15000);
  s.src=window.NW_CONFIG.appScriptUrl+'?'+new URLSearchParams({action,callback:cb});document.head.append(s);
 });}
 root.NWCatalog={async load(){
  await Promise.all([script(BASE+'site-config.js'),script(BASE+'assets/music/tracks.js')]);
  const [remote,manifest,sync]=await Promise.all([read('musicLibraryGet'),fetch(BASE+'assets/music/published/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('음원 목록 오류');return r.json()}),read('syncGet').catch(()=>({sync:{}}))]);
  return merge(window.NW_TRACKS||[],remote,manifest,sync.sync);
 }};
}
})(typeof window==='object'?window:globalThis);
