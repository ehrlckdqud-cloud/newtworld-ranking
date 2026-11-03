from pathlib import Path
from PIL import Image
import numpy as np
from scipy import ndimage
from io import BytesIO
import json
import argparse
parser=argparse.ArgumentParser(description="Pack 120 mirrored, 960x540 PNG frames into the emperor WebP atlas bundle. Requires Pillow, numpy and scipy.")
parser.add_argument("frames",type=Path)
parser.add_argument("output",type=Path)
args=parser.parse_args()
frames=sorted(args.frames.glob('*.png'))
assert len(frames)==120
out=bytearray();ranges=[]
for page in range(15):
 atlas=Image.new('RGBA',(3840,1080))
 for j in range(8):
  im=Image.open(frames[page*8+j]).convert('RGB'); a=np.asarray(im).astype(np.int16)
  # Remove only neutral background connected to the outside, retaining interior highlights.
  neutral=(a.max(2)-a.min(2)<48)&(a.min(2)>95)
  seeds=np.zeros(neutral.shape,bool);seeds[0,:]=neutral[0,:];seeds[-1,:]=neutral[-1,:];seeds[:,0]=neutral[:,0];seeds[:,-1]=neutral[:,-1]
  bg=ndimage.binary_propagation(seeds,mask=neutral)
  fg=ndimage.binary_fill_holes(~bg)
  labels,n=ndimage.label(fg);sizes=np.bincount(labels.ravel());sizes[0]=0;fg=labels==sizes.argmax()
  alpha=np.clip(ndimage.distance_transform_edt(fg)/1.5,0,1)*255
  rgba=im.convert('RGBA');rgba.putalpha(Image.fromarray(alpha.astype('uint8')))
  atlas.paste(rgba,((j%4)*960,(j//4)*540))
 buf=BytesIO();atlas.save(buf,format='WEBP',quality=88,method=6,alpha_quality=100)
 data=buf.getvalue();ranges.append([len(out),len(data)]);out.extend(data)
args.output.write_bytes(out)
args.output.with_suffix('.json').write_text(json.dumps({'bytes':len(out),'ranges':ranges}))
print(len(out), flush=True)
