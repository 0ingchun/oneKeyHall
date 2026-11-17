import test from 'node:test';
import assert from 'node:assert/strict';
import { SerialClient, validateConfig } from '../host/assets/protocol.mjs';
import { deviceName, writeDeviceSettings } from '../host/assets/device-settings.mjs';
import { linearDefaults, encodeLinear, supportsNativeLinear } from '../host/assets/device-linear.mjs';
import { linearLight, hueColor, mountLighting } from '../host/assets/lighting.mjs';
function config(version = 5) {
  const c = Array(137).fill(0); c[0] = version; c[5] = 20;
  c.splice(89, 11, 1, 100, 200, 50, 40, 0, 5, 5, 2, 2, 3);
  return encodeLinear(c, linearDefaults);
}
test('identity command validates frame shape, formats boot version and full 40-bit UID, and handles unknown/legacy', async () => {
  const client = new SerialClient({});
  for (const lo of [0x31, 0x40, 0x50, 0x99]) {
    client.request = async (key, value, match) => {
      assert.equal(key, 999); assert.equal(value, 6);
      for (const bad of [[1004], [1004,lo,2,50,66,209,190,256], [1003,2,5,0,1]]) assert(!match(bad));
      const frame = [1004,lo,2,50,66,209,190,165]; assert(match(frame)); return frame;
    };
    const identity = await client.deviceIdentity();
    assert.equal(identity.bootloaderVersion, `2.${lo.toString(16)}`);
    assert.equal(identity.uid, '3242D1BEA5');
    assert.equal(deviceName(config(), identity), 'oneKeyHall3242D1BEA5');
    const c = config(); writeDeviceSettings(c, '自定义', 200); assert.equal(deviceName(c, identity), '自定义');
  }
  for (const [lo, hi] of [[0,0], [0xfa,2], [0x50,255]]) {
    client.request = async () => [1004,lo,hi,0,0,0,0,1];
    assert.equal((await client.deviceIdentity()).bootloaderVersion, null);
  }
  client.request = async (k,v,match) => { const f = [1000,6,1]; assert(match(f)); return f; };
  assert.equal(await client.deviceIdentity(), null);
});
test('V5 preserves native mode and device settings while enabling seven LED modes; V4 still rejects travel LED', async () => {
  const c = config(); assert(supportsNativeLinear(c));
  writeDeviceSettings(c, 'Hall', 500); assert.equal(deviceName(c), 'Hall');
  for (let mode = 0; mode <= 6; ++mode) { c[14] = mode; assert.equal(validateConfig(c), c); }
  c[14] = 7; assert.throws(() => validateConfig(c));
  const old = config(4); validateConfig(old); old[14] = 3; assert.throws(() => validateConfig(old));
  c[14] = 6; c[2] = 2; c[3] = 1;
  const client = new SerialClient({}); client.request = async (k,v,match) => { assert(match(c)); return c; };
  assert.equal(await client.releaseCount(), 513);
});
test('lighting preview matches firmware integer HSV colors and travel interpolation', () => {
  for (let hue = 0; hue < 256; ++hue) {
    const region = Math.floor(hue / 43), r = (hue - region * 43) * 6;
    const q = (255 * (255 - ((255 * r) >> 8))) >> 8;
    const t = (255 * (255 - ((255 * (255 - r)) >> 8))) >> 8;
    assert.deepEqual(hueColor(hue), [[255,t,0],[q,255,0],[0,255,t],[0,q,255],[t,0,255],[255,0,q]][region]);
  }
  for (let p = 0; p <= 100; ++p) {
    assert.equal(linearLight(3,p,200,0,255,'#ff0000').level, p*2);
    assert.equal(linearLight(4,p,200,0,255,'#ff0000').level, 200-p*2);
    assert.equal(linearLight(5,p,200,255,0,'#ff0000').hue, 255-Math.floor(255*p/100));
    assert.equal(linearLight(5,p,200,0,255,'#ff0000').level, 200);
    assert.equal(linearLight(6,p,200,0,255,'#ff0000').level, p*2);
    assert.equal(linearLight(4,p,200,0,255,'#ff0000',false).level, 0);
  }
});
test('travel LED controls render/persist zero hue endpoints, gate old devices and preserve drafts during polling', () => {
  class Element extends EventTarget { value = ''; checked = false; hidden = false; style = {}; textContent = ''; }
  const nodes = new Map(); const get = id => { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); };
  const radios = Array.from({length:7}, (_,value) => Object.assign(new Element(), {value:String(value)}));
  get('rgb-mode').value = '6'; get('rgb-color').value = '#ff0000'; get('brightness').value = '200';
  const lighting = mountLighting({getElementById:get,querySelectorAll:()=>radios});
  const c = config(); c[14] = 6; c[15] = 255; c[16] = 0; lighting.render(c);
  assert.equal(get('rgb-hue-end').value, 0); assert.equal(get('rgb-step').value, 1);
  assert(get('rgb-channels').hidden && get('rgb-animation').hidden && !get('rgb-hue').hidden);
  get('rgb-hue-start').value = 170;
  lighting.sample([1001,150,150,50,1,1,1,0,100,0]);
  assert.equal(get('rgb-hue-start').value,170); assert.equal(get('rgb-swatch').style.opacity,100/255);
  assert.match(get('rgb-preview-note').textContent,/50%/);
  lighting.write(c); assert.equal(c[15],170); assert.equal(c[16],0);
  lighting.sample(null); assert.equal(get('rgb-swatch').style.opacity,0);
  lighting.support(false); assert(radios.slice(3).every(r=>r.disabled));
  lighting.support(true); assert(radios.slice(3).every(r=>!r.disabled));
});
