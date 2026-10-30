import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';
test('stateful browser modules have one URL identity across all coop entry points',()=>{
 const files=readdirSync(new URL('../coop/',import.meta.url)).filter(f=>/\.(mjs|html)$/.test(f));
 for(const module of ['test-access','site-session','lobby-audio','play']){
  const urls=new Set();for(const file of files){const s=readFileSync(new URL('../coop/'+file,import.meta.url),'utf8');for(const m of s.matchAll(new RegExp('(?:\\./)?'+module+'\\.mjs(?:\\?v=\\d+)?','g')))urls.add(m[0].replace(/^\.\//,''));}
  assert.equal(urls.size,1,module+': '+[...urls]);
 }
});
