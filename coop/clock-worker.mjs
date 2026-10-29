// Worker messages keep the simulation clock alive when requestAnimationFrame is suspended.
setInterval(()=>postMessage('tick'),16);
