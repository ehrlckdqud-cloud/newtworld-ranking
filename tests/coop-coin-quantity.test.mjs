import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validQuantity,COIN_PRICE} from '../coop/coin-purchase.mjs';
test('coin quantity bounds reject fractional, empty, negative and oversized input',()=>{for(const v of ['',0,-1,1.5,100,'bad'])assert.equal(validQuantity(v),null);assert.equal(validQuantity('3')*COIN_PRICE,600);assert.equal(validQuantity(99),99);});
