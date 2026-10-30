import {readVolume,saveVolume,volumeControl} from './volume.mjs?v=74';
const base='https://newtworld-ms3-coop-5p.pluckypeach517.chatgpt.site/lobby-audio/';
export function createLobbyAudio({makeAudio=src=>new Audio(src)}={}){
 const music=makeAudio(base+'waiting.mp3'),click=makeAudio(base+'click.mp3'),launch=makeAudio(base+'deploy.mp3');
 music.loop=true;music.volume=readVolume('nwWaitingVolume',.45);for(const a of [music,click,launch])a.preload='auto';
 let waiting=true,enabled=true;
 const play=a=>{try{const p=a.play();p?.catch(()=>{});}catch{}};
 const arm=()=>{if(waiting&&enabled&&music.paused)play(music);};
 return {arm,get volume(){return music.volume;},setVolume(value){music.volume=saveVolume('nwWaitingVolume',value);arm();},setWaiting(value){waiting=value;if(value)arm();else{music.pause();music.currentTime=0;}},effect(deploy=false){const a=deploy?launch:click;a.currentTime=0;play(a);},toggle(){enabled=!enabled;if(enabled)arm();else music.pause();return enabled;}};
}
export const lobbyAudio=createLobbyAudio();
document.addEventListener('pointerdown',()=>lobbyAudio.arm(),{capture:true});
document.addEventListener('keydown',()=>lobbyAudio.arm(),{capture:true});
document.addEventListener('click',event=>{const b=event.target.closest('button');if(b&&!b.disabled)lobbyAudio.effect(b.id==='start');},{capture:true});
window.addEventListener('pagehide',()=>lobbyAudio.setWaiting(false));

for(const parent of [document.querySelector('#channelView'),document.querySelector('.equipment')]){if(parent&&!parent.querySelector('input[aria-label="대기 음악"]'))parent.append(volumeControl('대기 음악',lobbyAudio.volume,value=>{lobbyAudio.setVolume(value);for(const slider of document.querySelectorAll('input[aria-label="대기 음악"]')){slider.value=String(Math.round(value*100));slider.nextElementSibling.textContent=slider.value+'%';}}));}
