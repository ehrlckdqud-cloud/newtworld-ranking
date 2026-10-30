import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../coop/play.mjs',import.meta.url),'utf8');
test('reset event clears the active game and returns all roles to operations',async()=>{
 const start=source.indexOf(" if(e.type==='native-reset')"),end=source.indexOf("\n",start),handler=source.slice(start,end);
 for(const slot of [1,2,6]){let disposed=0,loaded=0,away=null;const c={receivedCommands:new Map(),commandResults:new Map(),migrationRetry:null,e:{type:'native-reset',players:[]},session:{slot},roomPhase:'native',coreGeneration:0,handledCommands:new Set([1]),startApprovals:new Set([1]),lastScoreRead:1,scoreSample:[1],playing:true,hasGame:true,completed:true,away:false,roster:[],disposeGame:()=>disposed++,$:()=>({disabled:true,onclick:async()=>loaded++}),setAway:v=>away=v,render:()=>{}};await vm.runInNewContext('(async()=>{'+handler+'})()',c);assert.equal(c.roomPhase,'lobby');assert.equal(c.hasGame,false);assert.equal(c.playing,false);assert.equal(c.completed,false);assert.equal(disposed,1);assert.equal(away,true);assert.equal(loaded,1);}
});
