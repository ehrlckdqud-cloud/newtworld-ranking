import test from 'node:test';
import assert from 'node:assert/strict';
import {pspSolo} from '../lib/game/psp-solo.mjs';
const site='https://games.example',lobby='https://ehrlckdqud-cloud.github.io';
const env={NW_PSP6_MASTER:btoa('0123456789abcdef0123456789abcdef')};
test('isolated PSP admission limits each encrypted ticket to a single verified launch',async()=>{
 let calls=[];
 const gateway=async r=>{calls.push([new URL(r.url).pathname,await r.json(),r.headers.get('x-nw-site-session')]);return Response.json({ok:true});};
 const make=(origin)=>new Request(site+'/psp6/',{method:'POST',headers:{origin},body:new URLSearchParams({memberToken:'member-test',device:'dev',session:'verified-session',connection:'verified-tab'})});
 assert.equal((await pspSolo(make(site),env,gateway)).status,403);
 assert.equal((await pspSolo(make(lobby),env,()=>Response.json({error:'login'},{status:401}))).status,401);
 const first=await pspSolo(make(lobby),env,gateway),markup=await first.text();
 assert.equal(first.headers.get('cross-origin-opener-policy'),'same-origin');
 assert.equal(first.headers.get('cross-origin-embedder-policy'),'require-corp');
 assert.ok(!markup.includes('member-test'));
 const launch=markup.match(/data-launch="([a-f0-9-]+)"/)[1],cookie=first.headers.get('set-cookie').split(';')[0];
 assert.ok(!cookie.includes('member-test'));assert.match(first.headers.get('set-cookie'),/HttpOnly; Secure/);
 const req=(action,id=launch,c=cookie,origin=site)=>new Request(site+'/psp6/api/'+id+'/'+action,{method:'POST',headers:{origin,cookie:c}});
 assert.equal((await pspSolo(req('package',crypto.randomUUID()),env,gateway)).status,401);
 assert.equal((await pspSolo(req('package',launch,cookie+'x'),env,gateway)).status,401);
 assert.equal((await pspSolo(req('charge',launch,cookie,lobby),env,gateway)).status,403);
 const manifest=await (await pspSolo(req('package'),env,gateway)).json();assert.equal(manifest.price,500);assert.ok(manifest.chunks.length>1);assert.equal(manifest.key.length,43);
 assert.equal(manifest.bootState.rawBytes,41943064);
 assert.equal((await pspSolo(req('title',launch,''),env,gateway)).status,401);
 assert.equal((await pspSolo(req('title'),env,gateway)).status,503);
 const restored=await pspSolo(req('title'),{...env,PSP_ASSETS:{get:async key=>{
  assert.equal(key,'mslug6/v1/'+manifest.bootState.sha);return {size:manifest.bootState.bytes,body:'fixture'};
 }}},gateway);
 assert.equal(await restored.text(),'fixture');assert.equal(restored.headers.get('cache-control'),'no-store');
 const reopen=new Request(site+'/psp6/api/'+launch+'/player',{headers:{cookie}});
 assert.match(await (await pspSolo(reopen,env,gateway)).text(),new RegExp(launch));
 assert.ok(!calls.some(c=>c[0]==='/api/arcade-entry'));
 for(let i=0;i<2;i++)assert.equal((await pspSolo(req('charge'),env,gateway)).status,200);
 const debits=calls.filter(c=>c[0]==='/api/arcade-entry');assert.equal(debits.length,2);
 for(const [,body,session] of debits){assert.equal(body.launch,launch);assert.equal(body.game,'mslug6');assert.equal(session,'verified-session');assert.equal(body.member.token,'member-test');}
});

test('XX tickets open the XX package and bill only the matching game',async()=>{
 const settings={...env,NW_PSPXX_MASTER:btoa('xx-private-test-key-012345678901')};
 const calls=[];
 const verify=async req=>{calls.push([new URL(req.url).pathname,await req.json()]);return Response.json({ok:true});};
 const begin=await pspSolo(new Request(site+'/pspxx/',{method:'POST',headers:{origin:lobby},body:new URLSearchParams({memberToken:'test'})}),settings,verify);
 const html=await begin.text(),launch=html.match(/data-launch="([a-f0-9-]+)"/)[1],cookie=begin.headers.get('set-cookie').split(';')[0];
 assert.match(html,/메탈슬러그 XX/);
 const call=(path,action)=>pspSolo(new Request(site+path+'/api/'+launch+'/'+action,{method:'POST',headers:{origin:site,cookie}}),settings,verify);
 assert.equal((await call('/psp6','package')).status,401);
 const manifest=await (await call('/pspxx','package')).json();
 assert.equal(manifest.game,'mslugxx');assert.equal(manifest.price,500);
 assert.ok(manifest.chunks.every(c=>c.path.startsWith('/arcade-runtime/mslugxx/data/')));
 assert.equal((await call('/pspxx','charge')).status,200);
 assert.ok(calls.every(([,body])=>body.game==='mslugxx'));
 assert.equal(calls.filter(([path])=>path==='/api/arcade-entry').length,1);
});
