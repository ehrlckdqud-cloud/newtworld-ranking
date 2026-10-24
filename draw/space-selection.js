export const nicknameKey=name=>name.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('ko-KR');
export const uniqueNicknameCount=names=>new Set(names.map(nicknameKey)).size;
// A shuffled ticket order preserves ticket weighting. Retain one winning craft
// per nickname; all its other tickets remain ordinary losing craft.
export function selectUniqueFinalists(order,count){
 if(!Number.isInteger(count)||count<1||count>uniqueNicknameCount(order.map(s=>s.name)))throw Error('당첨 인원은 서로 다른 닉네임 수 이내로 입력해주세요.');
 const chosen=new Set,finalists=[];
 for(let i=order.length-1;i>=0&&finalists.length<count;i--){const s=order[i],key=nicknameKey(s.name);if(!chosen.has(key)){chosen.add(key);finalists.push(s);}}
 const ids=new Set(finalists.map(s=>s.id));for(const s of order)s.finalist=ids.has(s.id);
 return [...order.filter(s=>!s.finalist),...finalists];
}
// Keep suspense through long boss fights too, rather than only guarding the
// nominal countdown. The final crafts settle just before the final combat ends.
export function finalSelectionOpen(time,duration,boss){return time>=duration-4&&boss?.stage==='second'&&boss.hp<=1&&boss.finisherReady!==false&&(boss.finaleAt===undefined||time>=boss.finaleAt+8);}
// Keep enough combatants for a crowded battle, then thin this reserve over
// eight seconds near the final boss's last quarter instead of dropping everyone at once.
export function survivorReserve(time,duration,boss,total,target){
 const initial=Math.min(Math.max(0,total-target),Math.max(3,Math.ceil(total*.2)));
 if(boss?.stage==='second'&&boss.hp<=boss.maxHp*.25&&time>=duration-15)boss.finaleAt??=time;
 if(boss?.finaleAt===undefined)return initial;
 return Math.min(initial,Math.max(Math.min(3,initial),Math.ceil(initial*(1-Math.min(1,(time-boss.finaleAt)/8)))));
}

// Electrical attacks may thin the ordinary combat reserve, but must leave
// a smaller, stable group of losing craft until the final selection window.
export function electricSurvivorReserve(time,duration,boss,total,target){
 const reserve=survivorReserve(time,duration,boss,total,target);
 if(finalSelectionOpen(time,duration,boss))return 0;
 return Math.min(reserve,Math.max(1,Math.ceil(reserve*.3)));
}
