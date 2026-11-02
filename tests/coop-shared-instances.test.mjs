import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL('../coop/'+name,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
test('public entry preserves site-session headers without a staff password across module instances',async()=>{
 let request;
 const context=vm.createContext({siteHeaders:()=>({'X-NW-Site-Session':'session'}),AbortSignal,fetch:async(url,options)=>{request=options;return {ok:true,json:async()=>({})};}});
 const load=()=>vm.runInContext('(function(){'+source('test-access.mjs')+';return {requestTestAccess,testHeaders};})()',context);
 const entry=load(),room=load();await entry.requestTestAccess({token:'member',device:'device'});
 assert.equal(room.testHeaders()['X-NW-Test-Password'],undefined);
 assert.equal(room.testHeaders()['X-NW-Site-Session'],'session');
 assert.equal(request.headers['X-NW-Test-Password'],undefined);
 assert.deepEqual(JSON.parse(request.body),{member:{token:'member',device:'device'}});
});
test('legacy relay gate is reported as pending release and membership rejection still fails closed',async()=>{
 let error='TEST_PASSWORD_REQUIRED';
 const context=vm.createContext({siteHeaders:()=>({}),AbortSignal,fetch:async()=>({ok:false,json:async()=>({error})})});
 const entry=vm.runInContext('(function(){'+source('test-access.mjs')+';return {requestTestAccess};})()',context);
 await assert.rejects(entry.requestTestAccess({}),/MEMBER_RELEASE_PENDING/);
 error='NEWTWORLD_LOGIN_REQUIRED';await assert.rejects(entry.requestTestAccess({}),/NEWTWORLD_LOGIN_REQUIRED/);
});
test('two audio module instances create only one music player and one set of listeners',()=>{
 let audios=0,listeners=0;const context=vm.createContext({Audio:class{constructor(){audios++;}},readVolume:()=>.45,saveVolume:(_,v)=>v,document:{addEventListener(){listeners++;},querySelector(){return null;}},window:{addEventListener(){listeners++;}}});
 const load=()=>vm.runInContext('(function(){'+source('lobby-audio.mjs')+';return lobbyAudio;})()',context);
 assert.equal(load(),load());assert.equal(audios,3);assert.equal(listeners,4);
});
test('button and launch effect levels persist independently of waiting music',()=>{
 const storage=new Map(),players=[];
 const context=vm.createContext({Audio:class{constructor(){players.push(this);}},readVolume:(key,fallback)=>storage.get(key)??fallback,saveVolume:(key,value)=>{storage.set(key,value);return value;},document:{addEventListener(){},querySelector(){return null;}},window:{addEventListener(){}}});
 const factory=vm.runInContext('(function(){'+source('lobby-audio.mjs')+';return createLobbyAudio;})()',context);
 const sound=factory();sound.setEffectsVolume(.2);
 assert.equal(players[3].volume,.45);assert.equal(players[4].volume,.2);assert.equal(players[5].volume,.2);
 const restored=factory();assert.equal(restored.effectsVolume,.2);assert.equal(restored.volume,.45);
});

test('coin purchase sound follows effect volume including mute without changing music',()=>{
 const src=readFileSync(new URL('../coop/play.mjs',import.meta.url),'utf8');
 const code=src.slice(src.indexOf('function chime(){'),src.indexOf('function paintCredits()'));
 let played=0;const coinSound={play(){played++;return Promise.resolve();}},lobbyAudio={effectsVolume:0,volume:.45};
 const c=vm.createContext({coinSound,lobbyAudio});vm.runInContext(code,c);
 c.chime();assert.equal(coinSound.volume,0);lobbyAudio.effectsVolume=.3;c.chime();assert.equal(coinSound.volume,.3);assert.equal(lobbyAudio.volume,.45);assert.equal(played,2);
});
