export class SpaceBlackHole{
 constructor(){if(typeof Image!=='undefined'){this.image=new Image;this.image.src=new URL('./space-assets/black-hole-v11.webp',import.meta.url).href;}}
 draw(ctx,x,y,r,time){if(!this.image?.complete||!this.image.naturalWidth)return;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(time*.35)*.035);ctx.drawImage(this.image,-r*1.65,-r*1.65,r*3.3,r*3.3);ctx.restore();}
}
