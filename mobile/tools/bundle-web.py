from pathlib import Path
from html.parser import HTMLParser
import re, shutil
root=Path(__file__).resolve().parents[2];out=root/'mobile/shared/web';out.mkdir(exist_ok=True)
s=(root/'index.html').read_text();start=s.index('<div id="nwMusicDock"')
class End(HTMLParser):
 def __init__(self): super().__init__();self.depth=0;self.end=None
 def handle_starttag(self,tag,attrs):
  if tag=='div':self.depth+=1
 def handle_endtag(self,tag):
  if tag=='div':
   self.depth-=1
   if self.depth==0 and self.end is None:self.end=self.getpos()
p=End();p.feed(s[start:]);line,col=p.end;lines=s[start:].splitlines(True);end=sum(map(len,lines[:line-1]))+col+6
markup=s[start:start+end]
styles='\n'.join(re.findall(r'<style[^>]*>(.*?)</style>',s,re.S))
(out/'index.html').write_text('''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>뉴트월드</title><link rel="stylesheet" href="player.css"></head><body>'''+markup+'''<script src="catalog.js"></script><script src="player.js"></script><script src="theme.js"></script></body></html>''')
(out/'player.css').write_text(styles+'''\n#nwMusicDock{display:block!important}#nwCollapseBtn,#nwBackgroundHelp{display:none!important}#nwLyricsPanel{display:block}#nwNativeStatus{position:fixed;top:48px;left:18px;right:18px;z-index:100000;color:#e5f3e9;background:#163b2c;padding:6px 12px;border-radius:12px;font-size:12px}body{background:#102b20}''')
for name in ['catalog.js','player.js']:shutil.copy(root/'mobile/shared'/name,out/name)
shutil.copy(root/'assets/music/music-theme.js',out/'theme.js')
dest=root/'mobile/android/app/src/main/assets/web';shutil.rmtree(dest,ignore_errors=True);shutil.copytree(out,dest)
with (out/'player.css').open('a') as css:
 css.write("""
#nwNativeEq{width:calc(100vw - 36px);max-width:420px;box-sizing:border-box;border:1px solid #6b987a;border-radius:20px;padding:22px;background:#102b20;color:#e9f6ec;max-height:90dvh;overflow:auto}#nwNativeEq::backdrop{background:#0009}#nwNativeEq h2{margin-top:0;font-size:20px}.nw-eq-band{display:grid;grid-template-columns:65px 1fr 55px;gap:10px;align-items:center;min-height:56px;font-size:12px}.nw-eq-band input{width:100%;min-height:44px;accent-color:#b4e5ba;touch-action:pan-y}.nw-eq-band output{text-align:right}.nw-eq-actions{display:flex;justify-content:space-between;margin-top:16px}.nw-eq-actions button{min-height:44px;border:1px solid #7ca98b;border-radius:12px;padding:8px 20px;background:#204b35;color:#e9f6ec}#nwEqAvailability{font-size:12px;color:#a7c7b1}#nwNativeStatus[hidden]{display:none}#nwNativeStatus{border:1px solid #6b987a;cursor:pointer}#nwTrackMenu .nw-track-menu-row{display:flex}#nwTrackMenu .nw-track-delete{width:50px;flex:0 0 50px}#nwMusicDock .nw-tools{flex-wrap:wrap}
""")
shutil.copy(out/'player.css',dest/'player.css')
print('Bundled existing player HTML/CSS/theme for Android and iOS.')
