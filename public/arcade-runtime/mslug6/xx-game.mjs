// The authenticated XX snapshot is at the difficulty selector after MAIN MISSION → SINGLE.
export async function restoreXX(emulator, checkpoint, signal) {
 if (!checkpoint.byteLength) throw Error('XX 대기화면이 비어 있습니다.');
 emulator.gameManager.loadState(checkpoint);
 const initial = emulator.Module._get_current_frame_count();
 const deadline = performance.now() + 8000;
 while (emulator.Module._get_current_frame_count() - initial < 4) {
  signal.throwIfAborted();
  if (performance.now() >= deadline) throw Error('XX 대기화면을 복원할 수 없습니다.');
  await new Promise(resolve => setTimeout(resolve, 20));
 }
}
