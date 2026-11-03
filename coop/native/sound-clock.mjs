// A second instance clocks the original Neo Geo sound driver at the original
// rate. Only the game instance supplies commands. Its own SFX stay on the fast bus.
const MODE = 0x10f8c0, WRITE = MODE+2, MIRROR = 0x10f900;
const FIFO = 0x109fec, READ = 0x10a06c, END = 0x10a06e, BANK = 0x10a071;
const FAST = 0x4e01, SOUND = 0x4e02;

function memory(module) {
  const r = new Uint8Array(module.HEAPU8.buffer,module._nw_ram(),65536);
  return {
    byte: a => r[(a&65535)^1],
    word: a => r[a&65535] | (r[(a+1)&65535]<<8),
    wb(a,v) { r[(a&65535)^1]=v; },
    ww(a,v) { r[a&65535]=v; r[(a+1)&65535]=v>>8; },
  };
}
function enqueue(r,bytes) {
  let write=r.word(END), taken=0;
  const read=r.word(READ);
  for (const value of bytes) {
    const next=(write+1)&127;
    if(next===read) break;
    r.wb(FIFO+write,value);
    write=next; taken++;
  }
  r.ww(END,write);
  return taken;
}
function state(module) {
  const size=module._nw_snapshot();
  if(!size)throw Error('사운드 상태를 읽을 수 없습니다.');
  const ptr=module._nw_snapshot_ptr();
  return module.HEAPU8.slice(ptr,ptr+size);
}
function restore(module,bytes) {
  const ptr=module._nw_snapshot_buffer(bytes.length);
  module.HEAPU8.set(bytes,ptr);
  if(!module._nw_restore())throw Error('사운드 상태를 불러오지 못했습니다.');
}
export async function loadSoundCore(game,factory) {
  const sound=await factory({print:()=>{},printErr:()=>{}});
  for(const dir of ['/roms','/system/fbneo/patched'])sound.FS.mkdirTree(dir);
  for(const dir of ['/roms','/system/fbneo/patched'])for(const file of ['mslug3fd.zip','neogeo.zip']){
    const path=dir+'/'+file;
    const node=game.FS.lookupPath(path).node;
    const bytes=node.contents instanceof Uint8Array ? node.contents.subarray(0,node.usedBytes) : game.FS.readFile(path);
    sound.FS.writeFile(path,bytes,{canOwn:true});
  }
  if(!sound._nw_load())throw Error('배속 사운드 코어를 시작할 수 없습니다.');
  sound._nw_input(0);
  return sound;
}
export class SoundClock {
  constructor(game,sound) {
    this.game=game;this.sound=sound;
  }
  reset() {
    restore(this.sound,state(this.game));
    const g=memory(this.game),s=memory(this.sound);
    this.pending=[];
    this.read=0;this.phase=0;this.frame=0;
    // Take over the exact music position from the snapshot. Stop the fast copy's
    // inherited mix before playing new effects. The mirrored stop is local only.
    const oldRead=g.word(READ), front=(oldRead-2)&127;
    if(((g.word(END)-oldRead)&127)>125)throw Error('사운드 초기화 대기열이 가득 찼습니다.');
    g.ww(WRITE,0);g.ww(MODE,FAST);
    g.wb(FIFO+front,4);g.wb(FIFO+((front+1)&127),g.byte(BANK));g.ww(READ,front);this.ignoreLocalStop=true;
    s.ww(MODE,SOUND);
    s.ww(END,s.word(READ));

  }
  saveAudio() {
    return {bytes:state(this.sound), cursor:{read:this.read,phase:this.phase,frame:this.frame,
      pending:[...this.pending],ignoreLocalStop:this.ignoreLocalStop}};
  }
  restoreAudio(bytes,cursor) {
    restore(this.sound,bytes);
    this.read=cursor.read;this.phase=cursor.phase;this.frame=cursor.frame;
    this.pending=[...cursor.pending];this.ignoreLocalStop=cursor.ignoreLocalStop;
  }
  advance(rate) {
    const g=memory(this.game),end=g.word(WRITE);
    if(((end-this.read)&65535)>64)throw Error('사운드 명령 대기열이 넘쳤습니다.');
    while(this.read!==end){
      const cmd=g.byte(MIRROR+(this.read&63));
      this.read=(this.read+1)&65535;
      if(this.ignoreLocalStop&&cmd===4){this.ignoreLocalStop=false;continue;}
      this.pending.push(cmd);
    }
    const period=Math.round(rate*10);
    this.phase+=10;
    if(this.phase<period)return;
    this.phase-=period;
    const s=memory(this.sound);
    s.ww(MODE,SOUND);
    this.pending.splice(0,enqueue(s,this.pending));
    this.sound._nw_run(this.frame++);
  }
}
