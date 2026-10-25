const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');let dialogs=[];
class Element{constructor(tag){this.tag=tag;this.children=[];this.listeners={};}append(...nodes){this.children.push(...nodes);}setAttribute(k,v){this[k]=v;}addEventListener(k,v){this.listeners[k]=v;}showModal(){}close(){}remove(){this.removed=true;}focus(){}}
const doc={currentScript:{src:'https://example.test/assets/newt-ui.js'},head:{append(){}},body:{append(e){dialogs.push(e)}},createElement:t=>new Element(t),createTextNode:text=>({textContent:text})},window={};
vm.runInNewContext(fs.readFileSync(__dirname+'/../assets/newt-ui.js','utf8'),{window,document:doc,URL});
(async()=>{
 const p=window.NWUI.password(),dialog=dialogs.at(-1),form=dialog.children[0],input=form.children.find(x=>x.tag==='input');assert.equal(input.type,'password');input.value='hidden-test';form.onsubmit({preventDefault(){}});assert.equal(await p,'hidden-test');assert.equal(input.value,'');assert(dialog.removed);
 const yes=window.NWUI.confirm({cost:20}),d=dialogs.at(-1),f=d.children[0];assert.equal(f.children[1].children[0].children[0].src.href,'https://example.test/assets/newt-gem.svg');f.onsubmit({preventDefault(){}});assert.equal(await yes,true);
 const no=window.NWUI.confirm({cost:20}),cancelDialog=dialogs.at(-1);cancelDialog.listeners.cancel({preventDefault(){}});assert.equal(await no,false);
 console.log('PASS masked password, password clearing, shared gem confirmation and cancellation');
})().catch(e=>{console.error(e);process.exitCode=1});
