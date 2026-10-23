// Broad phase only: candidates retain original hull order; exact swept contact is unchanged.
export class CollisionGrid{
 constructor(size=160){this.size=size;this.cells=new Map;this.pool=[];this.hulls=[];this.seen=[];this.epoch=0;this.result=[];}
 build(hulls){for(const cell of this.cells.values()){cell.length=0;this.pool.push(cell);}this.cells.clear();this.hulls=hulls;const size=this.size;for(let i=0;i<hulls.length;i++){const h=hulls[i];for(let x=Math.floor((h.x-h.r)/size);x<=Math.floor((h.x+h.r)/size);x++)for(let y=Math.floor((h.y-h.r)/size);y<=Math.floor((h.y+h.r)/size);y++){const key=x+','+y;let cell=this.cells.get(key);if(!cell){cell=this.pool.pop()||[];this.cells.set(key,cell);}cell.push(i);}}return this;}
 query(left,top,right,bottom){const out=this.result;out.length=0;const epoch=++this.epoch,size=this.size;for(let x=Math.floor(left/size);x<=Math.floor(right/size);x++)for(let y=Math.floor(top/size);y<=Math.floor(bottom/size);y++){const cell=this.cells.get(x+','+y);if(!cell)continue;for(const i of cell)if(this.seen[i]!==epoch){this.seen[i]=epoch;out.push(i);}}out.sort((a,b)=>a-b);return out;}
}
