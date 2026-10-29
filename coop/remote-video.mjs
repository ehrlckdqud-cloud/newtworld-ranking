export function hasDecodedVideo(video){return video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0;}
export function syncVideoLoading(video,loading){const ready=hasDecodedVideo(video);loading.hidden=ready;return ready;}
export function attachRemoteVideo(video,stream,{loading,onReady=()=>{},onError=()=>{}}){
 let disposed=false,announced=false;
 const check=()=>{if(disposed)return;if(syncVideoLoading(video,loading)&&!announced){announced=true;onReady();}};
 // Install listeners before play: playback can already be active during preflight.
 for(const name of ['loadeddata','playing','resize'])video.addEventListener(name,check);
 if(video.srcObject!==stream)video.srcObject=stream;
 const play=async()=>{try{await video.play();check();}catch(e){if(e.name==='NotAllowedError'){video.muted=true;try{await video.play();check();}catch(err){onError(err);}}else onError(e);}};
 void play();check();
 return {check,dispose(){disposed=true;for(const name of ['loadeddata','playing','resize'])video.removeEventListener(name,check);}};
}
