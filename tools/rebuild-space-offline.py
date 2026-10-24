"""Rebuild a self-contained offline release from a saved offline HTML and this source tree."""
import json,re,sys
from pathlib import Path
source,out=map(Path,sys.argv[1:3]);repo=Path(__file__).resolve().parents[1]
html=source.read_text();marker='const embeddedModules=';start=html.index(marker)+len(marker);modules,size=json.JSONDecoder().raw_decode(html[start:]);end=start+size
for name in list(modules):
 if name not in ['space-entry.js','space-access.js']:modules[name]=(repo/'draw'/name).read_text()
queue=list(modules)
while queue:
 name=queue.pop()
 for ref in re.findall(r'''\bfrom\s*['"]([^'"]+)['"]''',modules[name]):
  dep=ref.split('?')[0].removeprefix('./')
  if dep not in modules:modules[dep]=(repo/'draw'/dep).read_text();queue.append(dep)
encoded=json.dumps(modules,ensure_ascii=False,separators=(',',':')).replace('</script','<\\/script')
html=html[:start]+encoded+html[end:]
version=re.search(r'v(\d+)-Offline',out.name)
if version:html=re.sub(r'오프라인 v\d+', '오프라인 v'+version[1],html)
out.write_text(html)
print(json.dumps({'output':str(out),'bytes':out.stat().st_size,'modules':len(modules)}))
