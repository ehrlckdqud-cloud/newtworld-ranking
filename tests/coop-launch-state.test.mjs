import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../coop/play.mjs',import.meta.url),'utf8');
const apply=source.split('\n').find(l=>l.startsWith('function applyLaunch('));
test('three clients display the same start/failure state once, then unlock',()=>{
 const clients=Array.from({length:3},()=>{const c={remoteLaunch:null,launchNotices:new Set(),notices:[],locked:[],note(){},showRoomNotice(m){this.notices.push(m);},render(){this.locked.push(!!this.remoteLaunch);}};c.showRoomNotice=m=>c.notices.push(m);c.render=()=>c.locked.push(!!c.remoteLaunch);vm.createContext(c);vm.runInContext(apply,c);return c;});
 for(const c of clients){c.applyLaunch({attempt:'one',host:'host',status:'starting'});assert.equal(c.remoteLaunch.status,'starting');c.applyLaunch({attempt:'one',status:'failed',message:'동일한 실패 안내'});c.applyLaunch({attempt:'one',status:'failed',message:'동일한 실패 안내'});assert.equal(c.notices.length,1);assert.equal(c.remoteLaunch,null);assert.deepEqual(c.locked,[true,false,false]);}
});
