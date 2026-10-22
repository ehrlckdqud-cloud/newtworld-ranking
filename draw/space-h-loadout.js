const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>v*v*(3-2*v);
export class SpaceHLoadout{
 constructor(media,audio){this.media=media;this.audio=audio;this.items=[];this.voiced=false;}
 reset(ships){this.voiced=false;this.items=ships.map((ship,i)=>{ship.hReady=false;return{ship,at:4.6+(i%11)*.055};});}
 step(time){for(const item of this.items){const s=item.ship;if(s.dead||s.hReady||time<item.at)continue;s.hReady=true;s.hPickedAt=time;if(!this.voiced){this.voiced=true;this.audio.add({kind:'sound',id:'formation-h-pickup',sound:'ym-112d',at:time,priority:true});}}}
 draw(ctx,time,position,radius){if(time<1.2)return;for(const {ship:s,at} of this.items){if(s.dead)continue;const p=position(s,time);if(!s.hReady){const z=ease(clamp((time-3)/(at-3))),ahead=Math.max(80,radius*2.6);this.media.drawHItem?.(ctx,time,p.x,p.y-ahead*(1-z),2.3);}else if(time-s.hPickedAt<6/59.18560606060606)this.media.drawC?.(ctx,'pickup',time-s.hPickedAt,p.x,p.y,3);}}
}
