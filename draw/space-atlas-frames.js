// Prepare small GPU-ready frames during loading, before the first on-screen cue.
export async function prepareAtlasFrames(image,rects){
 if(typeof createImageBitmap!=='function')return null;
 const frames=[];let atlas;
 // Decode the large atlas once. Cropping an HTMLImageElement for every frame
 // repeatedly decodes the same image on some browsers and stalls game entry.
 try{atlas=await createImageBitmap(image);for(let i=0;i<rects.length;i++){frames.push(await createImageBitmap(atlas,...rects[i]));if(i%8===7)await new Promise(resolve=>setTimeout(resolve,0));}return frames;}
 catch{for(const frame of frames)frame.close();return null;}
 finally{atlas?.close();}
}
