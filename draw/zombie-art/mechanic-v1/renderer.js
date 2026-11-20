'use strict';
(() => {
const injury = (()=>{
  // Each cut has its own cheek (or crown overhead), near shoulder, forearm and trouser landmarks.
  // Positions are measured in the tight source crop and follow the original art when mirrored.
  const marks={
    side:{
      pistol:{idle:[.50,.10,.32,.25,.36,.35,.34,.69],hurt:[.36,.11,.36,.24,.46,.35,.77,.60],fall:[.76,.17,.55,.29,.48,.45,.42,.69]},
      k2:{idle:[.37,.10,.22,.24,.33,.32,.33,.69],hurt:[.31,.10,.28,.23,.33,.32,.65,.61],fall:[.31,.22,.23,.31,.18,.59,.63,.74]}
    },
    raised:{
      pistol:{idle:[.47,.15,.32,.27,.12,.43,.32,.70],hurt:[.37,.14,.32,.27,.55,.39,.72,.62],fall:[.70,.18,.47,.30,.43,.51,.52,.75]},
      k2:{idle:[.30,.14,.20,.26,.16,.38,.33,.71],hurt:[.26,.13,.26,.26,.23,.39,.59,.64],fall:[.71,.20,.46,.33,.42,.45,.53,.73]}
    },
    top:{
      pistol:{idle:[.60,.66,.39,.17,.55,.89,.82,.70],hurt:[.56,.58,.31,.16,.67,.84,.73,.52],fall:[.35,.49,.30,.70,.42,.71,.71,.62]},
      k2:{idle:[.58,.64,.42,.16,.55,.88,.81,.70],hurt:[.49,.49,.29,.85,.55,.77,.59,.29],fall:[.25,.47,.32,.64,.43,.74,.70,.62]}
    }
  };
  const cache=new WeakMap();
  function random(seed){
    let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
  }
  function stain(ctx,x,y,r,ink,rand){
    ctx.fillStyle=ink;ctx.beginPath();
    for(let i=0;i<19;i++){
      const a=i*2*Math.PI/19,rad=r*(.58+rand()*.43);
      const px=x+Math.cos(a)*rad,py=y+Math.sin(a)*rad*.72;
      if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);
    }
    ctx.closePath();ctx.fill();
  }
  function brush(ctx,x,y,size,angle,cloth,heavy,seed){
    const rand=random(seed);
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(size,size);
    stain(ctx,0,0,cloth?.80:.47,cloth?'rgba(96,22,25,.68)':'rgba(150,47,42,.49)',rand);
    const cuts=cloth?3:2;
    for(let i=0;i<cuts;i++){
      const dy=(i-(cuts-1)/2)*.24+.08*rand(),left=-.88+.16*rand(),right=.55+.33*rand();
      ctx.fillStyle=i===0?'#68242a':'#8c3031';ctx.beginPath();ctx.moveTo(left,dy+.09);
      ctx.quadraticCurveTo(-.24,dy-.13,right,dy-.20);
      ctx.quadraticCurveTo(.05,dy+.075,left,dy+.09);ctx.fill();
      ctx.fillStyle='#bd4740';ctx.beginPath();ctx.moveTo(left*.65,dy+.03);
      ctx.quadraticCurveTo(0,dy-.07,right*.74,dy-.145);
      ctx.quadraticCurveTo(-.12,dy+.04,left*.65,dy+.03);ctx.fill();
    }
    for(let i=0;i<(cloth&&heavy?27:13);i++){
      const a=rand()*Math.PI*2,dist=.35+rand()*(cloth?1.35:.62);
      stain(ctx,Math.cos(a)*dist,Math.sin(a)*dist*(cloth?.9:.64),.027+rand()*(cloth?.14:.085),i%4?'#953333':'#662127',rand);
    }
    ctx.restore();
  }
  function sprite(im,meta,view,weapon,pose,severity){
    if(!severity)return im;
    const variants=cache.get(im)||[];if(variants[severity])return variants[severity];
    const pts=meta.landmarks||marks[view][weapon][pose];if(!pts)return im;
    const surface=document.createElement('canvas');surface.width=im.naturalWidth;surface.height=im.naturalHeight;
    const p=surface.getContext('2d'),w=surface.width,h=surface.height,unit=h/meta.height*(view==='top'?1.18:1);
    p.drawImage(im,0,0);p.globalCompositeOperation='source-atop';
    const heavy=severity===2,factor=heavy?1.25:1;
    const sizes=[.034,.071,.044,.057],angles=[-.41,-.57,-.85,.56];
    for(let i=0;i<(heavy?4:3);i++){
      let a=angles[i];if(pose==='down')a-=.73;
      brush(p,pts[2*i]*w,pts[2*i+1]*h,unit*sizes[i]*factor,a,i===1||i===3,heavy,98+i*83);
    }
    variants[severity]=surface;cache.set(im,variants);return surface;
  }
  function source(meta,im,view,weapon){
    const pt=marks[view][weapon].hurt,h=meta.height,w=h*im.naturalWidth/im.naturalHeight;
    return [(pt[2]-meta.pivot[0])*w,(pt[3]-meta.pivot[1])*h];
  }
  function particles(seed){
    const rand=random(seed);
    return Array.from({length:27},(_,i)=>{
      const a=(-153+rand()*121)*Math.PI/180,velocity=.23+rand()*.68;
      return {vx:Math.cos(a)*velocity,vy:Math.sin(a)*velocity,r:.0032+rand()*.007,life:.26+rand()*.19,ink:['#9c2933','#ab3336','#742831','#b6433b'][i%4]};
    });
  }
  const clouds=Array.from({length:6},(_,i)=>particles(8208+113*i));
  function spray(ctx,elapsed,origin,heavy,top,index){
    if(elapsed<0||elapsed>.48)return;
    const cloud=clouds[index],count=heavy?cloud.length:17;
    ctx.save();ctx.translate(origin[0],origin[1]);
    for(let i=0;i<count;i++){
      const {vx,vy,r,life,ink}=cloud[i];if(elapsed>=life)continue;
      const t=elapsed+.015,g=top?.22:2.25;
      const x=vx*t*1.18,y=vy*t+.5*g*t*t;
      ctx.fillStyle=ink;ctx.globalAlpha=Math.min(1,(life-elapsed)*11);
      ctx.beginPath();ctx.ellipse(x,y,r*(1.35+1.8*(1-elapsed/life)),r,Math.atan2(vy+g*t,vx),0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  const pooled=new Path2D();
  pooled.moveTo(-.20,0);pooled.bezierCurveTo(-.22,-.019,-.15,-.032,-.10,-.029);
  pooled.bezierCurveTo(-.07,-.047,.02,-.043,.055,-.030);
  pooled.bezierCurveTo(.10,-.029,.165,-.010,.137,.006);
  pooled.bezierCurveTo(.16,.020,.09,.030,.05,.028);
  pooled.bezierCurveTo(-.016,.052,-.08,.04,-.104,.026);
  pooled.bezierCurveTo(-.18,.034,-.214,.019,-.20,0);pooled.closePath();
  function floor(ctx,age,top,x,y){
    if(age<=0)return;
    const p=Math.min(1,age/.71),scale=.23+.77*p*(2-p);
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale*(top?2.2:1));ctx.fillStyle='rgba(121,33,40,.84)';ctx.fill(pooled);
    ctx.fillStyle='#93363a';for(const [dx,dy,r] of [[-.23,.013,.013],[-.18,.048,.007],[.151,.025,.009],[.172,.013,.004]]){
      ctx.beginPath();ctx.ellipse(dx,dy,r,r*.48,-.17,0,Math.PI*2);ctx.fill();
    }ctx.restore();
  }
  return {sprite,source,spray,floor};
})();

const views = {
  side: {
    pistol: {
      idle: {"key":"side/pistol-idle","height":1,"pivot":[0.44,0.986]},
      aim: {"key":"side/pistol-aim","height":0.986,"pivot":[0.29,0.986],"muzzle":[0.985,0.147],"barrel":0},
      kick: {"key":"side/pistol-kick","height":0.982,"pivot":[0.53,0.986],"muzzle":[0.977,0.115],"barrel":-35},
      hurt: {"key":"side/pistol-hurt","height":0.936,"pivot":[0.42,0.986]},
      fall: {"key":"side/pistol-fall","height":0.629,"pivot":[0.6,0.986]},
      down: {"key":"side/pistol-down","height":0.1944,"pivot":[0.51,0.92],"landmarks":[0.157,0.4,0.248,0.55,0.4,0.79,0.685,0.63],"pool":[0.29,0.91]},
      run: {"cols":3,"frames":6,"cellWidth":536,"cellHeight":524,"pivot":[0.5,0.9637404580152672],"height":1.05,"key":"run/side-pistol"},
    },
    k2: {
      idle: {"key":"side/k2-idle","height":1,"pivot":[0.31,0.986]},
      aim: {"key":"side/k2-aim","height":0.977,"pivot":[0.17,0.986],"muzzle":[0.984,0.165],"barrel":0},
      kick: {"key":"side/k2-kick","height":0.967,"pivot":[0.33,0.986],"muzzle":[0.983,0.104],"barrel":-15},
      hurt: {"key":"side/k2-hurt","height":0.916,"pivot":[0.34,0.986]},
      fall: {"key":"side/k2-fall","height":0.662,"pivot":[0.64,0.986]},
      down: {"key":"side/k2-down","height":0.2017,"pivot":[0.51,0.92],"landmarks":[0.157,0.38,0.248,0.53,0.4,0.76,0.685,0.61],"pool":[0.29,0.91]},
      run: {"cols":3,"frames":6,"cellWidth":536,"cellHeight":524,"pivot":[0.5,0.9637404580152672],"height":1.05,"key":"run/side-k2"},
    },
  },
  raised: {
    pistol: {
      idle: {"key":"raised/pistol-idle","height":0.86,"pivot":[0.51,0.986]},
      aim: {"key":"raised/pistol-aim","height":0.891,"pivot":[0.35,0.986],"muzzle":[0.986,0.166],"barrel":-4},
      kick: {"key":"raised/pistol-kick","height":0.8858,"pivot":[0.48,0.986],"muzzle":[0.983,0.096],"barrel":-24},
      hurt: {"key":"raised/pistol-hurt","height":0.8015,"pivot":[0.47,0.986]},
      fall: {"key":"raised/pistol-fall","height":0.6037,"pivot":[0.46,0.986]},
      down: {"key":"raised/pistol-down","height":0.303,"pivot":[0.51,0.63],"landmarks":[0.18,0.39,0.26,0.65,0.41,0.835,0.68,0.59],"pool":[0.29,0.82]},
      run: {"cols":3,"frames":6,"cellWidth":400,"cellHeight":400,"pivot":[0.5,0.9625],"height":0.94,"key":"run/raised-pistol"},
    },
    k2: {
      idle: {"key":"raised/k2-idle","height":0.86,"pivot":[0.32,0.986]},
      aim: {"key":"raised/k2-aim","height":0.8299,"pivot":[0.25,0.986],"muzzle":[0.992,0.211],"barrel":-2},
      kick: {"key":"raised/k2-kick","height":0.8316,"pivot":[0.34,0.986],"muzzle":[0.992,0.118],"barrel":-12},
      hurt: {"key":"raised/k2-hurt","height":0.823,"pivot":[0.37,0.986]},
      fall: {"key":"raised/k2-fall","height":0.6992,"pivot":[0.44,0.986]},
      down: {"key":"raised/k2-down","height":0.3178,"pivot":[0.51,0.63],"landmarks":[0.18,0.37,0.26,0.62,0.41,0.8,0.68,0.56],"pool":[0.29,0.82]},
      run: {"cols":3,"frames":6,"cellWidth":400,"cellHeight":400,"pivot":[0.5,0.9625],"height":0.94,"key":"run/raised-k2"},
    },
  },
  top: {
    pistol: {
      idle: {"height":0.42,"pivot":[0.315,0.5],"key":"top/pistol-idle","landmarks":[0.3,0.49,0.39,0.12,0.62,0.35,0.39,0.87]},
      aim: {"height":0.42,"pivot":[0.235,0.5],"key":"top/pistol-aim","muzzle":[0.993,0.488],"barrel":0},
      kick: {"height":0.42,"pivot":[0.235,0.5],"key":"top/pistol-kick","muzzle":[0.993,0.381],"barrel":-10},
      hurt: {"height":0.51,"pivot":[0.46,0.53],"key":"top/pistol-hurt"},
      fall: {"height":0.632,"pivot":[0.46,0.56],"key":"top/pistol-fall"},
      down: {"height":0.34,"pivot":[0.51,0.51],"key":"top/pistol-down","landmarks":[0.166,0.527,0.25,0.75,0.41,0.847,0.682,0.6],"pool":[0.29,0.78]},
      run: {"cols":3,"frames":6,"cellWidth":620,"cellHeight":520,"pivot":[0.48,0.5],"height":0.722,"key":"run/top-pistol"},
    },
    k2: {
      idle: {"height":0.42,"pivot":[0.236,0.5],"key":"top/k2-idle","landmarks":[0.25,0.5,0.29,0.13,0.47,0.39,0.3,0.87]},
      aim: {"height":0.42,"pivot":[0.204,0.5],"key":"top/k2-aim","muzzle":[0.994,0.533],"barrel":0},
      kick: {"height":0.42,"pivot":[0.204,0.5],"key":"top/k2-kick","muzzle":[0.994,0.388],"barrel":-7},
      hurt: {"height":0.508,"pivot":[0.39,0.51],"key":"top/k2-hurt"},
      fall: {"height":0.585,"pivot":[0.46,0.56],"key":"top/k2-fall"},
      down: {"height":0.3492,"pivot":[0.51,0.51],"key":"top/k2-down","landmarks":[0.166,0.51,0.25,0.73,0.41,0.825,0.682,0.585],"pool":[0.29,0.78]},
      run: {"cols":3,"frames":6,"cellWidth":620,"cellHeight":520,"pivot":[0.48,0.5],"height":0.722,"key":"run/top-k2"},
    },
  },
};
const root = new URL(document.currentScript.dataset.assets || '.', document.currentScript.src);
const ready = new Map();
const loading = new Map();
const groups = new Map();
const flashKey = 'flash/source-v11';

function loadImage(key) {
  if (ready.has(key)) return Promise.resolve(ready.get(key));
  if (loading.has(key)) return loading.get(key);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  const request = new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('Character art unavailable: ' + key));
    img.src = new URL('art/' + key + '.webp', root).href;
  }).then(async () => {
    if (img.decode) await img.decode();
    ready.set(key, img);
    return img;
  }).finally(() => loading.delete(key));
  loading.set(key, request);
  return request;
}

function prepare(view = 'raised', weapon = 'pistol') {
  const group = view + '/' + weapon;
  if (groups.has(group)) return groups.get(group);
  const poses = views[view]?.[weapon];
  if (!poses) return Promise.reject(new Error('Unknown mechanic view or weapon'));
  const request = Promise.all([loadImage(flashKey), ...Object.values(poses).map(meta => loadImage(meta.key))])
    .then(() => undefined)
    .catch(error => { groups.delete(group); throw error; });
  groups.set(group, request);
  return request;
}

let shade;
function shadow(ctx, top, prone) {
  if (!shade) {
    shade = document.createElement('canvas');
    shade.width = shade.height = 48;
    const brush = shade.getContext('2d');
    const gradient = brush.createRadialGradient(24,24,0,24,24,24);
    gradient.addColorStop(0, 'rgba(49,40,35,.29)');
    gradient.addColorStop(1, 'rgba(49,40,35,0)');
    brush.fillStyle = gradient;
    brush.fillRect(0,0,48,48);
  }
  const radiusX = prone ? .4 : .2;
  const radiusY = top ? .16 : (prone ? .046 : .03);
  ctx.drawImage(shade, -radiusX, -radiusY, radiusX*2, radiusY*2);
}

function flash(ctx, meta, left, upper, width, height, weapon, age) {
  const frame = Math.floor(age*30);
  const sheet = ready.get(flashKey);
  if (!sheet || !meta.muzzle || frame < 0 || frame >= 17) return;
  const pixel = (weapon === 'k2' ? .54 : .43)/432;
  ctx.save();
  ctx.translate(left + width*meta.muzzle[0], upper + height*meta.muzzle[1]);
  ctx.rotate((meta.barrel || 0)*Math.PI/180);
  ctx.drawImage(sheet, (frame%6)*432, Math.floor(frame/6)*352, 432,352, -64*pixel,-180*pixel,432*pixel,352*pixel);
  ctx.restore();
}

function draw(ctx, options) {
  const {x,y,unit,view='raised',weapon='pistol',angle=0,framePhase=0,age=0,flashAge=-1,wound=0,alpha=1} = options;
  const poses = views[view]?.[weapon];
  let pose = options.pose || 'idle';
  let meta = poses?.[pose];
  let img = meta && ready.get(meta.key);
  if (!img && poses) {
    pose = 'idle';
    meta = poses.idle;
    img = ready.get(meta.key);
  }
  if (!img || !(unit>0) || alpha<=0) return {x,y,scale:1,drawn:false};

  const top = view === 'top';
  const h = meta.height;
  const w = h*(meta.cellWidth || img.naturalWidth)/(meta.cellHeight || img.naturalHeight);
  const left = -meta.pivot[0]*w, upper = -meta.pivot[1]*h;
  const severity = wound>=2 ? 2 : (wound>=1 ? 1 : 0);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x,y);
  ctx.scale(unit,unit);
  if (top) ctx.rotate(angle);
  else if (Math.cos(angle)<0) ctx.scale(-1,1);
  shadow(ctx,top,pose==='down'||pose==='fall');
  if (pose==='down' && severity && meta.pool) {
    injury.floor(ctx,age,top,left+w*meta.pool[0],upper+h*meta.pool[1]);
  }
  if (meta.frames) {
    const frame = Math.floor((framePhase - Math.floor(framePhase))*meta.frames);
    ctx.drawImage(img, (frame%meta.cols)*meta.cellWidth,Math.floor(frame/meta.cols)*meta.cellHeight,
      meta.cellWidth,meta.cellHeight,left,upper,w,h);
  } else {
    const sprite = injury.sprite(img,meta,view,weapon,pose,severity);
    const breath = pose === 'idle' ? Math.sin(age*3.2 + framePhase*Math.PI*2)*(top?.0018:.0045) : 0;
    ctx.drawImage(sprite,left,upper-breath,w,h+breath);
  }
  if (flashAge>=0) flash(ctx,meta,left,upper,w,h,weapon,flashAge);
  if (severity && pose==='hurt' && age<.48) {
    injury.spray(ctx,age,injury.source(meta,img,view,weapon),severity===2,top,0);
  }
  ctx.restore();
  // The nameplate sits below the silhouette, including when an overhead pose rotates.
  const bottom = top
    ? Math.max(left*Math.sin(angle), (left+w)*Math.sin(angle)) +
      Math.max(upper*Math.cos(angle), (upper+h)*Math.cos(angle))
    : upper+h;
  return {x,y:y+unit*bottom,scale:1,drawn:true};
}

let volume = 1;
const channels = new Map();
const active = new Set();
function soundChannel(ctx) {
  if (!channels.has(ctx)) {
    const master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    channels.set(ctx, {master, buffers:new Map(), loading:new Map()});
    for (const previous of channels.keys()) {
      if (previous.state==='closed') channels.delete(previous);
    }
  }
  return channels.get(ctx);
}

function prepareSound(ctx,weapon) {
  if (!ctx || !['pistol','k2'].includes(weapon)) return Promise.resolve();
  const channel = soundChannel(ctx);
  if (channel.buffers.has(weapon)) return Promise.resolve();
  if (channel.loading.has(weapon)) return channel.loading.get(weapon);
  const request = fetch(new URL('audio/' + weapon + '-v11.wav', root))
    .then(response => {
      if (!response.ok) throw new Error('Character audio unavailable: ' + weapon);
      return response.arrayBuffer();
    }).then(bytes => ctx.decodeAudioData(bytes))
    .then(buffer => {channel.buffers.set(weapon,buffer);})
    .finally(() => channel.loading.delete(weapon));
  channel.loading.set(weapon,request);
  return request;
}

function playSound(ctx, weapon, gain = 1) {
  const channel = channels.get(ctx);
  const buffer = channel?.buffers.get(weapon);
  if (!buffer || ctx.state!=='running' || volume<=0 || gain<=0 || active.size>=10) return false;
  const source = ctx.createBufferSource(), level = ctx.createGain();
  source.buffer = buffer;
  level.gain.value = Math.min(1,gain);
  source.connect(level);
  level.connect(channel.master);
  active.add(source);
  source.onended = () => {
    active.delete(source);
    source.disconnect();
    level.disconnect();
  };
  source.start();
  return true;
}

function stopSound() {
  for (const source of active) source.stop();
  active.clear();
}

function setVolume(value) {
  volume = Math.max(0,Math.min(1,value));
  for (const {master} of channels.values()) master.gain.value = volume;
}

window.DefenseMechanic = {prepare,draw,prepareSound,playSound,stopSound,setVolume};
})();
