"""Pack the approved source assets into one verified sprite atlas and lean clips.
Usage: python tools/build-space-assets.py /absolute/path/space-escape-pack-v1
"""
from pathlib import Path
import json,sys,hashlib,shutil,math
from PIL import Image
root=Path(__file__).resolve().parents[1];source=Path(sys.argv[1]);out=root/'draw/space-assets';out.mkdir(exist_ok=True,parents=True);m=json.loads((source/'manifest.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
choices={'small':('small-move','small-hurt','small-destroy-action'), 'large':('large-move','large-hurt','large-destroy-action'),'ufo':('ufo-move','ufo-hurt','ufo-destroy-action'),'ring':('monster-move','monster-hurt','monster-destroy-action'),'alien':('alien-active-move','alien-active-hurt','alien-active-destroy-action')}
clips={};images=set()
def clip(name,kind,gens=None,start=None,end=None):
 p=m['profiles'][name];frames=[]
 for f in p['frames'][start:end]:
  parts=[q for q in f['parts'] if (gens is None or q['generation'] in gens) and q['generation'] not in p.get('presentation_excluded_generations',[])]
  # Host movement is independent of the original capture camera; source part order/pixels remain intact.
  if kind=='body' and parts:
   cx=(min(q['left'] for q in parts)+max(q['left']+q['image_width'] for q in parts))/2;cy=(min(q['top'] for q in parts)+max(q['top']+q['image_height'] for q in parts))/2
  else:cx=cy=0
  frames.append({'parts':[[q['path'],q['left']-cx,q['top']-cy,[c['image_x'] for c in q['columns']]] for q in parts]})
  images.update(q['path'] for q in parts)
 return {'frames':frames,'hz':m['frame_clock']['hz'],'sounds':p['sound_events'] if start is None else [],'source_profile':name}
for enemy,(normal,hurt,death) in choices.items():
 clips[enemy+'-move']=clip(normal,'body',{0});clips[enemy+'-hurt']=clip(hurt,'body',{0});dg={0,10} if enemy=='ring' else ({0} if enemy in ['ufo','alien'] else None);clips[enemy+'-death']=clip(death,'death',dg)
for enemy,name,gen in [('ring','monster-move',2),('ufo','ufo-move',1),('alien','alien-active-move',2)]:
 c=clip(name,'body',{gen});c['frames']=[f for f in c['frames'] if f['parts']];assert c['frames'];c['sounds']=[];clips[enemy+'-shot']=c
# Shelf layout, two-pixel padding prevents neighboring sprites bleeding at scale.
placements={};x=y=rowheight=0;width=2048
for path in sorted(images,key=lambda p:(-Image.open(source/p).height,p)):
 im=Image.open(source/path);w,h=im.size
 if x+w+2>width:x=0;y+=rowheight+2;rowheight=0
 placements[path]=[x,y,w,h];x+=w+2;rowheight=max(rowheight,h)
height=y+rowheight;atlas=Image.new('RGBA',(width,height))
for path,rect in placements.items():
 im=Image.open(source/path).convert('RGBA');atlas.paste(im,(rect[0],rect[1]));assert atlas.crop((rect[0],rect[1],rect[0]+rect[2],rect[1]+rect[3])).tobytes()==im.tobytes()
atlas.save(out/'sprites.png',optimize=True)
for c in clips.values():
 for f in c['frames']:
  f['parts']=[[*placements[path],left,top,cols] for path,left,top,cols in f['parts']]
sounds={}
for sid,s in m['sounds'].items():
 name=s['command'][2:]+'.wav';shutil.copy2(source/s['path'],out/name);assert sha(source/s['path'])==sha(out/name);sounds[sid]={'url':name,'latency':s['latency_seconds'],'duration':s['frame_count']/s['sample_rate'],'command':s['command']}
data={'version':1,'source_manifest_sha256':sha(source/'manifest.json'),'atlas':{'url':'sprites.png','width':width,'height':height,'sha256':sha(out/'sprites.png')},'clips':clips,'sounds':sounds,'scope':'Approved native art/audio. Host owns movement, HP, collision, spawning and survival draw rules. H pickups excluded.'}
(out/'assets.json').write_text(json.dumps(data,separators=(',',':'),ensure_ascii=False))
proof={'originalPartImages':len(images),'pixelExactAtlasPatches':len(placements),'atlasSize':[width,height],'sourceManifest':data['source_manifest_sha256'],'atlasSHA256':data['atlas']['sha256'],'clips':len(clips),'sounds':len(sounds),'HDropExcluded':True};(out/'provenance.json').write_text(json.dumps(proof,indent=2));shutil.copytree(source/'third-party',out/'third-party',dirs_exist_ok=True);print(proof)
