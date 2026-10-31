// Explicit allowlist: no credentials, member names, chat, SDP or wallet values.
const fields=new Set(['frame','slot','hostSlot','epoch','phase','synced','playing','hidden','queue','pending','buffered','state','ice','duration','gap','status','code','route','action','frames','reason']);
export function createDiagnostics({now=()=>Date.now(),storage=null}={}){
 const key='nwCoopDiagnosticsV82';let events=[],samples=[],lastSave=0;const lastEvent=new Map();
 try{const saved=JSON.parse(storage?.getItem(key)||'null');if([82,86].includes(saved?.version)){events=(saved.events||[]).slice(-500);samples=(saved.samples||[]).slice(-120);}}catch{}
 const clean=data=>Object.fromEntries(Object.entries(data||{}).filter(([k,v])=>fields.has(k)&&(['number','boolean'].includes(typeof v)||typeof v==='string'&&v.length<=100)));
 const record=(type,data={})=>{if(['render-gap','input-wait','core-slow','peer-state','input-missing'].includes(type)){const id=type+':'+(data.slot||0),at=now();if(at-(lastEvent.get(id)||0)<1000)return;lastEvent.set(id,at);}events.push({at:now(),type:String(type).slice(0,40),...clean(data)});if(events.length>500)events.shift();};
 const report=()=>({version:86,exportedAt:new Date(now()).toISOString(),events:events.slice(),samples:samples.slice()});
 return {record,report,sample(data){samples.push({at:now(),...clean(data)});if(samples.length>600)samples.shift();},save(force=false){if(!force&&now()-lastSave<10000)return;lastSave=now();try{storage?.setItem(key,JSON.stringify(report()));}catch{}},download(){const blob=new Blob([JSON.stringify(report(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='newtworld-v86-diagnostics-'+new Date(now()).toISOString().replaceAll(':','-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}};
}
