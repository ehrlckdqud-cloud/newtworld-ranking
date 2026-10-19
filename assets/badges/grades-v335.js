/* One canonical seven-tier definition for ranking and profile pages. */
(function(){
 'use strict';
 const levels=[{"name": "입문자", "emoji": "🥚", "threshold": 1000, "image": "assets/badges/v335/rank-1.webp", "lockedImage": "assets/badges/v335/rank-1-locked.webp"}, {"name": "초보자", "emoji": "🐣", "threshold": 3000, "image": "assets/badges/v335/rank-2.webp", "lockedImage": "assets/badges/v335/rank-2-locked.webp"}, {"name": "중급자", "emoji": "🐸", "threshold": 10000, "image": "assets/badges/v335/rank-3.webp", "lockedImage": "assets/badges/v335/rank-3-locked.webp"}, {"name": "숙련자", "emoji": "🔥", "threshold": 30000, "image": "assets/badges/v335/rank-4.webp", "lockedImage": "assets/badges/v335/rank-4-locked.webp"}, {"name": "전문가", "emoji": "🐉", "threshold": 50000, "image": "assets/badges/v335/rank-5.webp", "lockedImage": "assets/badges/v335/rank-5-locked.webp"}, {"name": "마스터", "emoji": "🐉", "threshold": 100000, "image": "assets/badges/v335/rank-6.webp", "lockedImage": "assets/badges/v335/rank-6-locked.webp"}, {"name": "레전드", "emoji": "👑", "threshold": 200000, "image": "assets/badges/v335/rank-7.webp", "lockedImage": "assets/badges/v335/rank-7-locked.webp"}].map(Object.freeze);
 function index(score){score=Number(score)||0;let found=-1;levels.forEach((b,i)=>{if(score>=b.threshold)found=i;});return found;}
 function next(score){score=Math.max(0,Number(score)||0);const b=levels.find(b=>score<b.threshold)||levels[levels.length-1];return{name:b.name,threshold:b.threshold,remaining:Math.max(0,b.threshold-score),progress:Math.max(0,Math.min(100,score/b.threshold*100))};}
 window.NWGrades=Object.freeze({levels:Object.freeze(levels),index,next});
})();


/* Shared entry point used by both ranking and My Page, including installed apps. */
(function(){function load(){if(window.NWPromotion337Loaded||document.getElementById('nwPromotionLoader337'))return;const s=document.createElement('script');s.id='nwPromotionLoader337';s.src='assets/badges/promotion-v337.js?v=340';document.head.append(s);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();})();


/* Attribute authenticated TODAY entries for the private Sheets-only report. */
(function(){function load(){if(window.NWMemberVisit341)return;const s=document.createElement('script');s.src='assets/member-visit-v341.js';document.head.append(s);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();})();
