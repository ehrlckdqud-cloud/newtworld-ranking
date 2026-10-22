// Original caption actors, VRAM zoom frames and palettes, with native
// M1/YM2610 announcements. No browser font or synthetic replacement voice.
const asset=name=>new URL('./space-assets/'+name,import.meta.url).href;
export class SpaceMission{
 constructor({AudioClass=Audio,ImageClass=Image,fetcher=(...args)=>fetch(...args)}={}){this.fetcher=fetcher;this.images={start:new ImageClass,complete:new ImageClass};this.players={start:new AudioClass(asset('mission-start-voice-v10.mp3')),complete:new AudioClass(asset('mission-complete-voice.mp3'))};this.recordingPlayers=Object.values(this.players);this.completionMusicUrl=asset('mission-complete-music.mp3');this.enabled=true;this.volume=.55;this.reset();}
 async load(){const response=await this.fetcher(asset('mission-frames.json'));if(!response.ok)throw Error('원본 미션 연출을 불러오지 못했어요.');this.data=await response.json();await Promise.all(Object.entries(this.images).map(async([name,im])=>{im.src=asset(this.data.clips[name].atlas);await im.decode();}));for(const p of this.recordingPlayers)p.preload='auto';return this;}
 reset(){for(const p of this.recordingPlayers){p.pause();p.currentTime=0;}this.mode=null;this.elapsed=0;this.finished=false;this.paused=false;}
 start(mode){this.reset();this.mode=mode;const p=this.players[mode];if(this.enabled){(this.audioVolume||((p,v)=>p.volume=v))(p,this.volume);p.play().catch(()=>{});}}
 step(dt){if(!this.mode||this.paused||this.finished)return;this.elapsed+=dt;if(this.elapsed>=this.data.clips[this.mode].frames.length/this.data.clips[this.mode].hz){this.finished=true;this.players[this.mode].pause();}}
 draw(ctx,W,H){if(!this.mode||this.finished)return;const image=this.images[this.mode];if(!image.complete)return;const clip=this.data.clips[this.mode],frame=clip.frames[Math.min(clip.frames.length-1,Math.floor(this.elapsed*clip.hz))],width=Math.min(W*.88,H*1.3,960),height=width*224/320;ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,...frame,(W-width)/2,(H-height)/2,width,height);ctx.restore();}
 pause(value){this.paused=value;const p=this.players[this.mode];if(!p)return;if(value)p.pause();else if(this.enabled&&!this.finished)p.play().catch(()=>{});}
 setEnabled(value){this.enabled=value;if(!value)for(const p of this.recordingPlayers)p.pause();}
 setVolume(value){this.volume=Math.max(0,Math.min(1,value));for(const p of this.recordingPlayers)(this.audioVolume||((p,v)=>p.volume=v))(p,this.volume);}
 destroy(){this.reset();for(const p of this.recordingPlayers){p.removeAttribute('src');p.load();}}
}
