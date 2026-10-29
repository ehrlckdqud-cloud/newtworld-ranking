import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';
test('authentication singleton imports use one URL across entry, lobby, play and rankings',()=>{
 const refs=new Map();for(const file of readdirSync(new URL('../coop/',import.meta.url)).filter(f=>f.endsWith('.mjs'))){const src=readFileSync(new URL('../coop/'+file,import.meta.url),'utf8');for(const [,url]of src.matchAll(/from\s*['"]([^'"]*(?:site-session|test-access)\.mjs[^'"]*)['"]/g)){const name=url.split('?')[0];if(!refs.has(name))refs.set(name,new Set());refs.get(name).add(url);}}
 assert.equal(refs.size,2);for(const [name,urls]of refs)assert.equal(urls.size,1,`${name} must share state: ${[...urls]}`);
});
