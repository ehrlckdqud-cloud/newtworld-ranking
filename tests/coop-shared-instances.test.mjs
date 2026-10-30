import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL('../coop/'+name,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
test('two cache versions share the validated password in subsequent room headers',async()=>{
 const nodes={testAccessDialog:{addEventListener(){},showModal(){},close(){}},testAccessForm:{},testPassword:{value:'test-only',focus(){},select(){}},testAccessError:{},testAccessSubmit:{}};
 const context=vm.createContext({document:{getElementById:id=>nodes[id]},siteHeaders:()=>({'X-NW-Site-Session':'session'}),claimSiteSession:async()=>{},fetch:async()=>({ok:true,json:async()=>({})})});
 const load=()=>vm.runInContext('(function(){'+source('test-access.mjs')+';return {requestTestAccess,testHeaders};})()',context);
 const entry=load(),room=load();const confirmed=entry.requestTestAccess({});await nodes.testAccessForm.onsubmit({preventDefault(){}});await confirmed;
 assert.equal(room.testHeaders()['X-NW-Test-Password'],'test-only');assert.equal(room.testHeaders()['X-NW-Site-Session'],'session');assert.equal(nodes.testPassword.value,'');
});
test('two audio module instances create only one music player and one set of listeners',()=>{
 let audios=0,listeners=0;const context=vm.createContext({Audio:class{constructor(){audios++;}},readVolume:()=>.45,saveVolume:(_,v)=>v,document:{addEventListener(){listeners++;},querySelector(){return null;}},window:{addEventListener(){listeners++;}}});
 const load=()=>vm.runInContext('(function(){'+source('lobby-audio.mjs')+';return lobbyAudio;})()',context);
 assert.equal(load(),load());assert.equal(audios,3);assert.equal(listeners,4);
});
