// Reliable, ordered, frame-numbered inputs. No video/audio payloads.
export const PROTOCOL='nw-input-lockstep-v71', INPUT_DELAY=6;
export class InputSequencer {
 constructor({slots,onFrame,delay=INPUT_DELAY,start=0}){this.slots=new Set(slots);this.onFrame=onFrame;this.delay=delay;this.frame=start;this.pending=new Map();this.commands=[];this.commandIds=new Set();this.history=new Map();for(let f=start;f<start+delay;f++)this.pending.set(f,new Map(slots.map(s=>[s,0])));}
 submit(slot,frame,bits){if(!this.slots.has(slot)||!Number.isSafeInteger(frame)||frame<this.frame||frame>this.frame+120||!Number.isInteger(bits)||bits<0||bits>127)return false;let row=this.pending.get(frame);if(!row)this.pending.set(frame,row=new Map());if(row.has(slot))return row.get(slot)===bits;row.set(slot,bits);return true;}
 enqueue(event){const id=event.type+':'+(event.commandId??event.id);if(this.commandIds.has(id))return;this.commandIds.add(id);this.commands.push(event);if(event.type==='native-presence'&&event.departed)this.slots.delete(event.slot);}
 drain(limit=8){let n=0;while(n++<limit){const row=this.pending.get(this.frame);if(!row||[...this.slots].some(s=>!row.has(s)))break;const packet={type:'frame',frame:this.frame,inputs:Array.from({length:5},(_,i)=>this.slots.has(i+1)?row.get(i+1):0),commands:this.commands.splice(0)};this.pending.delete(this.frame);this.history.set(this.frame,packet);this.frame++;for(const f of this.history.keys())if(f<this.frame-600)this.history.delete(f);this.onFrame(packet);} }
}
export class FrameQueue {
 constructor(frame=0){this.frame=frame;this.pending=new Map();}
 receive(p){if(p?.type!=='frame'||!Number.isSafeInteger(p.frame)||p.frame<this.frame||p.frame>this.frame+900||!Array.isArray(p.inputs)||p.inputs.length!==5||p.inputs.some(b=>!Number.isInteger(b)||b<0||b>127)||!Array.isArray(p.commands)||p.commands.length>100)return false;if(!this.pending.has(p.frame))this.pending.set(p.frame,p);return true;}
 take(){const p=this.pending.get(this.frame);if(!p)return null;this.pending.delete(this.frame++);return p;}
}
export function stateHash(engine){let h=2166136261;const mix=x=>{h=Math.imul(h^x,16777619)>>>0;};for(const x of engine.ram())mix(x);for(const x of JSON.stringify(engine.checkpoint()))mix(x.charCodeAt(0));return h.toString(16).padStart(8,'0');}
