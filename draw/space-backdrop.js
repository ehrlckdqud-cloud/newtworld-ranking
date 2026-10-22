// Stars tile without seams. The Earth plane moves down out of view as the
// explorers ascend; only its spatial upper edge is feathered, never its time opacity.
export class SpaceBackdrop{
 constructor(){if(typeof Image!=='undefined'){this.earth=new Image;this.earth.src=new URL('./space-assets/earth-clouds-v10.webp',import.meta.url).href;}}
 draw(ctx,art,time,W,H,view){
  if(!(W>0&&H>0)||!Number.isFinite(W+H)||!art.complete||!art.naturalWidth)return;
  if(!this.tile){this.tile=document.createElement('canvas');this.tile.width=472;this.tile.height=1016;const c=this.tile.getContext('2d');c.drawImage(art,456,4,472,1016,0,0,472,1016);c.fillStyle='rgba(5,10,23,.25)';c.fillRect(0,0,472,1016);}
  const r=Math.min(1,Math.max(0,(time-5)/1.2)),area=1.2*(r*r*r-.5*r*r*r*r)+Math.max(0,time-6.2),bh=H*1.5,travel=time*14+area*620,offset=((travel%(bh*2))+bh*2)%(bh*2);
  for(let x=Math.floor(view.left/W);x<=Math.floor(view.right/W);x++)for(let y=Math.floor((view.top-offset)/bh);y<=Math.floor((view.bottom-offset)/bh);y++){ctx.save();ctx.translate(x*W,offset+y*bh);if(Math.abs(x)%2){ctx.translate(W,0);ctx.scale(-1,1);}if(Math.abs(y)%2){ctx.translate(0,bh);ctx.scale(1,-1);}ctx.drawImage(this.tile,-.5,-.5,W+1,bh+1);ctx.restore();}
  if(this.earth?.complete&&this.earth.naturalWidth){
   if(!this.earthPlane){const p=document.createElement('canvas');p.width=this.earth.naturalWidth;p.height=this.earth.naturalHeight;const c=p.getContext('2d');c.drawImage(this.earth,0,0);c.globalCompositeOperation='destination-in';const mask=c.createLinearGradient(0,0,0,p.height*.4);mask.addColorStop(0,'#0000');mask.addColorStop(.5,'#0000');mask.addColorStop(1,'#000');c.fillStyle=mask;c.fillRect(0,0,p.width,p.height);this.earthPlane=p;}
   const vw=view.right-view.left,vh=view.bottom-view.top,k=Math.max(vw/this.earth.naturalWidth,vh/this.earth.naturalHeight)*1.08,ww=this.earth.naturalWidth*k,hh=this.earth.naturalHeight*k,ascent=vh*Math.max(0,time-1.5)**2/38,y=(view.top+view.bottom-hh)/2+ascent;
   if(y<view.bottom)ctx.drawImage(this.earthPlane,(view.left+view.right-ww)/2,y,ww,hh);
  }
 }
}
