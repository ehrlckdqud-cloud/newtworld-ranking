import {Scaler} from './vendor/xbrz-1.1.2/lib/main/Scaler.js';
let scaler,surface,context,output;
self.onmessage=({data:{w,h,factor,buffer}})=>{
 if(!scaler||scaler.sourceWidth!==w||scaler.sourceHeight!==h||scaler.factor!==factor){
  scaler=new Scaler(w,h,factor);surface=new OffscreenCanvas(w*factor,h*factor);
  context=surface.getContext('2d');output=context.createImageData(surface.width,surface.height);
 }
 output.data.set(scaler.scale(new Uint8ClampedArray(buffer)));context.putImageData(output,0,0);
 const bitmap=surface.transferToImageBitmap();self.postMessage(bitmap,[bitmap]);
};
