const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {NativeMedia}=await import('../draw/space-media.js'),m=new NativeMedia;m.deathData=JSON.parse(fs.readFileSync('draw/space-assets/rocket-death-v30.json'));m.warningData=JSON.parse(fs.readFileSync('draw/space-assets/rocket-warning-v31.json'));m.deathImage={};let hull=[],draws=[];m.drawRocketCraft=(c,s)=>hull.push(s.deathPalette);
 const ctx={save(){},restore(){},translate(){},scale(){},rotate(){},drawImage(...a){draws.push(a)}};const ship={death:0,dx:10,dy:20};
 for(const t of [0,.02,.12,.4,1.5])m.drawExplorerDeath(ctx,ship,t,24);assert.equal(draws.length,0);assert(hull.includes(0x934));assert(hull.includes(0x93a));assert.equal(hull.length,5);
 m.drawExplorerDeath(ctx,ship,1.7,24);assert(draws.length>0);assert.equal(draws[0][7],m.deathData.clips['rocket-explosion'][5].rect[2]*2.2);assert.equal(m.warningData.seconds,1.6);
 const source=fs.readFileSync('draw/space-original.js','utf8');assert(source.includes("sound:'rocket-warning',at:time"));assert(source.includes("at:time+(media.warningData?.seconds??1.6)"));
 const classes=new Set,attrs={},values={};const toggle={setAttribute(k,v){attrs[k]=v}},grip={setAttribute(k,v){attrs[k]=v},setPointerCapture(){}},root={style:{setProperty(k,v){values[k]=v}}};
 global.document={body:{classList:{toggle(k,v){v?classes.add(k):classes.delete(k)},add(k){classes.add(k)},remove(k){classes.delete(k)}}},getElementById:id=>({spTopToggle:toggle,spRosterResize:grip,nwspace:root}[id])};global.innerWidth=1200;global.window={addEventListener(){}};let saved;global.localStorage={getItem(){return null},setItem(k,v){saved=JSON.parse(v)}};let pending;global.requestAnimationFrame=f=>(pending=f,1);global.cancelAnimationFrame=()=>{};
 const {initSpaceLayout}=await import('../draw/space-layout.js');initSpaceLayout();toggle.onclick();assert(classes.has('space-top-collapsed'));assert.equal(attrs['aria-expanded'],'false');toggle.onclick();assert(!classes.has('space-top-collapsed'));
 grip.onpointerdown({button:0,pointerId:1,clientX:900,preventDefault(){}});grip.onpointermove({pointerId:1,clientX:1100});pending();grip.onpointerup({pointerId:1});assert.equal(values['--roster-width'],'84px');assert.equal(saved.width,84);assert(!classes.has('space-roster-resizing'));
 grip.onkeydown({key:'ArrowLeft',preventDefault(){}});assert.equal(values['--roster-width'],'94px');grip.ondblclick();assert.equal(values['--roster-width'],'210px');
 console.log('v31: native warning phase before larger explosion, compact/collapsible header, drag/keyboard pane resizing and persistence passed');
})().catch(e=>{console.error(e);process.exitCode=1});
