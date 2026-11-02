// Yield between complete emulated frames so RTC messages and browser input can
// run during catch-up. Never skip or partially execute a deterministic frame.
export function createFrameBudget({now=()=>performance.now(),milliseconds=8,maxFrames=5}={}){
 let started=0,frames=0;
 return {begin(){started=now();frames=0;},take(){if(frames>=maxFrames||(frames>0&&now()-started>=milliseconds))return false;frames++;return true;}};
}
