export function createSingleFlight(run){let pending=null;return (...args)=>{if(pending)return pending;pending=Promise.resolve().then(()=>run(...args)).finally(()=>{pending=null;});return pending;};}
