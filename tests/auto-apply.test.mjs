import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutoApply } from '../host/assets/auto-apply.mjs';
import { applySettings } from '../host/assets/settings-session.mjs';

function clock() {
  let id = 0;
  const jobs = new Map();
  return {
    setTimer(fn, delay) { assert.equal(delay, 400); jobs.set(++id, fn); return id; },
    clearTimer(id) { jobs.delete(id); },
    async tick() { const batch = [...jobs.values()]; jobs.clear(); await Promise.all(batch.map(fn => fn())); },
    get size() { return jobs.size; },
  };
}
function device() {
  const c = Array(137).fill(0); c[0] = 6; c[5] = 20;
  c.splice(89, 11, 1, 100, 200, 50, 40, 0, 5, 5, 2, 2, 3);
  c.splice(124, 13, 4, 30, 0, 100, 50, 0, 64, 0, 64, 1, 25, 1, 255);
  return {
    ram: [...c], flash: [...c], backup: null, commands: [], writes: [], failIndex: null,
    async command(n) {
      this.commands.push(n);
      if (n === 10) this.backup = [...this.ram];
      if (n === 14) this.ram = [...this.backup];
      if (n === 0) this.flash = [...this.ram];
    },
    async config() { return [...this.ram]; },
    async write(i, v) {
      this.writes.push([i, v]);
      if (i === this.failIndex) throw Error('write rejected');
      this.ram[i] = v;
    },
  };
}

test('rapid edits coalesce into one RAM-only transaction; explicit save persists the latest form', async () => {
  const d = device(), time = clock(); let draft = [...d.ram];
  const auto = createAutoApply({ ...time, canApply: () => true,
    apply: () => applySettings(d, draft), onError: error => { throw error; } });
  for (const brightness of [20, 30, 80]) { draft[13] = brightness; auto.schedule(); }
  assert.equal(time.size, 1); assert.equal(d.commands.length, 0);
  await time.tick();
  assert.equal(d.ram[13], 80); assert.equal(d.flash[13], 0);
  assert.deepEqual(d.commands, [10, 13, 2]); assert.deepEqual(d.writes, [[13, 80]]);
  draft[13] = 100; auto.schedule(); auto.cancel();
  await applySettings(d, draft, true); await time.tick();
  assert.equal(d.flash[13], 100); assert.deepEqual(d.commands, [10, 13, 2, 10, 0, 2]);
});

test('calibration and other operations postpone edits; cancellation prevents delayed writes after disconnect', async () => {
  const time = clock(); let allowed = false, calls = 0;
  const auto = createAutoApply({ ...time, canApply: () => allowed, apply: async () => ++calls, onError: assert.fail });
  auto.schedule(); await time.tick(); await time.tick(); assert.equal(calls, 0);
  allowed = true; await time.tick(); assert.equal(calls, 1);
  auto.schedule(); auto.cancel(); await time.tick(); assert.equal(calls, 1);
  assert.equal(time.size, 0);
});

test('edits arriving during an apply never overlap and run once afterward', async () => {
  const time = clock(); let calls = 0, finish;
  const held = new Promise(resolve => { finish = resolve; });
  const auto = createAutoApply({ ...time, canApply: () => true,
    apply: async () => { if (++calls === 1) await held; }, onError: assert.fail });
  auto.schedule(); const first = time.tick();
  auto.schedule(); await time.tick(); assert.equal(calls, 1);
  finish(); await first; await time.tick(); assert.equal(calls, 2);
});

test('invalid intermediate input sends no command and is not repeatedly retried', async () => {
  const d = device(), time = clock(), errors = [];
  const draft = [...d.ram]; draft[92] = 30; // Below release threshold.
  const auto = createAutoApply({ ...time, canApply: () => true,
    apply: () => applySettings(d, draft), onError: error => errors.push(error) });
  auto.schedule(); await time.tick(); await time.tick();
  assert.equal(errors.length, 1); assert.deepEqual(d.commands, []);
  draft[92] = 60; auto.schedule(); await time.tick();
  assert.equal(d.ram[92], 60); assert.equal(d.flash[92], 50);
});

test('device calibration endpoints survive stale browser snapshots and unrelated setting changes', async () => {
  const d = device(), draft = [...d.ram];
  d.ram[90] = 110; d.ram[91] = 210; draft[13] = 90;
  const result = await applySettings(d, draft);
  assert.deepEqual(result.slice(89, 92), [1, 110, 210]);
  assert.deepEqual(d.writes, [[13, 90]]); assert.equal(d.flash[90], 100);
});

test('rejected writes roll back the open session without writing flash', async () => {
  const d = device(), original = [...d.ram], draft = [...d.ram];
  draft[13] = 80; draft[92] = 60; d.failIndex = 92;
  await assert.rejects(applySettings(d, draft), /write rejected/);
  assert.deepEqual(d.commands, [10, 14]);
  assert.deepEqual(d.ram, original); assert.deepEqual(d.flash, original);
});

test('mismatched readback is reported rather than claimed as successfully applied', async () => {
  const d = device(), draft = [...d.ram]; draft[13] = 80;
  d.write = async () => {}; // Device ACKs but ignores a requested write.
  await assert.rejects(applySettings(d, draft), /回读与请求不一致/);
  assert.deepEqual(d.commands, [10, 13]); assert.equal(d.flash[13], 0);
});
