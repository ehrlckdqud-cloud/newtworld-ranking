const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync('assets/ranking-avatars-v297.js', 'utf8');
const ref = 'nw-avatar:' + '1'.repeat(36), newRef = ref.replaceAll('1','2');
const thumb = 'data:image/jpeg;base64,YQ==', updated = 'data:image/jpeg;base64,Yg==';

function node() {
  const classes = new Set();
  return {dataset:{},children:[],textContent:'',classList:{
    add: x=>classes.add(x), remove: x=>classes.delete(x), contains: x=>classes.has(x)
  },append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children;this.textContent=''},
  setAttribute(){},removeAttribute(){},getAttribute(k){return this[k]},remove(){},addEventListener(){},
  getClientRects(){return [1]},getBoundingClientRect(){return {top:100,bottom:132}},
  querySelector(){return this.children[0]?.children[0]}};
}
function setup({token='token',cached=true}={}){
  const storage=new Map([['nwProfileDevice','device'],['nwProfileToken',token]]);
  if(cached){
    const at=Date.now()-7*86400000,scope='token|device';
    storage.set('nwRankingMeta297',JSON.stringify({scope,at,items:[['A',{ref,name:'회원'}]]}));
    storage.set('nwRankingPhotosV292',JSON.stringify({scope,items:[{id:'A',ref,src:thumb,at}]}));
  }
  const slots=[node(),node(),node()],requests=[],listeners={};
  slots.forEach((slot,i)=>slot.dataset.rankingAvatar=i===2?'B':'A');
  slots[1].classList.add('nw-ranking-avatar-mobile');
  const window={NW_CONFIG:{appScriptUrl:'https://example.invalid'},addEventListener:(k,f)=>listeners[k]=f};
  const document={head:{appendChild:s=>requests.push(s)},body:node(),createElement:node,addEventListener(){},querySelectorAll:()=>slots};
  const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
  vm.runInNewContext(code,{localStorage,window,document,Date,Map,Set,URLSearchParams,innerHeight:900,setTimeout:()=>1,clearTimeout(){}});
  async function reply(data){const req=requests.shift();const cb=new URL(req.src).searchParams.get('callback');window[cb](data);await new Promise(setImmediate);}
  return {slots,reply,storage};
}
(async()=>{
  const hit=setup();
  for(const slot of hit.slots.slice(0,2))assert.equal(slot.querySelector()?.src,thumb);
  assert.equal(hit.slots[2].textContent,'미등록');
  await hit.reply({ok:true,avatars:[{id:'A',ref:newRef,name:'회원'}],images:[{id:'A',ref:newRef,src:updated}]});
  for(const slot of hit.slots.slice(0,2))assert.equal(slot.querySelector()?.src,updated);
  const slow=setup();await slow.reply({ok:false});assert.equal(slow.slots[0].querySelector()?.src,thumb);
  const removed=setup();await removed.reply({ok:true,avatars:[]});
  assert.equal(removed.slots[0].textContent,'미등록');assert.equal(removed.slots[1].textContent,'대표사진 미등록');
  assert.deepEqual(JSON.parse(removed.storage.get('nwRankingPhotosV292')).items,[]);
  const rejected=setup();await rejected.reply({ok:false,auth:false});assert.equal(rejected.slots[0].querySelector(),undefined);
  for(const opts of [{cached:false},{token:'another'}]){
    const cold=setup(opts);assert.equal(cold.slots[0].querySelector(),undefined);assert.equal(cold.slots[0].textContent,'');
    await cold.reply({ok:true,avatars:[]});assert.equal(cold.slots[0].textContent,'미등록');
  }
  console.log('PASS desktop and mobile, stale cache, refresh, deletion, temporary failure, cold start and session isolation');
})().catch(e=>{console.error(e);process.exitCode=1});
