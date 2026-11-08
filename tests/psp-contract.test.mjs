import test from 'node:test';
import assert from 'node:assert/strict';
import {assertPspSupport,validatePspPackage,validateArcadeCharge} from '../coop/psp-contract.mjs';

const api='https://newtworld-ms3-coop-5p.ehrlckdqud.chatgpt.site';
test('Rejects non-isolated PSP browsers before the 500-gem transaction',()=>{
 assert.throws(()=>assertPspSupport({isSecureContext:true,crossOriginIsolated:false,SharedArrayBuffer:undefined,WebAssembly:{}}),/COOP\/COEP/);
 assert.throws(()=>assertPspSupport({isSecureContext:false}),/HTTPS/);
 assert.doesNotThrow(()=>assertPspSupport({isSecureContext:true,crossOriginIsolated:true,SharedArrayBuffer:class {},WebAssembly:{}}));
});
test('Accepts same-origin temporary PSP URLs only',()=>{
 assert.equal(validatePspPackage({game:'mslug6',url:'/api/psp-package/stream/opaque-ticket'},api),api+'/api/psp-package/stream/opaque-ticket');
 assert.throws(()=>validatePspPackage({game:'mslug6',url:'https://evil.invalid/iso'},api),/승인된 서버/);
 assert.throws(()=>validatePspPackage({game:'mslug5',url:'/ok'},api),/패키지/);
 assert.throws(()=>validatePspPackage({game:'mslug6',url:'http://example.com/iso'},api),/승인된 서버/);
});
test('Paid PSP launches are bound to original launch id and exact price',()=>{
 assert.equal(validateArcadeCharge({ok:true,game:'mslug6',launch:'launch-1',cost:500},'launch-1'),true);
 assert.throws(()=>validateArcadeCharge({ok:true,game:'mslug6',launch:'launch-2',cost:500},'launch-1'),/입장료/);
 assert.throws(()=>validateArcadeCharge({ok:true,game:'mslug6',launch:'launch-1',cost:0},'launch-1'),/입장료/);
});
