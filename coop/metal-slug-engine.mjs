const engineUrl = 'https://newtworld-ms3-coop-5p.ehrlckdqud.chatgpt.site/core.js?v=arcade100';
let engineDownload;

export function ensureEngine() {
  if (typeof window.createMS3 === 'function') return Promise.resolve(window.createMS3);
  if (engineDownload) return engineDownload;

  engineDownload = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    function finish(ready) {
      clearTimeout(timer);
      script.onload = script.onerror = null;
      if (ready) {
        resolve(window.createMS3);
      } else {
        script.remove();
        reject(Error('게임 엔진을 받지 못했습니다. 다시 시도해주세요.'));
      }
    }
    const timer = setTimeout(() => finish(false), 60000);
    script.onload = () => finish(typeof window.createMS3 === 'function');
    script.onerror = () => finish(false);
    script.src = engineUrl;
    document.head.append(script);
  }).finally(() => { engineDownload = null; });
  return engineDownload;
}
