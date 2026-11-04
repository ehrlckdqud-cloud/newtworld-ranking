const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export class PondRevival {
 constructor(){this.player=new Audio;this.player.preload='auto';this.pages=new Map;this.pending=new Map;this.event=null;this.job=null;this.last=null;this.failedAudio=false;}
 async prepare(){
  if(this.meta)return;
  if(this.job)return this.job;
  this.job=(async()=>{
   const response=await fetch(new URL('./revival/dragonfly-v1.json',import.meta.url));if(!response.ok)throw Error('부활 영상 정보를 불러오지 못했어요.');
   const meta=await response.json(),r=await fetch(new URL('./revival/dragonfly-v1.bin',import.meta.url));if(!r.ok)throw Error('부활 영상을 불러오지 못했어요.');
   const blob=await r.blob();if(blob.size!==meta.bytes)throw Error('부활 영상 파일을 다시 받아주세요.');
   this.blobs=meta.ranges.map(([start,length])=>blob.slice(start,start+length,'image/webp'));this.meta=meta;
   if(!this.player.src)this.player.src=new URL('./revival/revive-v2.mp3',import.meta.url).href;
   await Promise.all([this.load(0),this.load(1)]);
  })();try{await this.job}catch(error){this.meta=null;throw error}finally{this.job=null}
 }
 async load(page){
  if(!this.blobs?.[page]||this.pages.has(page))return;
  if(this.pending.has(page))return this.pending.get(page);
  const job=createImageBitmap(this.blobs[page]).then(image=>{this.pages.set(page,image);while(this.pages.size>4){const old=[...this.pages.keys()].find(k=>k!==page&&k!==this.last?.page);if(old===undefined)break;this.pages.get(old).close();this.pages.delete(old)}}).finally(()=>this.pending.delete(page));
  this.pending.set(page,job);return job;
 }
 arm(){if(!this.player.src)this.player.src=new URL('./revival/revive-v2.mp3',import.meta.url).href;this.failedAudio=false;this.player.muted=true;this.player.play().then(()=>{this.player.pause();this.player.currentTime=0;this.player.muted=false}).catch(()=>{this.player.muted=false})}
 syncAudio(engine,paused,volume,music){
  const event=engine.state==='running'&&engine.event?.kind==='revival'?engine.event:null;
  if(!event||paused){this.player.pause();if(!event)this.event=null;return}
  if(this.event!==event){this.event=event;this.failedAudio=false}
  if(this.failedAudio||!this.meta)return;
  const position=clamp((engine.elapsed-event.start)/(engine.duration/engine.rounds))*5;
  music.effectVolume(this.player,volume);this.player.muted=false;
  if(Math.abs(this.player.currentTime-position)>.2)this.player.currentTime=position;
  if(this.player.paused&&position<4.95)this.player.play().catch(()=>{this.failedAudio=true});
 }
 draw(ctx,engine,renderer,width,height){
  const event=engine.event;if(engine.state!=='running'||event?.kind!=='revival'||!this.meta)return;
  const phase=clamp((engine.elapsed-event.start)/(engine.duration/engine.rounds)),frame=Math.min(119,Math.floor(phase*120)),page=Math.floor(frame/8);
  this.load(page).catch(()=>{});this.load(page+1).catch(()=>{});
  let bitmap=this.pages.get(page),shown=frame;
  if(bitmap)this.last={page,frame};else if(this.last){bitmap=this.pages.get(this.last.page);shown=this.last.frame}
  if(!bitmap)return;
  const anchor=this.meta.anchors[Math.min(shown,68)],count=engine.leaves.filter(l=>l.alive||event.reviveIds.includes(l.id)).length;
  const columns=Math.ceil(Math.sqrt(1.5*count)),rows=Math.ceil(count/columns);
  const radius=Math.min(count<=10?69:width<800?41:47,Math.max(13,.31*Math.sqrt((width-160)*(height-350)/Math.max(count,1))),(width-140)*(count<=10?.52:.83)/Math.max(1,columns-1)*.39,(height-365)*(count<=10?.5:.76)/Math.max(1,rows-1)*.41);
  const arrival=smooth(phase/.57),mix=smooth((phase-.525)/.045);
  for(const spot of event.landings){
   const leaf=engine.leaves[spot.id],dest=renderer.point({...leaf,x:spot.x,y:spot.y},width,height);
   const size=radius*2*(.4+.6*arrival),scale=size/(anchor[2]*960);
   const cx=dest.x+(spot.id%2?1:-1)*Math.min(110,width*.08)*(1-arrival),cy=dest.y-Math.min(180,height*.18)*(1-arrival);
   ctx.save();ctx.globalAlpha=smooth(phase/.04);
   // Same full-body frame is reused once per selected member; no random extra insects.
   ctx.drawImage(bitmap,(shown%4)*960,(Math.floor(shown/4)%2)*540,960,540,cx-anchor[0]*960*scale,cy-anchor[1]*540*scale,960*scale,540*scale);
   if(mix>0){ctx.save();ctx.globalAlpha*=mix;const art=renderer.art.leaf(size);if(art)ctx.drawImage(art,dest.x-radius*1.2,dest.y-radius*.8,radius*2.4,radius*1.6);ctx.restore()}
   const px=cx+(dest.x-cx)*mix,py=cy+(dest.y-cy)*mix,pr=size*.29;
   ctx.save();ctx.beginPath();ctx.ellipse(px,py,pr,pr*.72,0,0,Math.PI*2);ctx.clip();const photo=renderer.images.get(leaf.name);ctx.fillStyle='#d9ed98';ctx.fillRect(px-pr,py-pr,2*pr,2*pr);if(photo)ctx.drawImage(photo,px-pr,py-pr,2*pr,2*pr);else{
    const frog=renderer.art.get('treefrog');
    ctx.fillStyle='#e1edce';ctx.fillRect(px-pr,py-pr,2*pr,2*pr);
    if(frog){const size=pr*1.5/.69;ctx.drawImage(frog,px-size/2,py-size/2,size,size)}
   }ctx.restore();
   ctx.font=`bold ${Math.max(10,Math.min(17,radius*.38))}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='top';ctx.lineWidth=3;ctx.strokeStyle='#102d20';ctx.fillStyle='#fff';ctx.strokeText(leaf.name,px,py+pr*.8,radius*3);ctx.fillText(leaf.name,px,py+pr*.8,radius*3);
   if(phase>=.57){ctx.globalAlpha*=1-smooth((phase-.65)/.3);ctx.strokeStyle='#d5ffe1';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(dest.x,dest.y,radius*(1+(phase-.57)*3),radius*(.5+(phase-.57)*1.5),0,0,Math.PI*2);ctx.stroke()}
   ctx.restore();
  }
 }
}
