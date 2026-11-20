import test from 'node:test';
import assert from 'node:assert/strict';
import { supportsOutputSwitches, writeOutputSwitches } from '../host/assets/output-switches.mjs';
import { validateConfig } from '../host/assets/protocol.mjs';
import { encodeLinear, linearDefaults } from '../host/assets/device-linear.mjs';
import { mountLighting } from '../host/assets/lighting.mjs';

test('output switches require reported firmware 2.6.2 or newer', () => {
  for (const version of ['2.6.1', '2.5.9', '', 'invalid']) assert(!supportsOutputSwitches({version}));
  for (const version of ['2.6.2', '2.6.10', '2.7.0', '3.0.0']) assert(supportsOutputSwitches({version}));
  assert(!supportsOutputSwitches(null));
});
test('lighting switch and work mode are independent and preserve mappings and lighting parameters', () => {
  for (let flags = 0; flags <= 2; flags += 2) {
    const config = Array.from({length: 137}, (_, i) => i);
    const before = [...config];
    writeOutputSwitches(config, true, !!(flags & 2));
    assert.equal(config[7], flags);
    config[7] = before[7]; assert.deepEqual(config, before);
  }
});
test('unsupported firmware cannot receive mute flags through form encoding', () => {
  const config = Array(137).fill(0);
  writeOutputSwitches(config, false, true);
  assert.equal(config[7], 0);
});

test('disabled output mode accepts RT and independent lighting; invalid modes and reserved flags are rejected', () => {
  const config = Array(137).fill(0); config[0] = 6; config[5] = 20;
  config.splice(89, 11, 1, 100, 200, 50, 40, 1, 5, 5, 2, 2, 3);
  encodeLinear(config, linearDefaults); config[4] = 4;
  for (const lightOff of [false, true]) {
    writeOutputSwitches(config, true, lightOff); validateConfig(config);
    assert.equal(config[4], 4);
  }
  config[4] = 5; assert.throws(() => validateConfig(config)); config[4] = 4;
  for (const flags of [1, 3, 4, 255]) { config[7] = flags; assert.throws(() => validateConfig(config)); }
  config[7] = 0; config[0] = 5; assert.throws(() => validateConfig(config));
});

test('off is an exclusive lighting choice; reads back, preserves parameters and clears when choosing another effect', () => {
  class Element extends EventTarget { value = ''; checked = false; hidden = false; style = {}; }
  const nodes = new Map();
  const get = id => { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); };
  const radios = Array.from({length: 8}, (_, value) => Object.assign(new Element(), {value: String(value)}));
  get('rgb-mode').value = '2'; get('rgb-color').value = '#123456'; get('brightness').value = '128';
  const lighting = mountLighting({getElementById: get, querySelectorAll: () => radios});
  for (let mode = 0; mode < 7; ++mode) {
    const c = Array(137).fill(0); c[4] = 4; c[14] = mode; c[15] = 170; c[16] = 0;
    lighting.render(c);
    radios[7].checked = true; radios[7].dispatchEvent(new Event('change'));
    assert.deepEqual(radios.map(r => r.checked), [false,false,false,false,false,false,false,true]);
    for (const id of ['rgb-channels', 'rgb-animation', 'rgb-hue', 'rgb-brightness']) assert(get(id).hidden);
    lighting.sample([1001, 200, 200, 100, 1, 1, 1, 0, 100, 0]);
    assert.equal(get('rgb-swatch').style.opacity, 0);
    const before = [...c]; c[14] = 7; lighting.write(c, true);
    before[7] = 2; assert.deepEqual(c, before);
    lighting.render(c); assert(radios[7].checked);
    assert.throws(() => lighting.write(c, false));
    radios[mode].checked = true; radios[mode].dispatchEvent(new Event('change'));
    c[14] = Number(get('rgb-mode').value); lighting.write(c, true);
    assert.equal(c[7], 0); assert.equal(c[14], mode); assert.equal(c[4], 4);
  }
  lighting.support(true, false); assert(radios[7].disabled); assert(!radios[6].disabled);
  lighting.support(false, true); assert(!radios[7].disabled); assert(radios[6].disabled);
});
