import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FiveSession} from '../../coop/native/five-session.mjs';
import {createGameDiagnostics} from '../../coop/game-diagnostics.mjs';
const profile=JSON.parse(fs.readFileSync(new URL('../../coop/native/profile.json',import.meta.url)));
function fixture(){
 const m={HEAPU8:new Uint8Array(65536),_nw_ram:()=>0},e=new FiveSession(m,profile,{playerCount:5});e.phase='playing';e.wb(0x10040c,3);
 for(let i=0;i<5;i++){const a=e.x.actors[i];e.players[i].state='active';e.wl(a,0x25022);e.wl(a+4,a);e.wl(a+8,a);e.ww(a+0x6c,i);}
 return e;
}
test('ownership repair changes only the wrong owner word and is idempotent',()=>{
 const e=fixture(),a=e.x.actors[1];e.ww(a+0x6c,0);const before=e.ram().slice();e.repairActiveOwners();before[(a+0x6c)&65535]=1;
 assert.deepEqual(e.ram(),before);assert.equal(e.events.length,1);e.repairActiveOwners();assert.equal(e.events.length,1);
 const d=createGameDiagnostics({now:()=>1});d.capture(e);assert.deepEqual(d.report().ownerRepairs,[{frame:0,slot:2,previousOwner:0,routine:0x25022,mission:3,substage:0}]);
});
for(const scenario of ['attract','reset','departed','spectator','enemy','deleted','unlinked'])test(`does not alter ${scenario} objects`,()=>{
 const e=fixture(),a=e.x.actors[1];e.ww(a+0x6c,0);
 if(scenario==='attract')e.phase='attract';if(scenario==='reset')e.wb(0x10040c,0x55);
 if(scenario==='departed')e.players[1].departed=true;if(scenario==='spectator')e.players[1].state='spectator';
 if(scenario==='enemy')e.wl(a,0xa1f80);if(scenario==='deleted')e.wl(a,0x567a);if(scenario==='unlinked')e.wl(a+8,0);
 const before=e.ram().slice();e.repairActiveOwners();assert.deepEqual(e.ram(),before);assert.equal(e.events.length,0);
});
