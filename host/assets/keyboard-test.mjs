// Browser keyboard events, independent of the device's serial connection.
export class KeyboardTester {
  constructor({ target, doc, onChange = () => {}, limit = 60 }) {
    this.target = target; this.doc = doc; this.onChange = onChange; this.limit = limit;
    this.enabled = false; this.pressed = new Map(); this.events = []; this.downs = this.ups = 0;
    this.down = event => this.handle(event, 'down'); this.up = event => this.handle(event, 'up');
    this.blur = () => this.releaseTracking('窗口失焦，已清除按住状态');
    this.visibility = () => { if (this.doc.hidden) this.blur(); };
  }
  notify(event) { this.onChange(this, event); }
  start() {
    if (this.enabled) return;
    this.enabled = true;
    this.target.addEventListener('keydown', this.down); this.target.addEventListener('keyup', this.up);
    this.target.addEventListener('blur', this.blur); this.doc.addEventListener('visibilitychange', this.visibility);
    this.notify();
  }
  stop() {
    this.enabled = false;
    this.target.removeEventListener('keydown', this.down); this.target.removeEventListener('keyup', this.up);
    this.target.removeEventListener('blur', this.blur); this.doc.removeEventListener('visibilitychange', this.visibility);
    this.pressed.clear(); this.notify();
  }
  clear() { this.events = []; this.pressed.clear(); this.downs = this.ups = 0; this.notify(); }
  releaseTracking(reason) {
    if (!this.pressed.size) return;
    this.pressed.clear(); this.record({ type: 'info', key: reason });
  }
  record(event) { this.events.unshift(event); this.events.length = Math.min(this.events.length, this.limit); this.notify(event); }
  handle(event, type) {
    if (!this.enabled) return;
    const code = event.code || event.key || 'Unidentified';
    const editor = event.target?.closest?.('input,select,textarea,[contenteditable],button,a');
    const inTestInput = editor?.hasAttribute?.('data-keyboard-test-input');
    if (type === 'down' && editor && !inTestInput) return;
    // Suppress scrolling/page shortcuts in the dedicated capture area only.
    // Tab remains available for keyboard navigation. Normal form input is untouched.
    if (event.target?.closest?.('#test-capture') && event.key !== 'Tab') event.preventDefault();
    const at = Number.isFinite(event.timeStamp) ? event.timeStamp : 0;
    if (type === 'down') {
      if (event.repeat || this.pressed.has(code)) return;
      this.pressed.set(code, { key: event.key, at }); ++this.downs;
      this.record({ type, code, key: event.key, at });
    } else if (this.pressed.has(code)) {
      const held = this.pressed.get(code); this.pressed.delete(code); ++this.ups;
      this.record({ type, code, key: event.key, at, duration: Math.max(0, Math.round(at - held.at)) });
    }
  }
}

export function mountKeyboardTest(doc, target) {
  const $ = id => doc.getElementById(id);
  let toastTimer;
  const tester = new KeyboardTester({ target, doc, onChange(state, event) {
    $('test-toggle').textContent = state.enabled ? '关闭键盘测试' : '打开键盘测试';
    $('test-toggle').setAttribute('aria-pressed', String(state.enabled));
    $('test-status').textContent = state.enabled ? '测试已开启' : '测试已关闭';
    $('test-down-count').textContent = state.downs; $('test-up-count').textContent = state.ups;
    $('test-held').replaceChildren();
    if (!state.pressed.size) $('test-held').textContent = '暂无按住的按键';
    for (const code of state.pressed.keys()) { const key = doc.createElement('kbd'); key.textContent = code; $('test-held').append(key); }
    $('test-events').replaceChildren();
    if (!state.events.length) { const item = doc.createElement('li'); item.className = 'empty-event'; item.textContent = '开启测试后，按下键盘查看记录。'; $('test-events').append(item); }
    for (const entry of state.events) {
      const item = doc.createElement('li'); item.className = `event-${entry.type}`;
      if (entry.type === 'info') item.textContent = entry.key;
      else {
        const action = doc.createElement('span'); action.textContent = entry.type === 'down' ? '按下' : '释放';
        const code = doc.createElement('kbd'); code.textContent = entry.code;
        const detail = doc.createElement('span'); detail.textContent = `${entry.key === ' ' ? 'Space' : entry.key} · ${(entry.at / 1000).toFixed(3)} s${entry.duration == null ? '' : ` · 持续 ${entry.duration} ms`}`;
        item.append(action, code, detail);
      }
      $('test-events').append(item);
    }
    if (event && event.type !== 'info') {
      $('test-toast').textContent = `${event.type === 'down' ? '按下' : '释放'} ${event.code}`;
      $('test-toast').hidden = false; clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { $('test-toast').hidden = true; }, 1000);
    }
  } });
  $('test-toggle').addEventListener('click', () => {
    if (tester.enabled) {
      tester.stop(); clearTimeout(toastTimer); $('test-toast').hidden = true;
    } else {
      $('keyboard-test').hidden = false; tester.start(); $('test-capture').focus({ preventScroll: true });
      $('keyboard-test').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
  $('test-clear').addEventListener('click', () => {
    tester.clear(); $('test-text').value = ''; clearTimeout(toastTimer); $('test-toast').hidden = true;
    if (tester.enabled) $('test-capture').focus({ preventScroll: true });
  });
  target.addEventListener('pagehide', () => { tester.stop(); clearTimeout(toastTimer); });
  tester.notify();
  return tester;
}
