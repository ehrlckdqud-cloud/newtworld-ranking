const assert=require('node:assert/strict');
(async()=>{
 const nodes=new Map,classes=new Set;let saved;
 function node(id){if(!nodes.has(id))nodes.set(id,{value:'3',min:'1',max:'20',disabled:false,style:{setProperty(){}},setAttribute(k,v){this[k]=v},addEventListener(k,f){(this.events??={})[k]=f},dispatchEvent(e){this.events?.[e.type]?.(e)}});return nodes.get(id)}
 global.document={getElementById:node,body:{classList:{toggle(k,v){v?classes.add(k):classes.delete(k)},add(){},remove(){}}}};
 global.localStorage={getItem:()=>saved||null,setItem:(k,v)=>saved=v};global.innerWidth=1200;global.window={addEventListener(){}};global.MutationObserver=class{constructor(cb){this.cb=cb}observe(){}};
 const {initSpaceLayout}=await import('../draw/space-layout.js');initSpaceLayout();
 const count=node('spcount');node('spCountUp').onclick();assert.equal(count.value,'4');node('spCountDown').onclick();assert.equal(count.value,'3');
 count.max='3';node('spCountUp').onclick();assert.equal(count.value,'3');assert(node('spCountUp').disabled);
 count.value='1';node('spCountDown').onclick();assert.equal(count.value,'1');assert(node('spCountDown').disabled);
 count.disabled=true;node('spCountUp').onclick();assert.equal(count.value,'1');
 node('spTopToggle').onclick();assert(classes.has('space-top-collapsed'));assert.equal(node('spTopToggle')['aria-expanded'],'false');
 node('spMusicToggle').onclick();assert(classes.has('space-music-collapsed'));assert.equal(node('spMusicToggle')['aria-expanded'],'false');
 initSpaceLayout();assert(classes.has('space-top-collapsed'));assert(classes.has('space-music-collapsed'));
 node('spTopToggle').onclick();node('spMusicToggle').onclick();assert(!classes.has('space-top-collapsed'));assert(!classes.has('space-music-collapsed'));
 console.log('v39 count stepping, bounds, game lock, independent bar toggles and persistence passed');
})().catch(e=>{console.error(e);process.exit(1)});
