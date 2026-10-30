import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {roomError} from '../coop/room-feedback.mjs';
const src=readFileSync(new URL('../coop/play.mjs',import.meta.url),'utf8');
const code=src.slice(src.indexOf('async function safe('),src.indexOf('async function post('));
function setup(join){const nodes={create:{disabled:false},cancelCreate:{disabled:false},createFeedback:{}};const c={roomError,join,entryRole:'viewer',window:{nwPendingRoomTitle:'old title'},$:id=>nodes[id],note:s=>c.notice=s};vm.createContext(c);vm.runInContext(code,c);return {c,nodes};}
test('create room sends once, reports pending, and restores controls after success',async()=>{let finish,calls=0;const {c,nodes}=setup(create=>{assert.equal(create,true);calls++;return new Promise(r=>finish=r);});const pending=c.createRoom();await c.createRoom();assert.equal(calls,1);assert.equal(nodes.create.disabled,true);assert.match(nodes.createFeedback.textContent,/만드는 중/);assert.equal(c.entryRole,'player');assert.equal(c.window.nwPendingRoomTitle,null);finish();await pending;assert.equal(nodes.create.disabled,false);assert.equal(nodes.cancelCreate.disabled,false);assert.equal(nodes.createFeedback.textContent,'');});
test('create failures are visible inside dialog and permit retry',async()=>{let calls=0;const {c,nodes}=setup(async()=>{if(++calls===1)throw Error('SERVER_FULL');});await c.createRoom();assert.match(nodes.createFeedback.textContent,/SERVER_FULL/);assert.equal(nodes.create.disabled,false);await c.createRoom();assert.equal(calls,2);assert.equal(nodes.createFeedback.textContent,'');});
test('common async action wrapper exists and consumes rejected promises',async()=>{const {c}=setup(()=>{});assert.equal(await c.safe(Promise.resolve(42)),42);await c.safe(Promise.reject(Error('ROOM_NOT_FOUND')));assert.match(c.notice,/종료되었거나/);});
test('create click and Enter use the same creation handler',()=>{assert.match(src,/\$\('create'\)\.onclick=e=>\{e.preventDefault\(\);void createRoom\(\);\}/);assert.match(src,/\$\('joinForm'\)\.onsubmit=e=>\{e.preventDefault\(\);void createRoom\(\);\}/);});
