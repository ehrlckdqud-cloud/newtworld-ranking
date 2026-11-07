// Keep a browser recovery token only while one tab owns the member's local lock.
// The server still decides whether another browser holds the member session.
export async function claimGameTab(member, claim, status) {
 const locks=navigator.locks, key='nw-game-tab:'+member.device;
 let release=()=>{}, hidden=false;
 const leave=()=>{hidden=true;release();};
 window.addEventListener('pagehide',leave,{once:true});
 try {
  if(locks){
   await new Promise((resolve,reject)=>{
    locks.request(key,{ifAvailable:true},lock=>{
     if(!lock)throw Error('LOCAL_GAME_TAB_OPEN');
     return new Promise(done=>{release=done;resolve();});
    }).catch(reject);
   });
   if(hidden){release();throw Error('PAGE_CLOSED');}
   const saved=localStorage.getItem(key);
   if(saved)sessionStorage.setItem('nwCoopSiteSession',saved);
  }
  const deadline=Date.now()+96000;
  for(;;){
   if(hidden)throw Error('PAGE_CLOSED');
   try {
    await claim(member);
    if(locks)localStorage.setItem(key,sessionStorage.getItem('nwCoopSiteSession'));
    return;
   }catch(error){
    if(error.message!=='MEMBER_ALREADY_ONLINE'||Date.now()>=deadline)throw error;
    status.textContent='이전 게임 접속이 종료됐는지 확인 중입니다. 종료가 확인되면 자동으로 입장합니다.';
    await new Promise(done=>setTimeout(done,6000));
   }
  }
 }catch(error){
  release();window.removeEventListener('pagehide',leave);throw error;
 }
}
