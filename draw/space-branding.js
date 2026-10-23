export const BRANDING={start:5.5,duration:6,source:[84,75,1197,546]};
export const FIRST_ATTACK_AT=BRANDING.start+BRANDING.duration*2/3;
export function brandingPose(time,view){const z=(time-BRANDING.start)/BRANDING.duration;if(z<0||z>1)return null;const vw=view.right-view.left,vh=view.bottom-view.top,w=Math.min(vw*.78,vh*1.5),h=w*BRANDING.source[3]/BRANDING.source[2];return{x:(view.left+view.right-w)/2,y:view.top-h+(vh+h)*z,w,h};}
export class SpaceBranding{
 constructor(image){this.image=image;if(!image&&typeof Image!=='undefined'){this.image=new Image;this.image.src=new URL('./space-assets/newtworld-brand-v17.webp',import.meta.url).href;}}
 draw(ctx,time,view,active){if(!active||!this.image?.complete||!this.image.naturalWidth)return;const p=brandingPose(time,view);if(!p)return;ctx.save();ctx.drawImage(this.image,...BRANDING.source,p.x,p.y,p.w,p.h);ctx.restore();}
}

export function updateBrandEncounter(ships,time,view,position,radius){
 const pose=brandingPose(time,view);if(!pose&&time<BRANDING.start+BRANDING.duration)return;
 for(const ship of ships){if(ship.dead||!Number.isFinite(ship.launchedAt)||Number.isFinite(ship.cruiseAt))continue;
  const p=position(ship,time);if(!pose||pose.y+pose.h>=p.y-radius*1.5)ship.cruiseAt=time;
 }
}
