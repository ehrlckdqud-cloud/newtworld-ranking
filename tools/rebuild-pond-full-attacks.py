#!/usr/bin/env python3
"""Build natural-speed, complete 5-second creature strikes from original source MP4s."""
import argparse
import json
import subprocess
import imageio_ffmpeg
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
    # Track the platypus eye frame by frame. The white sclera must NOT be
    # interpreted as white background when the bill/head moves.
    eye_template=None
    eye_search=None
    eye_scale=(bw/998.,bh/430.)
    if src.stem=='platypus':
        first=cv2.cvtColor(decoded[wanted[0]][by:by+bh,bx:bx+bw],cv2.COLOR_BGR2GRAY)
        ex,ey=eye_scale
        eye_template=first[round(184*ey):round(220*ey),round(708*ex):round(745*ex)].copy()
        eye_search=(round(590*ex),round(40*ey),round(920*ex),round(340*ey))
        assert eye_template.shape[0]>=15 and eye_template.shape[1]>=15

    frames=[]
    eye_scores=[]
    rescued_whiskers=0
    for sourceframe in wanted:
        frame=decoded[min(sourceframe,len(decoded)-1)]
        area=cv2.cvtColor(frame[by:by+bh,bx:bx+bw],cv2.COLOR_BGR2RGB)
        hi=area.max(2).astype(np.int16)
        lo=area.min(2).astype(np.int16)
        nearwhite=np.logical_and(lo>205,hi-lo<36).astype(np.uint8)
        count,labels=cv2.connectedComponents(nearwhite,connectivity=4)
        border=np.unique(np.concatenate((labels[0,:],labels[-1,:],labels[:,0],labels[:,-1])))
        mask=np.where(np.isin(labels,border),0,255).astype(np.uint8)
        if src.stem in ('snappingturtle2','platypus','tomatofrog'):
            # Only remove broad neutral flooring/shadows BELOW the animal.
            # Tomato frog's light beige belly is warm-colored, not neutral.
            neutral=((lo>177)&((hi-lo)<47)).astype(np.uint8)
            total,components,stats,_=cv2.connectedComponentsWithStats(neutral,connectivity=4)
            rim=np.unique(np.concatenate((components[0,:],components[-1,:],components[:,0],components[:,-1])))
            unwanted=np.isin(np.arange(total),rim)|(stats[:,cv2.CC_STAT_AREA]>=80)
            unwanted[0]=False
            lower_limit=.64 if src.stem=='tomatofrog' else .54
            lower=np.arange(bh)[:,None]>=int(bh*lower_limit)
            mask[np.logical_and(unwanted[components],lower)]=0

        mask=cv2.GaussianBlur(cv2.medianBlur(mask,3),(3,3),.65)

        if eye_template is not None:
            # Locate the dark pupil by matching its authentic eye texture,
            # instead of a fixed rectangle that would miss moving frames.
            gray=cv2.cvtColor(area,cv2.COLOR_RGB2GRAY)
            x0,y0,x1,y1=eye_search
            patch=gray[y0:y1,x0:x1]
            _,score,_,loc=cv2.minMaxLoc(cv2.matchTemplate(patch,eye_template,cv2.TM_CCOEFF_NORMED))
            eye_scores.append(score)
            assert score>.55,(src,sourceframe,'eye tracking lost',score)
            cx=x0+loc[0]+eye_template.shape[1]//2
            cy=y0+loc[1]+eye_template.shape[0]//2
            guard=np.zeros((bh,bw),np.uint8)
            cv2.ellipse(guard,(cx,cy),(round(34*eye_scale[0]),round(29*eye_scale[1])),
                        0,0,360,255,-1)
            guard=cv2.GaussianBlur(guard,(5,5),1.0)
            # Restore only the tight oval around the sclera, not the
            # separate white background beneath the platypus.
            mask=np.maximum(mask,guard)

        if src.stem=='otter':
            # Reconstruct thin grey/white whisker strands whose pixels were
            # swallowed by the white-background key and median filtering.
            # Restrict the rescue to genuine fine detail beside the moving
            # muzzle, not the entire white canvas.
            gray=cv2.cvtColor(area,cv2.COLOR_RGB2GRAY).astype(np.float32)
            local_bg=cv2.GaussianBlur(gray,(0,0),sigmaX=5)
            detail=local_bg-gray
            yy,xx=np.indices((bh,bw))
            head=(mask>200)&(xx>bw*.55)&(yy>bh*.05)&(yy<bh*.47)&(lo<200)
            if np.any(head):
                nose_x=float(np.percentile(xx[head],99.5))
                at_tip=head&(xx>nose_x-8)
                nose_y=float(np.median(yy[at_tip])) if np.any(at_tip) else float(bh*.3)
                whisker_zone=(xx>nose_x-22)&(xx<nose_x+115)&(np.abs(yy-nose_y)<100)&(mask<180)
                fine=(detail>3.4)&(gray<252)&((hi-lo)<25)&whisker_zone
                strands=cv2.dilate(fine.astype(np.uint8),np.ones((2,2),np.uint8))>0
                strands &= whisker_zone
                rescued_whiskers+=int(np.sum(strands))
                # Preserve their anti-aliased edge without drawing solid white halos.
                mask[strands]=np.maximum(mask[strands],np.uint8(170))

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
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-y','-i',str(src),'-vn',
        '-af',f'atrim=start={start:.9f}:end={end:.9f},asetpts=PTS-STARTPTS,volume=2,alimiter=limit=0.97:attack=5:release=50:level=false:latency=true,apad,atrim=0:5',
        '-ar','48000','-ac','2','-c:a','pcm_f32le',str(audio)],check=True)
    data={'frames':FRAME_COUNT,'ranges':ranges,'contact':meta['original_contact']-meta['start']}
    if 'original_paw' in meta:data['pawContact']=meta['original_paw']-meta['start']
    print(src.stem,'source',f'{start:.3f}-{end:.3f}s','frames',FRAME_COUNT,'bundle',offset,'audio',audio.stat().st_size,'contact',data['contact'],'pawContact',data.get('pawContact'))
    if eye_scores:print('EYE_TRACK',src.stem,'min_correlation',round(min(eye_scores),3),'frames',len(eye_scores))
    if src.stem=='otter':print('WHISKER_RESCUE','pixels',rescued_whiskers)
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
