import {test} from 'node:test';
import assert from 'node:assert/strict';
import {roomError,needsReady,READY_REQUIRED} from '../coop/room-feedback.mjs';
test('duplicate membership explains both roles and another-browser restriction',()=>{const message=roomError(Error('MEMBER_ALREADY_IN_ROOM'));assert.match(message,/회원 계정/);assert.match(message,/다른 브라우저/);assert.match(message,/플레이어·관전자/);});
test('unready/disconnected active seats block launch with requested wording',()=>{assert.equal(READY_REQUIRED,'READY가 준비되지 않은 인원이 있습니다');assert.equal(needsReady([{ready:true,connected:true},{ready:false,connected:true}]),true);assert.equal(needsReady([{ready:true,connected:false}]),true);assert.equal(needsReady([{ready:true,connected:true},{ready:false,departed:true}]),false);});
