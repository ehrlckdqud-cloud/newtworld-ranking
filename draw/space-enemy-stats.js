export const ENEMY_STATS={small:{hp:6,r:51,scale:2.7},large:{hp:270,r:390,scale:6.8},ufo:{hp:12,r:69,scale:2.7},ring:{hp:6,r:45,scale:2.55},alien:{hp:15,r:72,scale:3}};
export const ESCORT_HP=15;
export function drawEnemyHealth(ctx,x,y,r,hp,maxHp){const w=Math.max(38,Math.min(84,r*1.2));ctx.save();ctx.fillStyle='#0a1029dd';ctx.fillRect(x-w/2-2,y-r-12,w+4,7);ctx.fillStyle='#e88066';ctx.fillRect(x-w/2,y-r-10,w*Math.max(0,hp/maxHp),3);ctx.restore();}
