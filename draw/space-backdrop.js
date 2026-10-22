// Mirror-adjacent edges share the same source pixels. Tiles are opaque before
// overlap, so alpha cannot accumulate into a bright seam on the tile boundaries.
export class SpaceBackdrop{
 draw(ctx,art,time,W,H,view){if(!(W>0&&H>0)||!Number.isFinite(W+H)||!art.complete||!art.naturalWidth)return;if(!this.tile){this.tile=document.createElement('canvas');this.tile.width=472;this.tile.height=1016;const c=this.tile.getContext('2d');c.drawImage(art,456,4,472,1016,0,0,472,1016);c.fillStyle='rgba(5,10,23,.25)';c.fillRect(0,0,472,1016);}
  const r=Math.min(1,Math.max(0,(time-5)/1.2)),area=1.2*(r*r*r-.5*r*r*r*r)+Math.max(0,time-6.2),bh=H*1.5,travel=time*14+area*620,offset=((travel%(bh*2))+bh*2)%(bh*2);
  for(let x=Math.floor(view.left/W);x<=Math.floor(view.right/W);x++)for(let y=Math.floor((view.top-offset)/bh);y<=Math.floor((view.bottom-offset)/bh);y++){ctx.save();ctx.translate(x*W,offset+y*bh);if(Math.abs(x)%2){ctx.translate(W,0);ctx.scale(-1,1);}if(Math.abs(y)%2){ctx.translate(0,bh);ctx.scale(1,-1);}ctx.drawImage(this.tile,-.5,-.5,W+1,bh+1);ctx.restore();}
 }
}
