// HP-only ROM call-site patch. Non-HP users of 0x781e remain untouched.
const data = {"countAddress": 1068426, "sites": [202676, 252052, 265722, 283008, 293276, 293296, 293362, 293382, 305442, 317828, 343568, 383154, 396176, 404196, 412834, 433438, 435024, 448354, 452980, 473538, 523130, 528310, 528736, 541702, 541730, 542940, 559856, 565118, 565498, 566178, 566774, 571130, 571674, 574794, 576390, 576922, 598828, 601882, 613196, 613308, 613498, 622630, 637784, 638984, 640118, 641782, 647248, 648006, 652378, 652832, 653654, 656606, 656638, 656670, 656724, 663326, 666908, 668290, 668448, 670316, 677540, 681518, 684578, 684628, 687046, 696256, 701898, 701956, 707976, 708248, 713028, 719296, 720834, 739404, 739542, 739664, 739818, 742548, 742926, 743854, 747746, 754274, 754692, 761846, 761916, 761986, 768104, 769938, 770680, 773256, 779552, 785410, 786526, 788694, 791950, 793124, 796910, 798598, 799606, 800540, 800874, 807160, 812658, 812782, 812856, 815456, 822922, 826422, 826956, 832692, 833824, 840230, 854790, 855710, 885302, 889280, 890034, 890756, 893052, 904494, 905052, 908716, 910336, 910874, 914966, 916258, 917682, 919410, 919900, 925206, 932966, 933024, 933082, 939000, 939304, 939614, 939664, 947658, 951646, 951914, 952450, 955468, 961324, 964588, 965916, 974136, 974156, 974642, 975934, 983774, 987270, 1000146, 1000650, 1001720, 1002936, 1005212, 1005616], "wrapper": "2f084eb90000781e0c0600026700005848e77fe07400143900104d8a0c42000165000040206f00284eb900c1c1227400143900104d8a0c420001670000263f00206f002a4eb900c1c522321fb0416500001290417400143900104d8a5342c0c2d0414cdf07fe588f4e75"};
export const HP_COUNT_ADDRESS=data.countAddress;
const bytes=hex=>Uint8Array.from(hex.match(/../g),s=>parseInt(s,16));
function read(rom,at,n){return Array.from({length:n},(_,i)=>rom[(at+i)^1]);}
function put(rom,at,code){for(let i=0;i<code.length;i++)rom[(at+i)^1]=code[i];}
export async function patchHealthROM(module){
 const path='/system/fbneo/patched/mslug3fd.zip',rom=await JSZip.loadAsync(module.FS.readFile(path));
 const p1=await rom.file('256-ph1.p1').async('uint8array');
 for(const at of data.sites){if(String(read(p1,at,10))!==String(bytes('4eb90000781e3d40004e')))throw Error('HP_CALLSITE_MISMATCH');put(p1,at,bytes('4eb900c1c800'));}
 const clones=[0,1].map(mode=>{const code=Uint8Array.from(read(p1,0x76fc,0x7948-0x76fc));code.set([0x7e,mode,0x4e,0x75],0x100);return code;});
 const biosPath='/system/fbneo/patched/neogeo.zip',bios=await JSZip.loadAsync(module.FS.readFile(biosPath));
 for(const name of ['sp-s2.sp1','sp-s3.sp1']){
  const b=await bios.file(name).async('uint8array'),sum=b.reduce((a,v)=>a+v,0);
  for(const [at,code]of [[0x1c000,clones[0]],[0x1c400,clones[1]],[0x1c800,bytes(data.wrapper)]]){if(read(b,at,code.length).some(v=>v!==255))throw Error('HP_BIOS_SPACE_OCCUPIED');put(b,at,code);}
  b[0x10fff]=(b[0x10fff]+sum-b.reduce((a,v)=>a+v,0))&255;bios.file(name,b);
 }
 rom.file('256-ph1.p1',p1);
 const patchedROM=await rom.generateAsync({type:'uint8array',compression:'STORE'}),patchedBIOS=await bios.generateAsync({type:'uint8array',compression:'STORE'});
 module.FS.writeFile(path,patchedROM);module.FS.writeFile(biosPath,patchedBIOS);
}
