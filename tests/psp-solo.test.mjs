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
 assert.ok(!calls.some(c=>c[0]==='/api/arcade-entry'));
 for(let i=0;i<2;i++)assert.equal((await pspSolo(req('charge'),env,gateway)).status,200);
 const debits=calls.filter(c=>c[0]==='/api/arcade-entry');assert.equal(debits.length,2);
 for(const [,body,session] of debits){assert.equal(body.launch,launch);assert.equal(body.game,'mslug6');assert.equal(session,'verified-session');assert.equal(body.member.token,'member-test');}
});
