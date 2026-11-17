import test from 'node:test';
import assert from 'node:assert/strict';
import { deviceName, doubleClickMs, writeDeviceSettings, supportsDeviceSettings } from '../host/assets/device-settings.mjs';
import { validateConfig, SerialClient } from '../host/assets/protocol.mjs';
import { calibrationSpan } from '../host/assets/calibration.mjs';
import { mountLighting } from '../host/assets/lighting.mjs';
function config() {
  const c = Array(124).fill(0); c[0] = 3; c[5] = 20;
  c.splice(89, 11, 1, 100, 200, 50, 40, 0, 5, 5, 2, 2, 3); return c;
}
test('Unicode device names and double-click intervals round trip in v3; old v2 remains compatible', () => {
  const c = config(); assert.equal(deviceName(c), 'oneKeyHall');
  writeDeviceSettings(c, '  我的磁轴 Hall  ', 350); validateConfig(c);
  assert.equal(deviceName(c), '我的磁轴 Hall'); assert.equal(doubleClickMs(c), 350);
  writeDeviceSettings(c, '十二个字符十二个字符十二', 1000); assert.equal(c[6], 12); validateConfig(c);
  writeDeviceSettings(c, '', 50); assert.equal(deviceName(c), 'oneKeyHall'); assert(c.slice(100).every(v => v === 0));
  for (const name of ['a'.repeat(13), 'a\n', '\ud800', '🙂']) assert.throws(() => writeDeviceSettings(config(), name === 'a\n' ? 'a\nb' : name, 200));
  for (const interval of [0, 49, 55, 1001, NaN]) assert.throws(() => writeDeviceSettings(config(), 'Hall', interval));
  for (const mutate of [c => c[5] = 0, c => c[6] = 13, c => { c[6] = 1; c[101] = 0xd8; }]) { const bad = config(); mutate(bad); assert.throws(() => validateConfig(bad)); }
  const old = config().slice(0, 100); old[0] = 2; old[5] = 0;
  assert(!supportsDeviceSettings(old)); assert.equal(doubleClickMs(old), 200); validateConfig(old);
  assert.deepEqual(writeDeviceSettings([...old], 'ignored', 350), old);
});
test('live counter accepts v3 frames without validating a settings draft', async () => {
  const client = new SerialClient({}); const c = config(); c[2] = 2; c[3] = 1; c[5] = 0;
  client.request = async (key, value, match) => { assert.equal(key, 999); assert.equal(value, 1); assert(match(c)); return c; };
  assert.equal(await client.releaseCount(), 513);
});
test('calibration span handles both polarities, draft status and uncalibrated state', () => {
  const c = config(); assert.equal(calibrationSpan(c).value, '100 ADC');
  [c[90], c[91]] = [200, 100]; assert.equal(calibrationSpan(c).value, '100 ADC');
  assert.match(calibrationSpan(c, true).note, /待应用/);
  c[89] = 0; assert.equal(calibrationSpan(c).value, '—'); assert.equal(calibrationSpan(null).value, '—');
});
test('original-style lighting radios/sliders stay synchronized and preserve hidden colors', () => {
  class Element extends EventTarget { value = ''; checked = false; hidden = false; style = {}; textContent = ''; }
  const nodes = new Map(); const get = id => { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); };
  const radios = [0, 1, 2].map(value => Object.assign(new Element(), { value: String(value) }));
  get('rgb-mode').value = '2'; get('rgb-color').value = '#12abff'; get('brightness').value = '128'; get('rgb-step').value = '3'; get('rgb-interval').value = '30';
  const lighting = mountLighting({ getElementById: get, querySelectorAll: () => radios });
  assert(get('rgb-channels').hidden); assert(!get('rgb-animation').hidden); assert.equal(get('rgb-g').value, 171);
  radios[0].checked = true; radios[0].dispatchEvent(new Event('change'));
  assert(!get('rgb-channels').hidden); assert(get('rgb-animation').hidden);
  get('rgb-r').value = '0'; get('rgb-r').dispatchEvent(new Event('input')); assert.equal(get('rgb-color').value, '#00abff');
  get('brightness').value = '0'; get('brightness').dispatchEvent(new Event('input')); assert.equal(get('rgb-swatch').style.opacity, 0);
  get('rgb-mode').value = '1'; lighting.refresh(); assert(!get('rgb-animation').hidden); assert.equal(get('rgb-color').value, '#00abff');
});
