import test from 'node:test';
import assert from 'node:assert/strict';
import { supportsFactoryReset, resetToFactory, factoryResetConfirmation } from '../host/assets/factory-reset.mjs';
import { createAutoApply } from '../host/assets/auto-apply.mjs';
import { translateText } from '../host/assets/i18n.mjs';

test('factory reset is gated by the actual application release, with bilingual scope confirmation', () => {
  for (const version of ['2.6.1', '2.6.12', '2.7.0', '3.0.0']) assert(supportsFactoryReset({ version }));
  for (const version of ['2.6.0', '2.5.9', '1.9.9', '', 'bad']) assert(!supportsFactoryReset({ version }));
  assert(!supportsFactoryReset(null));
  assert(!/[\u4e00-\u9fff]/u.test(translateText(factoryResetConfirmation, 'en')));
});

test('declining factory reset leaves pending edits intact and sends nothing', async () => {
  const result = await resetToFactory({ command: assert.fail, config: assert.fail },
    { confirm: () => false, cancelPending: assert.fail });
  assert.equal(result, null);
});

test('confirmed factory reset cancels a pending auto-apply, then reads verified defaults', async () => {
  let timer; const calls = [], defaults = [6, 0, 0, 0];
  const auto = createAutoApply({ canApply: () => true, apply: () => calls.push('stale apply'),
    onError: assert.fail, setTimer: fn => { timer = fn; return 1; }, clearTimer: () => { timer = null; } });
  auto.schedule(); const delayed = timer;
  const result = await resetToFactory({
    async command(id) { calls.push(id); assert.equal(timer, null); },
    async config() { calls.push('read'); return defaults; },
  }, { confirm: () => true, cancelPending: () => auto.cancel() });
  await delayed();
  assert.deepEqual(calls, [15, 'read']); assert.equal(result, defaults);
});

test('factory reset rejection and disconnected readback propagate failure without automatic retry', async () => {
  let sends = 0, reads = 0;
  const options = { confirm: () => true, cancelPending() {} };
  await assert.rejects(resetToFactory({ command() { ++sends; throw Error('storage failure'); },
    config() { ++reads; } }, options), /storage failure/);
  assert.equal(sends, 1); assert.equal(reads, 0);
  await assert.rejects(resetToFactory({ command() { ++sends; },
    config() { ++reads; throw Error('disconnected'); } }, options), /disconnected/);
  assert.equal(sends, 2); assert.equal(reads, 1);
});
