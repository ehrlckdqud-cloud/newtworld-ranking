// Prepare small GPU-ready frames during loading, before the first on-screen cue.
export async function prepareAtlasFrames(image,rects){
 if(typeof createImageBitmap!=='function')return null;
 const frames=[];
 try{for(let i=0;i<rects.length;i++){frames.push(await createImageBitmap(image,...rects[i]));if(i%8===7)await new Promise(resolve=>setTimeout(resolve,0));}return frames;}
 catch{for(const frame of frames)frame.close();return null;}
}
