// Coalesce form edits; calibration and other serial operations can postpone them.
export function createAutoApply({ canApply, apply, onError, delay = 400, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let timer, pending = false, running = false;
  function arm() { clearTimer(timer); timer = setTimer(run, delay); }
  async function run() {
    timer = undefined;
    if (!pending) return;
    if (running || !canApply()) { arm(); return; }
    pending = false; running = true;
    try { await apply(); } catch (error) { onError(error); }
    finally { running = false; if (pending) arm(); }
  }
  return {
    schedule() { pending = true; arm(); },
    cancel() { pending = false; clearTimer(timer); timer = undefined; },
  };
}
