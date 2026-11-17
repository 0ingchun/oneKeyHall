import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateConfig, SerialClient } from '../host/assets/protocol.mjs';
import { deviceName, writeDeviceSettings } from '../host/assets/device-settings.mjs';
import { linearDefaults, validateLinear, decodeLinear, encodeLinear, linearValue, mountLinear } from '../host/assets/device-linear.mjs';

function config() {
  const c = Array(137).fill(0); c[0] = 4; c[5] = 20;
  c.splice(89, 11, 1, 100, 200, 50, 40, 0, 5, 5, 2, 2, 3);
  return encodeLinear(c, linearDefaults);
}
test('native config preserves names and text; roundtrips all presets and endpoint parameters', () => {
  const c = config(); c[23] = 65;
  writeDeviceSettings(c, '磁轴oneKeyHall', 1000);
  assert.equal(deviceName(c), '磁轴oneKeyHall');
  const original = c.slice(0, 124);
  for (let preset = 0; preset < 8; ++preset) {
    const s = { ...linearDefaults, preset, x: 0, y: 100, areaMax: 2.5, pressureMin: 0, volumeSteps: 100 };
    encodeLinear(c, s); validateConfig(c); assert.deepEqual(decodeLinear(c), s);
    assert.deepEqual(c.slice(0, 124), original);
  }
  for (const bad of [{ preset: 8 }, { wheelMax: 0 }, { volumeSteps: 0 }, { volumeSteps: 101 }, { volumeMin: 80, volumeMax: 20 }, { x: -1 }, { y: 101 }, { areaMin: 0 }, { areaMax: 2.51 }, { pressureMax: 256 }, { pressureMin: 100, pressureMax: 99 }, { x: NaN }]) {
    assert.throws(() => validateLinear({ ...linearDefaults, ...bad }));
  }
  for (const [index, value] of [[124,8],[125,0],[128,0],[130,128],[132,128],[133,0],[134,251],[135,255]]) {
    const bad = config(); bad[136] = 200; bad[index] = value; assert.throws(() => validateConfig(bad));
  }
});
test('native preview endpoints, deadzone and independent area/pressure match device scales', () => {
  const c = { ...linearDefaults, preset: 0 };
  assert.equal(linearValue(c, 0).volume, 0); assert.equal(linearValue(c, 3).wheel, 0);
  assert.equal(linearValue(c, 100).volume, 100);
  assert.equal(linearValue({ ...c, preset: 1 }, 0).volume, 100);
  assert.equal(linearValue({ ...c, preset: 1 }, 100).volume, 0);
  const half = linearValue({ ...c, preset: 7 }, 51, 2);
  assert.equal(half.area, .13); assert.equal(half.pressure, 128); assert.equal(half.wheel, 15);
  assert.equal(linearValue({ ...c, preset: 6 }, 100).area, .01);
  assert.equal(linearValue({ ...c, preset: 5 }, 51).pressure, 255);
});
test('native UI only reads/writes config, shows preset fields and clears disconnected preview', async () => {
  const html = await readFile(new URL('../host/index.html', import.meta.url), 'utf8');
  const nodes = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [id, {
    value: '', hidden: false, disabled: false, style: {}, textContent: '', events: {},
    addEventListener(type, fn) { this.events[type] = fn; },
  }]));
  const $ = id => { assert(nodes.has(id), `Missing HTML id ${id}`); return nodes.get(id); };
  $('top').value = 3; let canSync = false;
  const panel = mountLinear({ getElementById: $ }, () => canSync);
  panel.render(config()); assert.equal($('linear-preset').value, 4);
  assert(!$('linear-cursor-note').hidden && $('linear-touch-fields').hidden);
  $('linear-preset').value = 7; $('linear-preset').events.input();
  assert(!$('linear-touch-fields').hidden && $('linear-cursor-note').hidden);
  panel.sample([1001, 200, 200, 100, 1, 1, 1, 0, 100, 0]);
  assert.match($('linear-preview').textContent, /255\/255/);
  const c = config(); panel.write(c); assert.equal(c[124], 7);
  $('linear-preset').value = 0; canSync = true; panel.refresh(); assert(!$('linear-sync').disabled);
  panel.disconnected(); assert.match($('linear-preview').textContent, /连接设备/);
  $('linear-x').value = ''; assert.throws(() => panel.write(config()));
  const server = await readFile(new URL('../host/server.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(server, /NativeBridge|createLinearApi/);
});
test('V4 config and release count are read from serial, no write or helper required', async () => {
  let incoming; const c = config(); c[2] = 2; c[3] = 1; const sent = [];
  const port = { readable: new ReadableStream({ start(s) { incoming = s; } }), writable: new WritableStream({ write(bytes) {
    sent.push(new TextDecoder().decode(bytes)); incoming.enqueue(new TextEncoder().encode(JSON.stringify(c)));
  } }), async close() {} };
  const client = new SerialClient(port); client.start();
  try { assert.deepEqual(await client.config(), c); assert.equal(await client.releaseCount(), 513); }
  finally { await client.close(); }
  assert.deepEqual(sent, ['{999:1}', '{999:1}']);
});
