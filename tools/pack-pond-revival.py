"""Pack blue-screen dragonfly video frames, removing the spurious stem.
Usage: python pack-pond-revival.py FRAME_DIR OUTPUT_DIR (Pillow/numpy/scipy).
The source leaf fades out at release; runtime replaces it with a real game leaf.
"""
import sys,json
from pathlib import Path
from io import BytesIO
from PIL import Image
import numpy as np
from scipy import ndimage
src,out=map(Path,sys.argv[1:]);out.mkdir(parents=True,exist_ok=True)
frames=sorted(src.glob('*.png'));assert len(frames)==120
ranges=[];bundle=bytearray();anchors=[]
for page in range(15):
 atlas=Image.new('RGBA',(3840,1080))
 for j in range(8):
  index=page*8+j;rgb=np.asarray(Image.open(frames[index]).convert('RGB')).astype(float)
  alpha=np.clip((np.maximum(rgb[:,:,0],rgb[:,:,1])-rgb[:,:,2]+20)/15,0,1)
  # Recover dark wing veins/membranes mixed with the blue screen as soft alpha.
  background=np.median(rgb,axis=1)[:,None,:]
  contrast=np.clip((np.mean(background-rgb,axis=2)-8)/70,0,.65)
  alpha=np.maximum(alpha,contrast)
  green=(rgb[:,:,1]>rgb[:,:,0]*1.15)&(rgb[:,:,1]>rgb[:,:,2]*1.1)&(alpha>.5)
  labels,_=ndimage.label(green);sizes=np.bincount(labels.ravel());sizes[0]=0;leaf=labels==sizes.argmax()
  ys,xs=np.where(leaf);widths=leaf.sum(1);wide=np.where(widths>widths.max()*.25)[0]
  bottom=int(wide[-1])+2;top=int(wide[0]);left=int(xs.min());right=int(xs.max())
  cx=(left+right)/2;cy=(top+bottom)/2;anchors.append([round(cx/960,5),round(cy/540,5),round((right-left+1)/960,5)])
  # Remove disconnected/attached stem beneath the broad leaf, and watermark.
  alpha[bottom:,:]=0
  labels,_=ndimage.label(alpha>.05);sizes=np.bincount(labels.ravel());sizes[0]=0;alpha*=sizes[labels]>=60
  # Leave the departing dragonfly alone after landing, without a duplicate leaf.
  fade=np.clip((68-index)/5,0,1)
  alpha[max(0,top-5):,max(0,left-6):min(960,right+7)]*=fade
  rgb[:,:,2]=np.minimum(rgb[:,:,2],np.maximum(rgb[:,:,0],rgb[:,:,1]))
  im=Image.fromarray(np.dstack([rgb,alpha*255]).astype('uint8'),'RGBA');atlas.paste(im,((j%4)*960,(j//4)*540))
 buf=BytesIO();atlas.save(buf,format='WEBP',quality=90,method=5,alpha_quality=100);data=buf.getvalue();ranges.append([len(bundle),len(data)]);bundle.extend(data)
(out/'dragonfly-v1.bin').write_bytes(bundle)
(out/'dragonfly-v1.json').write_text(json.dumps(dict(bytes=len(bundle),ranges=ranges,anchors=anchors,width=960,height=540,frames=120)))
print(len(bundle),flush=True)
