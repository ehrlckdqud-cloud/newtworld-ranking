class PspPCM extends AudioWorkletProcessor{
 constructor({processorOptions:{shared,capacity,target}}){
  super();
  this.state=new Int32Array(shared,0,8);this.pcm=new Float32Array(shared,32);
  this.mask=capacity-1;this.target=target;this.active=false;this.frames=0;
  this.nextStretch=0;this.fade=0;
 }
 sample(frame,ch){return this.pcm[((frame&this.mask)*2)+ch];}
 // Match a short piece of the preceding waveform. Overlapping it lets a
 // slightly late emulated frame catch up without changing the music's pitch.
 match(read){
  let best=96,cost=Infinity;
  for(let lag=96;lag<=288;lag+=4){
   let sum=0;
   for(let i=0;i<32;i+=2){
    for(let ch=0;ch<2;ch++){
     const d=this.sample(read+i,ch)-this.sample(read-lag+i,ch);sum+=d*d;
    }
   }
   if(sum<cost){best=lag;cost=sum;}
  }
  return best;
 }
 process(_inputs,outputs){
  const [left,right]=outputs[0];
  let read=Atomics.load(this.state,1)>>>0;
  const write=Atomics.load(this.state,0)>>>0;
  let ready=(write-read)>>>0;
  if(!this.active){
   if(ready<this.target*0.65)return true;
   this.active=true;this.fade=64;
  }
  let lag=0;
  if(ready<this.target*.5 && ready>=left.length && this.frames>=this.nextStretch && this.frames>sampleRate*.04){
   lag=this.match(read);read=(read-lag)>>>0;ready+=lag;
   this.nextStretch=this.frames+lag*12;
   Atomics.add(this.state,4,lag);
  }
  const count=Math.min(left.length,ready);
  for(let i=0;i<count;i++){
   const pos=read+i,blend=lag && i<32 ? (32-i)/32 : 0;
   let gain=1;
   if(this.fade){gain=1-this.fade/64;this.fade--;}
   if(ready<left.length+64)gain*=Math.min(1,(ready-i)/64);
   left[i]=gain*(this.sample(pos,0)*(1-blend)+this.sample(pos+lag,0)*blend);
   right[i]=gain*(this.sample(pos,1)*(1-blend)+this.sample(pos+lag,1)*blend);
  }
  Atomics.store(this.state,1,(read+count)|0);this.frames+=left.length;
  if(count<left.length){this.active=false;Atomics.add(this.state,2,1);}
  Atomics.add(this.state,3,count);
  return true;
 }
}
registerProcessor('nw-psp-pcm',PspPCM);
