// Ordered RTC messages carry held controls. Sample one transition per host frame
// so a short press and release received together still produce a native edge.
export class PeerInput {
  held=0; last=0; changes=[]; seen=-Infinity;
  receive(bits,now){
    if(!Number.isInteger(bits)||bits<0||bits>127)return;
    if(now-this.seen>250){this.held=this.last=0;this.changes.length=0;}
    this.seen=now;
    if(bits===this.last)return;
    this.last=bits;
    if(this.changes.length>=8)this.changes.length=0;
    this.changes.push(bits);
  }
  sample(now){
    if(now-this.seen>250){this.changes.length=0;return this.held=this.last=0;}
    if(this.changes.length)this.held=this.changes.shift();
    return this.held;
  }
}
