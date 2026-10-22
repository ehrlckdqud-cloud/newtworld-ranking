const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),index=fs.readFileSync(path.join(root,'draw/index.html'),'utf8');
const entry=index.match(/"lfP87":"\.\/(gameApp\.[a-f0-9]+\.js)"/)[1];
const source=fs.readFileSync(path.join(root,'draw',entry),'utf8');
function moduleSource(id){const start=source.indexOf(`i("${id}",`),end=source.indexOf('),i("',start+5);assert(start>=0&&end>start);return source.slice(start,end+1)}
const modules={},factory={axis:'x',goalY:26,bounds:{minX:-20,maxX:112},entities:[]};
const context={Math,Number,i:(id,fn)=>{const m={exports:{}};fn(m,m.exports);modules[id]=m.exports},
 t:(obj,key,get)=>Object.defineProperty(obj,key,{get}),
 e:id=>id==='6WugS'?{luckyFactory:factory}:id==='6zPEq'?{__decorate(){}}:id==='ldESn'?{initialZoom:20}:id==='bjMGp'?{bound(){}}:assert.fail('Unexpected dependency '+id)};
vm.createContext(context);vm.runInContext(moduleSource('2w23s'),context);vm.runInContext(moduleSource('5gFbQ'),context);
const {stages}=modules['2w23s'],{Minimap}=modules['5gFbQ'];let cases=0;
const noop=()=>{},ctx=new Proxy({}, {get:(target,key)=>target[key]||noop,set:(target,key,value)=>(target[key]=value,true)});
function render(stage,height=720){const mini=new Minimap();mini.render(ctx,{stage,theme:{},camera:{x:13,y:5,zoom:1},size:{x:1280,y:height},entities:[],marbles:[]},1280,height);return mini}
const night=stages.find(s=>s.title==='Yoru ni Kakeru');assert(night);
for(const height of [360,720,1080]){const mini=render(night,height),b=mini.getBoundingBox();assert(b.h>b.w*8);assert(b.y+b.h<=height);assert(mini.range.minX>=-10);assert(mini.range.maxX<=36)}cases++;
const mini=render(night);let position;mini.onViewportChange(value=>position=value);
mini.onMouseMove({x:mini.boundingBox.w/2,y:0});assert.equal(position.y,0);assert(Math.abs(position.x-(mini.range.minX+mini.range.maxX)/2)<1e-8);
mini.onMouseMove({x:mini.boundingBox.w/2,y:mini.boundingBox.h});assert(Math.abs(position.y-night.goalY)<1e-8);cases++;
for(const stage of stages.slice(0,4)){const m=render(stage);assert(m.boundingBox.h>m.boundingBox.w);assert(m.boundingBox.w<=104);assert(m.scale>0)}cases++;
const horizontal=render(factory);assert(horizontal.boundingBox.w>horizontal.boundingBox.h);assert.equal(horizontal.range.minX,-20);assert.equal(horizontal.range.maxX,112);cases++;
const base={goalY:250,entities:[{type:'static',position:{x:13,y:0},shape:{type:'box',width:1,height:800,rotation:0}}]};
assert.equal(render(base).range.maxX,26);
base.entities[0].shape.rotation=Math.PI/2;assert(render(base).range.maxX>=813);cases++;
base.entities[0].type='kinematic';base.entities[0].shape.rotation=0;assert(render(base).range.maxX>=813);cases++;

console.log(`${cases} minimap geometry, camera navigation, and course regression cases passed`);
