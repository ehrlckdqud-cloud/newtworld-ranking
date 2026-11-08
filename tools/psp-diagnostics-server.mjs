// Standalone COOP/COEP development host for the no-payment PSP diagnosis.
// Bind loopback only. Production hosting requires HTTPS and independently reviewed headers.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const routes=new Map([
  ['/psp/','coop/psp-diagnostics.html'],
  ['/psp/psp-diagnostics.mjs','coop/psp-diagnostics.mjs'],
  ['/psp/psp-contract.mjs','coop/psp-contract.mjs']
]);
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8'};
export function makePspDiagnosticsServer(){
  return createServer(async(req,res)=>{
    const headers={
      'Cross-Origin-Opener-Policy':'same-origin',
      'Cross-Origin-Embedder-Policy':'require-corp',
      'Cross-Origin-Resource-Policy':'same-origin',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer',
      'Cache-Control':'no-store'
    };
    // No remote ROM endpoints, filesystem browsing, login or payment are exposed.
    const url=new URL(req.url||'/', 'http://localhost');
    if(req.method!=='GET'&&req.method!=='HEAD'){
      res.writeHead(405,{...headers,'Allow':'GET, HEAD'}).end();return;
    }
    const path=routes.get(url.pathname);
    if(!path){res.writeHead(404,headers).end('Not found');return;}
    try{
      const body=await readFile(resolve(root,path));
      const type=path.endsWith('.html')?types['.html']:types['.mjs'];
      res.writeHead(200,{...headers,'Content-Type':type,'Content-Length':body.length});
      res.end(req.method==='HEAD'?undefined:body);
    }catch{
      res.writeHead(500,headers).end('Diagnostics resource unavailable');
    }
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||4176);
  makePspDiagnosticsServer().listen(port,'127.0.0.1',()=>{
    console.log('PSP offline diagnostics: http://127.0.0.1:'+port+'/psp/');
    console.log('No ISO uploads. No gem deductions. Local browser testing only.');
  });
}
