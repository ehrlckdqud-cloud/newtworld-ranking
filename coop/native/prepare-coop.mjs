/** Applies only generated deltas to the user's BIOS in the emulator's virtual FS. */
export async function prepareCoopROM(module,source,profile,progress=()=>{}){
 await globalThis.prepareROM(module,source,profile,progress);
 if(!profile.biosPatch)return;
 for(const path of ['/system/fbneo/patched/neogeo.zip']){
  const zip=await globalThis.JSZip.loadAsync(module.FS.readFile(path));
  for(const file of ['sp-s2.sp1','sp-s3.sp1']){
   const original=await zip.file(file).async('uint8array');
   const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',original))].map(x=>x.toString(16).padStart(2,'0')).join('');
   if(hash!==profile.biosPatch.sha256)throw Error('UNSUPPORTED_BIOS');
   for(const [at,b64]of profile.biosPatch.rows){const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));if(at<0x5000||at+bytes.length>0x11000)throw Error('BIOS_PATCH_RANGE');for(let i=at;i<at+bytes.length;i++)if(original[i]!==255)throw Error('BIOS_PATCH_NOT_BLANK');original.set(bytes,at);}
   zip.file(file,original);
  }
  module.FS.writeFile(path,await zip.generateAsync({type:'uint8array',compression:'STORE'}));
 }
}
