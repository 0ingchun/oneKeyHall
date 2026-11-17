import test from 'node:test';
import assert from 'node:assert/strict';
import { KeyboardTester } from '../host/assets/keyboard-test.mjs';
import { rtMarkers } from '../host/assets/rt-markers.mjs';
import { createBootFeedback } from '../host/assets/boot-feedback.mjs';

test('boot request feedback clears on refresh, removes old history, and tolerates blocked storage', () => {
  let saved = '[{"time":"old","text":"previous request"}]', rendered;
  const storage = {
    getItem() { assert.fail('History must not be loaded'); },
    setItem() { assert.fail('History must not be persisted'); },
    removeItem(key) { assert.equal(key, 'onekeyhall-boot-events'); saved = null; },
  };
  const record = createBootFeedback(storage, events => { rendered = events; }, () => '2026-11-16T16:00:00.000Z');
  assert.deepEqual(rendered, []);
  assert.equal(saved, null);
  for (let n = 0; n < 15; n++) record(`stage ${n}`);
  assert.equal(rendered.length, 12); assert.equal(rendered[0].text, 'stage 3');
  createBootFeedback(storage, events => { rendered = events; });
  assert.deepEqual(rendered, []);
  const blocked = { removeItem() { throw new Error(); } };
  const transient = createBootFeedback(blocked, events => { rendered = events; });
  transient('ACK received'); assert.equal(rendered[0].text, 'ACK received');
});

function keyboard() {
  const target = new EventTarget(), doc = new EventTarget();
  const tester = new KeyboardTester({ target, doc });
  const send = (type, code = 'KeyA', options = {}) => {
    const event = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries({ code, key: 'a', timeStamp: 100, ...options })) {
      Object.defineProperty(event, key, { value });
    }
    target.dispatchEvent(event); return event;
  };
  return { tester, target, doc, send };
}
test('keyboard test is opt-in, counts physical transitions and detaches on stop', () => {
  const { tester: t, send } = keyboard();
  send('keydown'); assert.equal(t.downs, 0);
  t.start(); t.start(); send('keydown'); send('keydown'); send('keydown', 'KeyA', { repeat: true });
  send('keydown', 'ShiftLeft', { key: 'Shift' });
  assert.equal(t.downs, 2); assert.equal(t.pressed.size, 2);
  send('keyup', 'KeyA', { timeStamp: 145 });
  assert.equal(t.ups, 1); assert.equal(t.events[0].duration, 45);
  t.stop(); send('keydown', 'KeyB'); assert.equal(t.downs, 2); assert.equal(t.pressed.size, 0);
  t.start(); send('keydown'); assert.equal(t.downs, 3); t.stop();
});
test('keyboard capture prevents page shortcuts only in capture area and preserves Tab/form input', () => {
  const { tester: t, send } = keyboard(); t.start();
  const capture = { closest: query => query === '#test-capture' ? capture : null };
  assert(send('keydown', 'KeyA', { target: capture }).defaultPrevented);
  send('keyup', 'KeyA', { target: capture });
  assert(!send('keydown', 'Tab', { key: 'Tab', target: capture }).defaultPrevented);
  const editor = { hasAttribute: () => false, closest: query => query === '#test-capture' ? null : editor };
  assert(!send('keydown', 'KeyB', { target: editor }).defaultPrevented);
  assert(!t.pressed.has('KeyB'));
  // Key release may arrive on another element after focus changes.
  send('keyup', 'Tab', { key: 'Tab', target: editor }); assert(!t.pressed.has('Tab'));
  const testInput = { hasAttribute: () => true, closest: query => query === '#test-capture' ? null : testInput };
  assert(!send('keydown', 'KeyC', { target: testInput }).defaultPrevented);
  assert(t.pressed.has('KeyC')); t.stop();
});
test('blur and hidden page clear held keys; history is bounded and clear resets counters', () => {
  const { tester: t, target, doc, send } = keyboard(); t.start(); send('keydown');
  target.dispatchEvent(new Event('blur')); assert.equal(t.pressed.size, 0); assert.equal(t.events[0].type, 'info');
  send('keydown'); doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); assert.equal(t.pressed.size, 0);
  for (let i = 0; i < 70; i++) { send('keydown'); send('keyup'); }
  assert.equal(t.events.length, 60);
  t.clear(); assert.equal(t.events.length, 0); assert.equal(t.downs, 0); assert.equal(t.ups, 0); t.stop();
});

const settings = { enabled: true, top: 3, up: 5, down: 7 };
const status = [1001,176,176,76,1,1,1,0,100,0,80,1];
test('RT lines follow actual peak while held and valley after release', () => {
  let lines = rtMarkers(status, settings);
  assert.equal(lines.release, 75); assert.equal(lines.press, 87); assert.equal(lines.active, 'release'); assert(lines.live);
  const released = [...status]; released[3] = 69; released[4] = 0; released[10] = 65;
  lines = rtMarkers(released, settings);
  assert.equal(lines.press, 72); assert.equal(lines.active, 'press');
});
test('RT thresholds respect ADC resolution, top reset and unreachable retrigger', () => {
  const smallSpan = [...status]; smallSpan[8] = 20;
  let lines = rtMarkers(smallSpan, settings); assert.equal(lines.up, 10); assert.equal(lines.down, 10); assert.equal(lines.release, 70);
  const top = [...status]; top[10] = 5;
  assert.equal(rtMarkers(top, settings).release, 3);
  const bottom = [...status]; bottom[4] = 0; bottom[10] = 98;
  lines = rtMarkers(bottom, settings); assert.equal(lines.press, 105); assert(!lines.pressReachable);
});
test('RT lines hide when disabled/unavailable and never claim legacy, paused or faulty telemetry is live', () => {
  assert.equal(rtMarkers(status, { ...settings, enabled: false }), null);
  assert.equal(rtMarkers(null, settings), null);
  const uncalibrated = [...status]; uncalibrated[5] = 0; assert.equal(rtMarkers(uncalibrated, settings), null);
  const legacy = rtMarkers(status.slice(0, 10), settings);
  assert.equal(legacy.release, 71); assert(!legacy.telemetry); assert.equal(legacy.active, null);
  for (const [index, value] of [[7,1], [9,1], [6,0], [11,0]]) {
    const s = [...status]; s[index] = value;
    const lines = rtMarkers(s, settings); assert(!lines.live); assert.equal(lines.active, null);
  }
});
