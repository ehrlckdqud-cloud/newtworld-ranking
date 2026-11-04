"""Pack 120 960x540 source frames into transparent turtle WebP atlas pages.
Requires Pillow, numpy, scipy. Input is extracted using ffmpeg (see docs).
"""
from pathlib import Path
from PIL import Image
from scipy import ndimage
from io import BytesIO
import argparse,json
import numpy as np
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('frames',type=Path)
parser.add_argument('output',type=Path)
args=parser.parse_args()
frames=sorted(args.frames.glob('*.png'))
assert len(frames)==120
out=bytearray();ranges=[]
for page in range(15):
 atlas=Image.new('RGBA',(3840,1080))
 for j in range(8):
  im=Image.open(frames[page*8+j]).convert('RGB');assert im.size==(960,540)
  rgb=np.array(im).astype(float)
  # Blue screen varies with lighting/shadows: key blue dominance, not a single RGB.
  blue=rgb[:,:,2]-1.15*np.maximum(rgb[:,:,0],rgb[:,:,1])
  alpha=np.clip((14-blue)/12,0,1)
  labels,_=ndimage.label(alpha>.15);sizes=np.bincount(labels.ravel());sizes[0]=0
  body=labels==sizes.argmax()
  alpha*=body
  # The generated source has screen-blue inside the open mouth. Preserve this
  # bounded cavity as opaque dark mouth tissue, not a hole into the pond.
  head=body.copy();head[350:]=False
  tip=np.where(head)[1].max()
  for x in range(max(0,tip-105),tip+1):
   ys=np.flatnonzero((alpha[:350,x]>.8))
   if len(ys)<2:continue
   for upper,lower in zip(ys[:-1],ys[1:]):
    if 2<lower-upper<=60:
     for y in range(upper+1,lower):
      depth=(y-upper)/(lower-upper)
      rgb[y,x]=[35+24*depth,23+7*depth,22+8*depth]
      alpha[y,x]=1
  # Suppress blue fringe without changing the turtle's brown/olive detail.
  rgb[:,:,2]=np.minimum(rgb[:,:,2],np.maximum(rgb[:,:,0],rgb[:,:,1]))
  rgba=Image.fromarray(np.dstack([rgb,alpha*255]).astype('uint8'),'RGBA')
  if page==0 and j==0:rgba.save(args.output.with_suffix(".webp"),format="WEBP",quality=90,method=6)
  atlas.paste(rgba,((j%4)*960,(j//4)*540))
 buf=BytesIO();atlas.save(buf,format='WEBP',quality=90,method=6,alpha_quality=100)
 data=buf.getvalue();ranges.append([len(out),len(data)]);out.extend(data)
args.output.write_bytes(out)
args.output.with_suffix('.json').write_text(json.dumps({'bytes':len(out),'ranges':ranges,'frames':120,'width':960,'height':540}))
print(len(out),flush=True)
