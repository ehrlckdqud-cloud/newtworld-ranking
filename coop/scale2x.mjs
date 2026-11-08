export function scale2x(src,dst,w,h){
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,e=src[i],b=y?src[i-w]:e,hp=y+1<h?src[i+w]:e;
  const d=x?src[i-1]:e,f=x+1<w?src[i+1]:e;
  const out=4*y*w+2*x,lower=out+2*w,edge=b!==hp&&d!==f;
  dst[out]=edge&&d===b?d:e;dst[out+1]=edge&&b===f?f:e;
  dst[lower]=edge&&d===hp?d:e;dst[lower+1]=edge&&hp===f?f:e;
 }
}
