// Preserve every native frame for transition/HUD observers, but composite the
// enlarged display only once after a catch-up batch.
export function createFramePresentation(paint,present){
 let depth=0,dirty=false;
 return {
  begin(){depth++;},
  video(...args){paint(...args);dirty=true;if(!depth){dirty=false;present();}},
  end(){if(depth)depth--;if(!depth&&dirty){dirty=false;present();}}
 };
}
