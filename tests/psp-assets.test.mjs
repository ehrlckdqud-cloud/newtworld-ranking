import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash,createHmac} from 'node:crypto';
import {pspAssets} from '../lib/game/psp-assets.mjs';
import inventory from '../lib/game/psp-assets.json' with {type:'json'};
test('the PSP storage inventory matches every game and runtime byte',()=>{
 for(const [name,spec] of Object.entries(inventory)){
  const bytes=fs.readFileSync(new URL('../resources/psp6/'+name,import.meta.url));
  assert.equal(bytes.length,spec.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),spec.sha);
 }
});
test('only signed exact assets can be published and retries are idempotent',async()=>{
 const name='ejs/loader.js',spec=inventory[name],master=Buffer.alloc(32,0x44),objects=new Map();
 const env={NW_PSP6_MASTER:master.toString('base64'),PSP_ASSETS:{
  head:async k=>objects.has(k)?{}:null,get:async k=>objects.has(k)?{body:objects.get(k)}:null,put:async(k,v)=>objects.set(k,v)
 }};
 const exp=Math.floor(Date.now()/1000)+60,url='https://nw.test/psp6/publish/'+name;
 const sig=createHmac('sha256',master).update(['publish:mslug6:v1',name,spec.sha,exp].join('\n')).digest('hex');
 const put=(buf,proof=sig)=>pspAssets(new Request(url,{method:'PUT',body:buf,headers:{'content-length':String(buf.length),'x-nw-expires':String(exp),'x-nw-asset-proof':proof}}),env);
 const data=fs.readFileSync(new URL('../resources/psp6/'+name,import.meta.url));
 assert.equal((await put(data,'bad')).status,403);assert.equal((await put(Buffer.alloc(data.length))).status,400);
 assert.equal((await put(data)).status,201);assert.equal((await put(data)).status,204);assert.equal(objects.size,1);
 const res=await pspAssets(new Request('https://nw.test/arcade-runtime/mslug6/'+name),env);
 assert.equal(res.status,200);assert.deepEqual(Buffer.from(await res.arrayBuffer()),data);
});
