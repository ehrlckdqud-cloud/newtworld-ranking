import {randomItemDriftSpeed} from './space-item-drift.js?v=46.0';
export const FUEL_RULES=Object.freeze({dropChance:.03,maxDrops:20,lifetime:35});
export class SpaceFuel{
 constructor(media,audio,rng=Math.random){Object.assign(this,{media,audio,rng,drops:[],effects:[],killed:new Set,dropCount:0,serial:0,stopped:false});}
 killedEnemy(e,time,duration=120){if(this.stopped||this.killed.has(e.id))return;this.killed.add(e.id);if(time<duration/3||this.dropCount>=FUEL_RULES.maxDrops||!Number.isFinite(e.x)||!Number.isFinite(e.y)||this.rng()>=FUEL_RULES.dropChance)return;const angle=this.rng()*Math.PI*2,speed=randomItemDriftSpeed(this.rng);this.dropCount++;this.drops.push({id:++this.serial,x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,born:time});}
 pickup(s,d,time){if(d.taken||s.dead||(s.hp??4)>=(s.maxHp??4))return false;d.taken=true;s.hp=s.maxHp??4;delete s.criticalAt;s.healedAt=time;this.effects.push({ship:s,at:time});this.audio.add({kind:'sound',id:'fuel-ok-'+d.id,sound:'ym-1124',at:time,priority:true,gain:2,fullPlayback:true});return true;}
 ceasefire(){this.stopped=true;this.drops=[];this.effects=[];}
 step(time,dt,ships,position,battle){if(this.stopped)return;const v=battle.view(),radius=2*(battle.rosterCount>150?10:battle.rosterCount>100?13:battle.rosterCount>50?16:battle.rosterCount>25?21:28),eligible=ships.filter(s=>!s.dead&&(s.hp??4)<(s.maxHp??4));
  for(const d of this.drops){if(time-d.born>FUEL_RULES.lifetime){d.taken=true;continue;}const previous={x:d.x,y:d.y};d.x+=d.vx*dt;d.y+=d.vy*dt;for(const [axis,lo,hi,vel]of [['x',v.left+28,v.right-28,'vx'],['y',v.top+45,v.bottom-28,'vy']]){if(d[axis]<lo||d[axis]>hi){d[axis]=Math.max(lo,Math.min(hi,d[axis]));d[vel]=d[axis]===lo?Math.abs(d[vel]):-Math.abs(d[vel]);}}
   if(time-d.born<.15)continue;let winner=null;for(const s of eligible){if(s.hp>=(s.maxHp??4))continue;const p=position(s,time),old=position(s,time-dt),u=battle.sweptContact({x:old.x-previous.x,y:old.y-previous.y},{x:p.x-d.x,y:p.y-d.y},{x:0,y:0,r:radius+20});if(u!==null&&(!winner||u<winner.u))winner={s,u};}if(winner)this.pickup(winner.s,d,time);
  }this.drops=this.drops.filter(d=>!d.taken);this.effects=this.effects.filter(e=>time-e.at<.65);
 }
 draw(ctx,time,position){for(const d of this.drops)this.media.drawFuel?.(ctx,d.x,d.y,time-d.born);for(const e of this.effects){const p=position(e.ship,time);this.media.drawC?.(ctx,'pickup',time-e.at,p.x,p.y,3);}}
}
