#!/usr/bin/env python3
"""Build natural-speed, complete 5-second creature strikes from original source MP4s."""
import argparse
import json
import subprocess
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

# Source frame indices are measured at native 24 fps, BEFORE the attack and AFTER recovery.
# The original contact frame indices were confirmed against the archived 2026-11-15 sources.
SPECIES={
 'tomatofrog': {'crop':[212,126,816,536], 'start':50, 'original_contact':119},
 'snappingturtle2': {'crop':[48,100,1154,536], 'start':39, 'original_contact':109},
 'otter': {'crop':[61,134,1076,464], 'start':42, 'original_contact':84, 'original_paw':88},
 'platypus': {'crop':[58,195,998,430], 'start':21, 'original_contact':115},
}
FRAME_COUNT=120
PAGE_FRAMES=8
FPS=24
CANVAS=(960,540)

def convert(src,dest,meta):
    cap=cv2.VideoCapture(str(src))
    original_frames=round(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    orig_fps=cap.get(cv2.CAP_PROP_FPS)
    assert original_frames>=180 and abs(orig_fps-FPS)<1, (src,original_frames,orig_fps)
    size=(int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)))
    assert size==CANVAS,(src,size)
    # The source videos stored in GitHub were rescaled from the original 1280x720
    # to 960x540, while the original crop measurements used the 1280x720 coordinates.
    bx,by,bw,bh=[round(v*.75) for v in meta['crop']]
    wanted=list(range(meta['start'],meta['start']+FRAME_COUNT))
    assert wanted[-1]<original_frames, (src,wanted[-1],original_frames)
    assert meta['start']<=meta['original_contact']<meta['start']+FRAME_COUNT,src
    if 'original_paw' in meta:
        assert meta['start']<=meta['original_paw']<meta['start']+FRAME_COUNT,src
    decoded=[]
    while len(decoded)<original_frames:
        ok,frame=cap.read()
        if not ok:break
        decoded.append(frame)
    cap.release()
    assert len(decoded)>=original_frames-1,(src,len(decoded),original_frames)
    frames=[]
    for sourceframe in wanted:
        frame=decoded[min(sourceframe,len(decoded)-1)]
        area=cv2.cvtColor(frame[by:by+bh,bx:bx+bw],cv2.COLOR_BGR2RGB)
        hi=area.max(2).astype(np.int16)
        lo=area.min(2).astype(np.int16)
        nearwhite=np.logical_and(lo>205,hi-lo<36).astype(np.uint8)
        count,labels=cv2.connectedComponents(nearwhite,connectivity=4)
        border=np.unique(np.concatenate((labels[0,:],labels[-1,:],labels[:,0],labels[:,-1])))
        mask=np.where(np.isin(labels,border),0,255).astype(np.uint8)
        mask=cv2.medianBlur(mask,3)
        mask=cv2.GaussianBlur(mask,(3,3),.65)
        rgba=np.dstack((area,mask))
        tile=Image.new('RGBA',CANVAS,(0,0,0,0))
        x=(CANVAS[0]-bw)//2
        y=(CANVAS[1]-bh)//2
        tile.paste(Image.fromarray(rgba,'RGBA'),(x,y))
        frames.append(tile)
    offset=0
    ranges=[]
    with open(dest/f'{src.stem}-strike.bin','wb') as out:
        for a in range(0,FRAME_COUNT,PAGE_FRAMES):
            page=Image.new('RGBA',(CANVAS[0]*4,CANVAS[1]*2),(0,0,0,0))
            for i,tile in enumerate(frames[a:a+PAGE_FRAMES]):
                page.paste(tile,((i%4)*CANVAS[0],(i//4)*CANVAS[1]))
            import io
            data=io.BytesIO()
            page.save(data,format='WEBP',quality=84,method=0)
            buf=data.getvalue()
            out.write(buf)
            ranges.append([offset,len(buf)])
            offset+=len(buf)
    preview=frames[meta['original_contact']-meta['start']]
    preview.save(dest/f'{src.stem}-strike.webp',format='WEBP',quality=88,method=0)
    # Preserve the source audio tempo and pitch. Seek/trim at the same original-frame
    # window; NO 'atempo' or whole-source speed compression.
    audio=dest/f'{src.stem}-strike.wav'
    start=meta['start']/FPS
    end=start+FRAME_COUNT/FPS
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(src),'-vn',
        '-af',f'atrim=start={start:.9f}:end={end:.9f},asetpts=PTS-STARTPTS,apad,atrim=0:5',
        '-ar','48000','-ac','2','-c:a','pcm_f32le',str(audio)],check=True)
    data={'frames':FRAME_COUNT,'ranges':ranges,'contact':meta['original_contact']-meta['start']}
    if 'original_paw' in meta:data['pawContact']=meta['original_paw']-meta['start']
    print(src.stem,'source',f'{start:.3f}-{end:.3f}s','frames',FRAME_COUNT,'bundle',offset,'audio',audio.stat().st_size,'contact',data['contact'],'pawContact',data.get('pawContact'))
    return data

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--sources',required=True)
    parser.add_argument('--output',required=True)
    args=parser.parse_args()
    srcdir=Path(args.sources)
    out=Path(args.output)
    out.mkdir(parents=True,exist_ok=True)
    report={}
    for key,meta in SPECIES.items():
        source=srcdir/(key+'.mp4')
        assert source.is_file(),source
        report[key]=convert(source,out,meta)
    (out/'pond-full-meta.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
