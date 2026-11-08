// Deliver both sides of a tap on separate guest frames. A wall-clock timeout
// can expire while the emulator is still rendering the same frame.
export function createKeyboard({frame, send, schedule, cancel}) {
 const held = new Map(), buttons = new Map();
 let pending;
 function pump() {
  pending = undefined;
  const now = frame();
  for (const [id, button] of buttons) {
   if (button.edges.length && now >= button.next) {
    const value = button.edges.shift();
    send(id, value);
    button.next = now + (id >= 4 && id <= 7 ? 1 : 2);
   }
  }
  if ([...buttons.values()].some(button => button.edges.length)) pending = schedule(pump);
 }
 function change(code, id, pressed) {
  if (held.has(code) === pressed) return;
  const before = [...held.values()].includes(id);
  if (pressed) held.set(code, id);
  else held.delete(code);
  const after = [...held.values()].includes(id);
  if (before === after) return;
  const button = buttons.get(id) ?? {edges: [], next: -Infinity};
  buttons.set(id, button);
  // Keep the newest physical state if input outruns a suspended guest.
  if (button.edges.length >= 16) button.edges.splice(-2);
  button.edges.push(Number(after));
  if (pending !== undefined) cancel(pending);
  pump();
 }
 function reset() {
  if (pending !== undefined) cancel(pending);
  pending = undefined;
  for (const id of buttons.keys()) send(id, 0);
  held.clear();
  buttons.clear();
 }
 return {change, reset};
}
