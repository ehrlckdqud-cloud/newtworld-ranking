import test from 'node:test';
import assert from 'node:assert/strict';
import {makeResults} from '../coop/native-results.mjs';

test('results retain the last scene without synchronous canvas pixel readback',()=>{
 let controller=0xed652,scene=1,surfaces=0,hud=0;
 const restored=[];
 const ctx={canvas:{},drawImage(surface){restored.push(surface.scene);},getImageData(){throw Error('synchronous readback');},putImageData(){throw Error('full frame upload');},save(){},restore(){},fillRect(){},strokeRect(){}};
 const module={HEAPU8:new Uint8Array(256),_nw_glyph(){return 0;}};
 const engine={playerCount:1,long(a){return a===0x10039c?controller:0;},byte(){return 1;},word(){return 0;}};
 const createSurface=()=>{surfaces++;const s={scene:null};s.getContext=()=>({drawImage(){s.scene=scene;},createImageData(){return {data:new Uint8Array(256)};},putImageData(){}});return s;};
 const draw=makeResults(module,engine,ctx,createSurface);
 assert.equal(draw(),false);assert.equal(surfaces,1);
 scene=2;draw();assert.equal(surfaces,1,'reuse background during native transition');
 controller=0xed682;assert.equal(draw(()=>hud++),true);assert.equal(restored[0],2);assert.equal(hud,1);
 controller=0;draw();controller=0xed682;assert.equal(draw(),false,'do not reuse previous mission background');
 controller=0xed652;scene=3;draw();controller=0xed682;const previous=restored.length;draw();assert.equal(restored[previous],3);
});
