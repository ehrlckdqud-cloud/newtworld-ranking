import test from 'node:test';
import assert from 'node:assert/strict';
import {makeResults} from '../coop/native-results.mjs';

test('results retain the last scene without synchronous canvas pixel readback',()=>{
 let controller=0xed652,scene=1,surfaces=0,hud=0,panelDraws=0,remaining=2;
 const restored=[];
 const ctx={canvas:{},drawImage(surface){restored.push(surface.scene);},getImageData(){throw Error('synchronous readback');},putImageData(){throw Error('full frame upload');},save(){},restore(){},fillRect(){},strokeRect(){}};
 const module={HEAPU8:new Uint8Array(256),_nw_glyph(){return 0;}};
 const engine={playerCount:1,long(a){return a===0x10039c?controller:0;},byte(){return 1;},word(){return remaining;}};
 const createSurface=()=>{surfaces++;const s={scene:null};s.getContext=()=>({drawImage(){s.scene=scene;},clearRect(){panelDraws++;},save(){},restore(){},fillRect(){},strokeRect(){},createImageData(){return {data:new Uint8Array(256)};},putImageData(){}});return s;};
 const draw=makeResults(module,engine,ctx,createSurface);
 assert.equal(draw(),false);assert.equal(surfaces,1);
 scene=2;draw();assert.equal(surfaces,1,'reuse background during native transition');
 controller=0xed682;assert.equal(draw(()=>hud++),true);assert.equal(restored[0],2);assert.equal(hud,1);
 assert.equal(panelDraws,1);
 const created=surfaces;draw(()=>hud++);assert.equal(panelDraws,1,'unchanged counters reuse the panel');assert.equal(surfaces,created);assert.equal(hud,2,'HUD still updates each frame');
 remaining=1;draw();assert.equal(panelDraws,2,'native counter changes repaint the panel');
 controller=0;draw();controller=0xed682;assert.equal(draw(),false,'do not reuse previous mission background');
 controller=0xed652;scene=3;draw();controller=0xed682;const previous=restored.length;draw();assert.equal(restored[previous],3);
});
