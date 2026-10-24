import {prepareAtlasFrames} from './space-atlas-frames.js?v=62.0';
// Original caption actors, VRAM zoom frames and palettes, with native
// M1/YM2610 announcements. No browser font or synthetic replacement voice.
const asset=name=>new URL('./space-assets/'+name,import.meta.url).href;
export class SpaceMission{
 constructor({AudioClass=Audio,ImageClass=Image,fetcher=(...args)=>fetch(...args)}={}){this.fetcher=fetcher;this.images={start:new ImageClass,complete:new ImageClass};this.players={start:new AudioClass(asset('mission-start-voice-v11.mp3')),complete:new AudioClass(asset('mission-complete-voice-v29.wav'))};this.recordingPlayers=Object.values(this.players);this.completionMusicUrl=asset('mission-complete-music.mp3');this.enabled=true;this.volume=.9;this.reset();}
 async load(){const response=await this.fetcher(asset('mission-frames.json'));if(!response.ok)throw Error('원본 미션 연출을 불러오지 못했어요.');this.data=await response.json();await Promise.all(Object.entries(this.images).map(async([name,im])=>{im.src=asset(this.data.clips[name].atlas);await im.decode();}));this.frameImages={};for(const [name,image]of Object.entries(this.images))this.frameImages[name]=await prepareAtlasFrames(image,this.data.clips[name].frames);for(const name of Object.keys(this.images))if(this.frameImages[name])this.images[name]=null;for(const p of this.recordingPlayers)p.preload='auto';return this;}
 reset(){for(const p of this.recordingPlayers){p.pause();p.currentTime=0;}this.mode=null;this.elapsed=0;this.finished=false;this.paused=false;}
 start(mode){this.reset();this.mode=mode;const p=this.players[mode];if(this.enabled){(this.audioVolume||((p,v)=>p.volume=v))(p,this.volume);p.play().catch(()=>{});}}
 step(dt){if(!this.mode||this.paused||this.finished)return;this.elapsed+=dt;if(this.elapsed>=this.data.clips[this.mode].frames.length/this.data.clips[this.mode].hz){this.finished=true;}}
 draw(ctx,W,H){if(!this.mode||this.finished)return;const image=this.images[this.mode];if(!this.frameImages?.[this.mode]&&!image?.complete)return;const clip=this.data.clips[this.mode],frame=clip.frames[Math.min(clip.frames.length-1,Math.floor(this.elapsed*clip.hz))],width=Math.min(W*.88,H*1.3,960),height=width*224/320;ctx.save();ctx.imageSmoothingEnabled=false;const prepared=this.frameImages?.[this.mode]?.[Math.min(clip.frames.length-1,Math.floor(this.elapsed*clip.hz))];ctx.drawImage(prepared||image,...(prepared?[0,0,frame[2],frame[3]]:frame),(W-width)/2,(H-height)/2,width,height);ctx.restore();}
 pause(value){this.paused=value;const p=this.players[this.mode];if(!p)return;if(value)p.pause();else if(this.enabled&&!p.ended)p.play().catch(()=>{});}
 setEnabled(value){this.enabled=value;if(!value)for(const p of this.recordingPlayers)p.pause();}
 setVolume(value){this.volume=Math.max(0,Math.min(1,value));for(const p of this.recordingPlayers)(this.audioVolume||((p,v)=>p.volume=v))(p,this.volume);}
 destroy(){this.reset();for(const p of this.recordingPlayers){p.removeAttribute('src');p.load();}}
}
