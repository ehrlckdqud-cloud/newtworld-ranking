// Paint the same live particles a second time only inside the open result card.
let overlay, context;
export function paintResultFireworks(manager, target) {
  if (typeof document === 'undefined') return;
  if (!manager.count) {
    if (overlay) { overlay.remove(); overlay = context = null; }
    return;
  }
  const card = document.querySelector('.ndr-dialog[open][data-view="result"]');
  if (!card || !manager.burstWidth || !manager.burstHeight) return;
  const surface = target.canvas?.isConnected ? target.canvas : document.getElementById('pondCanvas');
  if (!surface) return;
  if (!overlay || overlay.parentNode !== card) {
    overlay?.remove();
    overlay = document.createElement('canvas');
    overlay.className = 'ndr-fx';
    overlay.setAttribute('aria-hidden','true');
    card.append(overlay);
    context = overlay.getContext('2d');
  }
  if (!context) return;
  const box = overlay.getBoundingClientRect(), scene = surface.getBoundingClientRect();
  if (!box.width || !box.height || !scene.width || !scene.height) return;
  const scale = Math.min(2,window.devicePixelRatio || 1);
  const w = Math.max(1,Math.round(box.width*scale)), h = Math.max(1,Math.round(box.height*scale));
  if (overlay.width !== w) overlay.width = w;
  if (overlay.height !== h) overlay.height = h;
  context.setTransform(1,0,0,1,0,0);
  context.clearRect(0,0,w,h);
  context.setTransform(scale*scene.width/manager.burstWidth,0,0,scale*scene.height/manager.burstHeight,
    scale*(scene.left-box.left),scale*(scene.top-box.top));
  for (const particle of manager.particles) particle.render(context,manager.sprites.get(particle.spriteIndex));
}
