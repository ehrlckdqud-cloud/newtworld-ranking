const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {NativeEncounters}=await import('../draw/space-encounters.js'),{NativeMedia}=await import('../draw/space-media.js');
 const media=Object.assign(new NativeMedia,{data:JSON.parse(fs.readFileSync('draw/space-assets/assets.json')),bossData:JSON.parse(fs.readFileSync('draw/space-assets/native-boss.json'))}),audio={add(){},cancelQueued(){}},bounds={W:800,H:610,view:{left:0,right:800,top:0,bottom:610}},position=()=>({x:400,y:400});
 const battle=new NativeEncounters(media,audio,[],50);battle.bounds=bounds;battle.position=position;battle.time=12;battle.spawn({key:'existing-large',type:0,at:15,side:0,s:{}},1);assert.equal(battle.entities.length,2);
 for(const stage of ['fusion','second']){battle.boss={stage,history:[],hulls:()=>[]};const time=stage==='fusion'?25:26,expected=battle.entities.map(e=>battle.pose(e,time));battle.step(time,.01,[],position,bounds);battle.entities.forEach((e,i)=>{assert.equal(e.retirement,undefined);assert.equal(e.dead,false);assert.equal(e.x,expected[i].x);assert.equal(e.y,expected[i].y);});assert(battle.hulls(time).some(h=>h.entity?.type==='large'),'Existing debris remains hittable');const count=battle.entities.length;battle.spawn({key:'blocked-'+stage,type:0,at:time,side:0,s:{}},1);assert.equal(battle.entities.length,count,'No new large debris after final approach');}
 console.log('v34: existing large debris preserves its normal path, health and collision targets; final-stage new spawns remain blocked');
})().catch(e=>{console.error(e);process.exitCode=1});
