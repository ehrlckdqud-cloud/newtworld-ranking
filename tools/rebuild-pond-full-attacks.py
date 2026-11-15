#!/usr/bin/env python3
"""Compile complete creature source clips into 5-second alpha sprite sets for Pond."""
import argparse, json, subprocess, shutil
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

SPECIES={
 'tomatofrog': {'crop':[212,126,816,536], 'original_contact':119},
 'snappingturtle2': {'crop':[48,100,1154,536], 'original_contact':88},
 'otter': {'crop':[61,134,1076,464], 'original_contact':88, 'original_paw':112},
 'platypus': {'crop':[58,195,998,430], 'original_contact':90},
}
FRAME_COUNT=120
PAGE_FRAMES=8
FPS=24
CANVAS=(960,540)

def convert(src,dest,meta):
    cap=cv2.VideoCapture(str(src))
    original_frames=round(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    orig_fps=cap.get(cv2.CAP_PROP_FPS)
    assert original_frames>=180 and abs(orig_fps-24)<1, (src,original_frames,orig_fps)
    size=(int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)))
    assert size==CANVAS,(src,size)
    # Original crop measurements were made at 1280x720, sources pre-scaled to 960x540.
    bx,by,bw,bh=meta['crop']
    bx,by,bw,bh=[round(v*.75) for v in (bx,by,bw,bh)]
    bbox=(bx,by,bx+bw,by+bh)
    pages=[];frames=[]
    wanted=[round(j*(original_frames-1)/(FRAME_COUNT-1)) for j in range(FRAME_COUNT)]
    decoded=[]
    while len(decoded)<original_frames:
        ok,frame=cap.read()
        if not ok:break
        decoded.append(frame)
    assert len(decoded)>=original_frames-1,(src,len(decoded),original_frames)
    for destframe,sourceframe in enumerate(wanted):
        frame=decoded[min(sourceframe,len(decoded)-1)]
        # Work only within the pre-checked animal crop, keeping white fur/undersides intact.
        area=cv2.cvtColor(frame[by:by+bh,bx:bx+bw],cv2.COLOR_BGR2RGB)
        hi=area.max(2).astype(np.int16);lo=area.min(2).astype(np.int16)
        nearwhite=np.logical_and(lo>205,hi-lo<36).astype(np.uint8)
        count,labels=cv2.connectedComponents(nearwhite,connectivity=4)
        # Only clear regions of white connected to the crop's outer border.
        border=np.unique(np.concatenate((labels[0,:],labels[-1,:],labels[:,0],labels[:,-1])))
        mask=np.where(np.isin(labels,border),0,255).astype(np.uint8)
        mask=cv2.medianBlur(mask,3)
        mask=cv2.GaussianBlur(mask,(3,3),.65)
        rgba=np.dstack((area,mask))
        tile=Image.new('RGBA',CANVAS,(0,0,0,0))
        x=(CANVAS[0]-bw)//2;y=(CANVAS[1]-bh)//2
        tile.paste(Image.fromarray(rgba,'RGBA'),(x,y))
        frames.append(tile)
    cap.release()
    offset=0;ranges=[]
    with open(dest/f'{src.stem}-strike.bin','wb') as out:
        for a in range(0,FRAME_COUNT,PAGE_FRAMES):
            page=Image.new('RGBA',(CANVAS[0]*4,CANVAS[1]*2),(0,0,0,0))
            for i,tile in enumerate(frames[a:a+PAGE_FRAMES]):
                page.paste(tile,((i%4)*CANVAS[0],(i//4)*CANVAS[1]))
            import io
            data=io.BytesIO();page.save(data,format='WEBP',quality=84,method=0)
            buf=data.getvalue();out.write(buf)
            ranges.append([offset,len(buf)]);offset+=len(buf)
    preview=frames[max(0,min(FRAME_COUNT-1,round(meta['original_contact']*(FRAME_COUNT-1)/(original_frames-1))))]
    preview.save(dest/f'{src.stem}-strike.webp',format='WEBP',quality=88,method=0)
    # Every original audio sample is retained in time order, tempo-adjusted to five seconds without pitch shift.
    speed=(original_frames/orig_fps)/5.
    audio=dest/f'{src.stem}-strike.wav'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(src),'-vn',
        '-af',f'atempo={speed:.9f},apad,atrim=0:5','-ar','48000','-ac','2','-c:a','pcm_f32le',str(audio)],check=True)
    data={'frames':FRAME_COUNT,'ranges':ranges,'contact':round(meta['original_contact']*(FRAME_COUNT-1)/(original_frames-1))}
    if 'original_paw' in meta:data['pawContact']=round(meta['original_paw']*(FRAME_COUNT-1)/(original_frames-1))
    print(src.stem,'source_frames',original_frames,'5sec_frames',FRAME_COUNT,'bundle_bytes',offset,'audio_bytes',audio.stat().st_size,'contact',data['contact'],'pawContact',data.get('pawContact'))
    return data

def main():
    p=argparse.ArgumentParser();p.add_argument('--sources',required=True);p.add_argument('--output',required=True);a=p.parse_args()
    srcdir=Path(a.sources);out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
    report={}
    for key,meta in SPECIES.items():
        source=srcdir/(key+'.mp4');assert source.is_file(),source
        report[key]=convert(source,out,meta)
    (out/'pond-full-meta.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
