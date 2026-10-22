// Keep the original alternating palette visible at every playback speed.
// Simulation may advance several native frames between two browser paints.
export function markHit(actor){actor.hitVersion=(actor.hitVersion||0)+1;}
export function hitFeedback(actor,now=performance.now()/1000){
 if(actor.hitVersion!==actor.renderedHit&&actor.hitVersion){actor.renderedHit=actor.hitVersion;actor.flashStarted=now;}
 const age=actor.flashStarted===undefined?Infinity:Math.max(0,now-actor.flashStarted);
 return {age,flash:age<6/59.18560606060606&&!(Math.floor(age*59.18560606060606)&1)};
}
