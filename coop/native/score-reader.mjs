export const SCORE_ADDRESSES=[0x10ed18,0x10ed20,0x10535c,0x10514c,0x104f3c];
export function readScores(engine){return SCORE_ADDRESSES.slice(0,engine.playerCount).map(a=>{const bcd=engine.long(a).toString(16);return /^[0-9]{1,8}$/.test(bcd)?Number(bcd):0;});}
