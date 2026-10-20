'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
let clock=Date.parse('2026-10-20T04:00:00Z');class Clock extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
const box={window:{},Date:Clock,console};vm.createContext(box);vm.runInContext(html.slice(html.indexOf('const OPERATOR_ROLES='),html.indexOf('let gradedOnly=')),box);
function row(patch={}){return{memberId:'member-a',role:'회원',rank:3,seasonTotal:10,rankMovementPrevious:7,rankMovementType:'up',rankMovementRank:3,rankMovementMonth:'2026-10',...patch};}
function meta(latest,base,movement){box.window.NWLatestRankingMeta330={ok:true,month:latest.slice(0,7),latestChatDate:latest,movementBaseDate:base};box.window.NWRankMovements297=movement?[movement]:[];}
function live(patch={}){return{id:'member-a',type:'same',previous:3,rank:3,month:'2026-10',...patch};}
meta('2026-10-19','2026-10-19',live());assert.equal(box.rankMovementState342(row()).text,'▲4');assert.equal(box.rankMovementState342(row()).source,'sheet');assert.ok(!box.rankMovementState342(row()).label.includes('2026.10.19'));
// Calendar rollover without an import must preserve the same import-time result.
clock=Date.parse('2026-10-21T04:00:00Z');assert.equal(box.rankMovementState342(row()).text,'▲4');
meta('2026-10-20','2026-10-19',live({type:'down',previous:1,rank:3}));assert.equal(box.rankMovementState342(row({rankMovementPrevious:1,rankMovementType:'down'})).text,'▼2');
// Repeated imports on the 20th keep the saved 19th-day baseline.
assert.equal(box.rankMovementState342(row({rank:5,rankMovementRank:5,rankMovementPrevious:1,rankMovementType:'down'})).text,'▼4');
// The next imported day changes the comparison, rather than wall-clock polling.
meta('2026-10-21','2026-10-20',live({type:'up',previous:5,rank:3}));assert.equal(box.rankMovementState342(row({rankMovementPrevious:5})).text,'▲2');
// A valid API comparison is a fallback only when current sheet movement columns are unavailable.
const missing=row({rankMovementType:'',rankMovementPrevious:0,rankMovementRank:0});assert.equal(box.rankMovementState342(missing).source,'live');assert.equal(box.rankMovementState342(missing).text,'▲2');assert.ok(box.rankMovementState342(missing).label.includes('2026.10.20'));
meta('2026-10-19','2026-10-19',live());assert.equal(box.rankMovementState342(missing).source,'baseline');
meta('2026-10-19','2026-10-20',live());assert.equal(box.rankMovementState342(missing).source,'baseline');
// NEW, unchanged, zero points, staff and stale ranks.
meta('2026-10-19','2026-10-18',live({type:'new',previous:0}));assert.equal(box.rankMovementState342(row({rankMovementType:'new',rankMovementPrevious:0})).text,'NEW');
assert.equal(box.rankMovementState342(row({rankMovementType:'same',rankMovementPrevious:3})).text,'—');
assert.equal(box.rankMovementBadge(row({seasonTotal:0})),'');assert.equal(box.rankMovementBadge(row({role:'방장'})),'');assert.equal(box.rankMovementBadge(row({role:'부방장'})),'');
meta('2026-10-19','2026-10-18',live({rank:8}));assert.equal(box.rankMovementState342(row({rankMovementRank:8})).source,'baseline');
// Before November's first import, October's last imported batch remains visible.
clock=Date.parse('2026-11-01T01:00:00Z');meta('2026-10-31','2026-10-31',live());assert.equal(box.rankMovementState342(row()).text,'▲4');
console.log('PASS: daily import baseline, midnight/month rollover, updated imports, API fallback, NEW/same, staff and zero-score exclusions');
