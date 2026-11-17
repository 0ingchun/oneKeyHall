// Config-only UI: the CH552 generates HID reports independently of this page.
export const linearDefaults = Object.freeze({ preset: 4, reverseOnDoubleClick: false, wheelMax: 30, volumeMin: 0, volumeMax: 100, volumeSteps: 50, x: 50, y: 50, areaMin: .01, areaMax: .25, pressureMin: 1, pressureMax: 255 });
export const supportsNativeLinear = c => (c?.[0] === 4 || c?.[0] === 5 || c?.[0] === 6) && c.length === 137;
export function validateLinear(c) {
  for (const [key, lo, hi, scale] of [
    ['preset', 0, 7, 1], ['wheelMax', 1, 100, 1], ['volumeMin', 0, 100, 1], ['volumeMax', c.volumeMin, 100, 1],
    ['volumeSteps', 1, 100, 1], ['x', 0, 100, 100], ['y', 0, 100, 100],
    ['areaMin', .01, 2.5, 100], ['areaMax', c.areaMin, 2.5, 100], ['pressureMin', 0, 255, 1], ['pressureMax', c.pressureMin, 255, 1],
  ]) {
    const value = c[key];
    if (!Number.isFinite(value) || value < lo || value > hi || Math.abs(value * scale - Math.round(value * scale)) > 1e-7) throw new Error(`线性参数 ${key} 超出范围或步长无效。`);
  }
  if (typeof c.reverseOnDoubleClick !== 'boolean' || (c.preset === 4 && c.reverseOnDoubleClick)) throw new Error('当前光标左键预设不支持双击反向。');
  return c;
}
export function decodeLinear(c) {
  if (!supportsNativeLinear(c)) return { ...linearDefaults };
  return { preset: c[124] & 7, reverseOnDoubleClick: c[0] >= 6 && !!(c[124] & 128), wheelMax: c[125], volumeMin: c[126], volumeMax: c[127], volumeSteps: c[128],
    x: Math.round((c[129] | c[130] << 8) * 10000 / 32767) / 100,
    y: Math.round((c[131] | c[132] << 8) * 10000 / 32767) / 100,
    areaMin: c[133] / 100, areaMax: c[134] / 100, pressureMin: c[135], pressureMax: c[136] };
}
export function encodeLinear(c, settings) {
  if (!supportsNativeLinear(c)) return c;
  const s = validateLinear(settings), x = Math.round(s.x * 32767 / 100), y = Math.round(s.y * 32767 / 100);
  if (s.reverseOnDoubleClick && c[0] < 6) throw new Error('双击反向需要 V2.6.0 或更新固件。');
  c.splice(124, 13, s.preset | (s.reverseOnDoubleClick ? 128 : 0), s.wheelMax, s.volumeMin, s.volumeMax, s.volumeSteps, x & 255, x >> 8, y & 255, y >> 8,
    Math.round(s.areaMin * 100), Math.round(s.areaMax * 100), s.pressureMin, s.pressureMax);
  return c;
}
export function linearValue(c, position, top = 3, reversed = false) {
  const p = Math.floor(Math.max(0, Math.min(100, (position - top) * 100 / (100 - top))));
  const preset = c.preset < 4 && reversed ? c.preset ^ 1 : c.preset;
  const mix = (a, b) => a + Math.floor((b - a) * (reversed ? 100 - p : p) / 100);
  const volume = c.volumeMin + Math.floor((c.volumeMax - c.volumeMin) * (preset === 1 ? 100 - p : p) / 100);
  return { volume, wheel: p * c.wheelMax / 100, area: (c.preset === 6 ? c.areaMin : mix(Math.round(c.areaMin * 100), Math.round(c.areaMax * 100)) / 100),
    pressure: c.preset === 5 ? c.pressureMax : mix(c.pressureMin, c.pressureMax) };
}
export function mountLinear(doc, canSync, canReverse = () => false) {
  const $ = id => doc.getElementById(id), fields = Object.keys(linearDefaults);
  let lastPosition = 0, pressed = false, connected = false, reversed = null;
  const read = () => validateLinear(Object.fromEntries(fields.map(key => [key, key === 'reverseOnDoubleClick' ? !!$('linear-reverseOnDoubleClick').checked : $(`linear-${key}`).value === '' ? NaN : Number($(`linear-${key}`).value)])));
  function preview() {
    $('linear-sync').disabled = !canSync();
    const cursor = Number($('linear-preset').value) === 4;
    $('linear-reverseOnDoubleClick').disabled = !canReverse() || cursor;
    if (cursor) $('linear-reverseOnDoubleClick').checked = false;
    $('linear-reverse-support').textContent = canReverse() ? '双击切换方向，再次双击切回；使用上方双击间隔，修改设置或重新上电后回到所选预设方向。双击时仍会输出当前预设动作。' : '双击反向需要 V2.6.0 或更新固件。';
    try {
      const c = read(), touch = c.preset >= 5;
      $('linear-volume-fields').hidden = c.preset >= 2;
      $('linear-wheel-fields').hidden = c.preset < 2 || c.preset > 3;
      $('linear-touch-fields').hidden = !touch;
      $('linear-cursor-note').hidden = c.preset !== 4;
      $('linear-sync').hidden = c.preset >= 2;
      $('linear-touch-preview').hidden = !touch;
      const v = linearValue(c, lastPosition, Number($('top').value), reversed === true);
      $('linear-preview').textContent = !connected ? '连接设备后预览行程' : c.preset < 2 ? `估算目标音量 ${v.volume}%` : c.preset < 4 ? `滚轮目标 ${v.wheel.toFixed(1)} 格/秒` : c.preset === 4 ? (pressed ? '鼠标左键 · 按住' : '鼠标左键 · 松开') : `接触面积 ${v.area.toFixed(2)}% 屏幕 · 压力 ${v.pressure}/255`;
      $('linear-direction').textContent = !connected ? '等待设备' : reversed === null ? '当前固件未上报方向' : reversed ? '当前方向：反向' : '当前方向：所选预设';
      $('linear-dot').style.width = $('linear-dot').style.height = `${Math.min(140, Math.sqrt(v.area) * 80)}px`;
      $('linear-dot').style.opacity = String(.15 + .85 * v.pressure / 255);
      $('linear-preview-note').textContent = '按表单和行程计算的预览，有效修改会自动应用。系统实际音量、滚动距离及应用接收值可能不同。';
    } catch (error) { $('linear-preview').textContent = error.message; }
  }
  for (const key of fields) $(`linear-${key}`).addEventListener('input', preview);
  $('top').addEventListener('input', preview);
  function render(c) {
    const s = decodeLinear(c);
    for (const key of fields) { if (key === 'reverseOnDoubleClick') $('linear-reverseOnDoubleClick').checked = s[key]; else $(`linear-${key}`).value = s[key]; }
    preview();
  }
  render(null);
  return { render, write(c) { return encodeLinear(c, read()); }, refresh: preview,
    disconnected() { connected = false; reversed = null; lastPosition = 0; pressed = false; preview(); },
    sample(s) { reversed = s.length >= 13 ? !!s[12] : null; connected = !!s[5]; lastPosition = s[3]; pressed = !!s[4]; preview(); } };
}
