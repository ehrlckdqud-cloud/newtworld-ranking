// Space escape uses only bundled scores. Other games' IndexedDB playlists are untouched.
export class SpaceMusicUI{
 constructor(_running,toast){this.toast=toast;this.blocked=false;this.listeners=new Set;let saved={};try{saved=JSON.parse(localStorage.getItem('nw-space-music-v17')||'{}');}catch{}this.config={enabled:saved.enabled!==false,volume:Math.max(0,Math.min(1,saved.volume??.65))};this.music=this;this.players={};this.urls=[];const power=document.getElementById('musicPower'),volume=document.getElementById('musicVolume');power.onclick=()=>{this.config.enabled=this.blocked||!this.config.enabled;this.blocked=false;this.persist();this.notify();};volume.value=String(Math.round(this.config.volume*100));volume.oninput=()=>{this.config.volume=Number(volume.value)/100;this.persist();this.notify();};this.paint();}
 get isEnabled(){return this.config.enabled;}
 persist(){try{localStorage.setItem('nw-space-music-v17',JSON.stringify(this.config));}catch{}}
 paint(){const p=document.getElementById('musicPower');p.textContent=this.isEnabled&&!this.blocked?'♫ 음악 끄기':'♫ 음악 켜기';p.setAttribute?.('aria-pressed',String(this.isEnabled&&!this.blocked));}
 notify(){this.paint();for(const fn of this.listeners)fn();}
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 setLocked(){}
 effectVolume(player,value){player.volume=Math.max(0,Math.min(1,value));}
 duck(){}
 armForRound(){this.capture?.context.resume();}
 startRound(){}
 waiting(){}
 pauseGame(){}
 suspend(){for(const p of Object.values(this.players))p.pause();}
 async prepareRecordingAudio(...extra){if(!this.capture){const context=new AudioContext,destination=context.createMediaStreamDestination();this.capture={context,destination,sources:new Map};}const {context,destination,sources}=this.capture;await context.resume();for(const p of new Set([...Object.values(this.players),...extra])){if(!p||sources.has(p))continue;const source=context.createMediaElementSource(p);source.connect(destination);source.connect(context.destination);sources.set(p,source);}return destination.stream;}
 destroy(){this.suspend();for(const source of this.capture?.sources.values()||[])source.disconnect();this.capture?.context.close();this.listeners.clear();}
}
