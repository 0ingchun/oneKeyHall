import test from 'node:test';
import assert from 'node:assert/strict';
import { FrameDecoder, SerialClient, validateConfig } from '../host/assets/protocol.mjs';

function config() {
  const c = Array(100).fill(0); c[0] = 2;
  [c[89], c[90], c[91], c[92], c[93], c[94], c[95], c[96], c[97], c[98], c[99]] = [1, 100, 200, 50, 40, 0, 5, 5, 2, 2, 3];
  return c;
}
test('framing accepts every possible split of config + telemetry + ACK', () => {
  const frames = [config(), [1001, 100, 100, 0, 0, 1, 1, 0, 100, 0], [1000, 12, 0]];
  const wire = frames.map(JSON.stringify).join('\n');
  for (let split = 0; split <= wire.length; split++) {
    const decoder = new FrameDecoder();
    assert.deepEqual([...decoder.push(wire.slice(0, split)), ...decoder.push(wire.slice(split))], frames);
  }
});
test('framing discards garbage, malformed frames and unbounded partial input', () => {
  const decoder = new FrameDecoder();
  assert.deepEqual(decoder.push('junk][bad][[1000,10,0]["string"]'), [[1000, 10, 0]]);
  decoder.push('[' + '0'.repeat(5000)); assert.equal(decoder.buffer.length, 0);
  assert.deepEqual(decoder.push('[1000,14,0]'), [[1000, 14, 0]]);
});
test('config rejects old firmware, bad calibration, incompatible modes and bad parameters', () => {
  assert.deepEqual(validateConfig(config()), config());
  for (const mutate of [c => c.splice(89), c => c[0] = 1, c => c[92] = 40, c => c[91] = 110,
    c => c[90] = 0, c => c[97] = 4, c => c[98] = 0, c => c[95] = 0,
    c => { c[94] = 1; c[4] = 2; }, c => c[18] = NaN]) {
    const c = config(); mutate(c); assert.throws(() => validateConfig(c));
  }
  const reverse = config(); reverse[90] = 200; reverse[91] = 100; validateConfig(reverse);
  const fresh = config(); fresh[89] = fresh[90] = fresh[91] = 0; validateConfig(fresh);
});
function fakePort(respond, endAfterReply = false) {
  let stream;
  const sent = [];
  const port = {
    sent, closed: false,
    readable: new ReadableStream({ start(controller) { stream = controller; } }),
    writable: new WritableStream({ async write(bytes) {
      const text = new TextDecoder().decode(bytes); sent.push(text);
      const response = await respond(text);
      if (response != null) {
        const middle = Math.floor(response.length / 2);
        stream.enqueue(new TextEncoder().encode(response.slice(0, middle)));
        stream.enqueue(new TextEncoder().encode(response.slice(middle)));
        if (endAfterReply) stream.close();
      }
    } }),
    async close() { this.closed = true; },
    end() { stream.close(); }
  };
  return port;
}
test('serial queue matches config/status/ACK and does not treat interleaved telemetry as ACK', async () => {
  const port = fakePort(text => {
    if (text === '{999:1}') return JSON.stringify(config());
    if (text === '{999:3}') return '[1001,101,100,0,0,1,1,0,100,0]';
    if (text === '{999:10}') return '[1001,101,100,0,0,1,1,1,100,0][1000,10,0]';
    if (text === '{92:60}') return '[1000,92,0]';
    if (text === '{999:12}') return '[1000,12,4]';
  });
  const client = new SerialClient(port); client.start();
  try {
    const [c, s] = await Promise.all([client.config(), client.status()]);
    assert.equal(c[90], 100); assert.equal(s[1], 101);
    await client.command(10); await client.write(92, 60);
    await assert.rejects(client.command(12), /16/);
    assert.deepEqual(port.sent, ['{999:1}', '{999:3}', '{999:10}', '{92:60}', '{999:12}']);
  } finally { await client.close(); }
  assert(port.closed && !port.readable.locked && !port.writable.locked);
});
test('release count reads the live device counter without writes or settings validation', async () => {
  const counts = [513, 65535, 0];
  const port = fakePort(() => {
    const c = config(), count = counts.shift();
    c[2] = count >> 8; c[3] = count & 255;
    c[93] = c[92]; // A transient invalid settings draft must not block counter reads.
    return '[1001,101,100,0,0,1,1,0,100,0]' + JSON.stringify(c);
  });
  const client = new SerialClient(port); client.start();
  try {
    assert.equal(await client.releaseCount(), 513);
    assert.equal(await client.releaseCount(), 65535);
    assert.equal(await client.releaseCount(), 0);
    assert.deepEqual(port.sent, ['{999:1}', '{999:1}', '{999:1}']);
  } finally { await client.close(); }
});

test('closing rejects pending and queued operations and releases stream locks', async () => {
  const port = fakePort(() => null); const client = new SerialClient(port); client.start();
  const waiting = assert.rejects(client.status(), /关闭/);
  const queued = assert.rejects(client.command(10), /关闭/);
  await new Promise(resolve => setTimeout(resolve, 5));
  await client.close(); await waiting; await queued;
  assert.deepEqual(port.sent, ['{999:3}']); assert(port.closed);
});
test('unexpected stream EOF rejects waiting operation and reports disconnection', async () => {
  const port = fakePort(() => null); let disconnected = false;
  const client = new SerialClient(port, () => { disconnected = true; }); client.start();
  const rejected = assert.rejects(client.status(), /断开/);
  await new Promise(resolve => setTimeout(resolve, 5)); port.end();
  await rejected; assert(disconnected); await client.close();
  assert(port.closed && !port.readable.locked && !port.writable.locked);
});

test('write failures close the transport and prevent subsequent requests', async () => {
  const port = fakePort(() => { throw new Error('write failed'); });
  const client = new SerialClient(port); client.start();
  await assert.rejects(client.command(10), /write failed/);
  await assert.rejects(client.command(10), /关闭/);
  await client.close(); assert(port.closed);
});
test('timeout closes desynchronized transport; no queued request can consume a late ACK', async () => {
  const port = fakePort(() => null); const client = new SerialClient(port); client.start();
  const timeout = assert.rejects(client.command(10), /超时/);
  const queued = assert.rejects(client.command(10), /关闭/);
  await timeout; await queued; await client.close();
  assert.deepEqual(port.sent, ['{999:10}']); assert(port.closed);
});

test('capability detection supports both new and earlier v2 firmware', async () => {
  for (const [response, expected] of [['[1002,6]', 6], ['[1002,7]', 7], ['[1002,2]', 2], ['[1002,3]', 3], ['[1002,1]', 1], ['[1000,4,1]', 0]]) {
    const port = fakePort(() => response); const client = new SerialClient(port); client.start();
    assert.equal(await client.capabilities(), expected);
    assert.deepEqual(port.sent, ['{999:4}']); await client.close();
  }
});

test('firmware version uses the device release reply and handles older firmware honestly', async () => {
  for (const [reply, expected] of [
    ['[1003,2,1,0,1]', { version: '2.1.0', isp: true }],
    ['[1003,2,1,0,0]', { version: '2.1.0', isp: false }],
    ['[1000,5,1]', null],
  ]) {
    const port = fakePort(text => text === '{999:5}' ? reply : JSON.stringify(config()));
    const client = new SerialClient(port); client.start();
    try {
      assert.deepEqual(await client.firmwareVersion(), expected);
      assert.equal((await client.config())[0], 2);
      assert.deepEqual(port.sent, ['{999:5}', '{999:1}']);
    } finally { await client.close(); }
  }
});

test('extended status preserves the firmware RT extremum and cycle flag', async () => {
  const status = [1001,175,175,75,0,1,1,0,100,0,75,1];
  const port = fakePort(() => JSON.stringify(status)); const client = new SerialClient(port); client.start();
  try { assert.deepEqual(await client.status(), status); }
  finally { await client.close(); }
});
test('ISP ACK followed immediately by removal closes cleanly and sends only one command', async () => {
  const port = fakePort(() => '[1000,99,0]', true); let disconnectErrors = 0;
  const client = new SerialClient(port, () => { ++disconnectErrors; }); client.start();
  let ack;
  await client.enterBootloader(frame => { ack = frame; });
  assert.deepEqual(ack, [1000,99,0]);
  assert(client.bootAcknowledged && port.closed && !port.readable.locked && !port.writable.locked);
  assert.equal(disconnectErrors, 0);
  await assert.rejects(client.status(), /关闭/);
  assert.deepEqual(port.sent, ['{999:99}']);
});

test('device rejection leaves the serial connection usable', async () => {
  const port = fakePort(text => text === '{999:99}' ? '[1000,99,1]' : '[1001,101,100,0,0,1,1,0,100,0]');
  const client = new SerialClient(port); client.start();
  await assert.rejects(client.enterBootloader(), /拒绝/);
  assert(!client.bootAcknowledged && !client.closed);
  assert.equal((await client.status())[0], 1001);
  await client.close();
});

test('USB removal before ISP ACK is an error, not evidence of successful entry', async () => {
  const port = fakePort(() => null); const client = new SerialClient(port); client.start();
  const rejected = assert.rejects(client.enterBootloader(), /断开/);
  await new Promise(resolve => setTimeout(resolve, 5)); port.end();
  await rejected; assert(!client.bootAcknowledged); await client.close();
});

test('ISP feedback failure cannot interrupt transport cleanup', async () => {
  const port = fakePort(() => '[1000,99,0]'); const client = new SerialClient(port); client.start();
  await client.enterBootloader(() => { throw new Error('render failed'); });
  assert(client.bootAcknowledged && port.closed && !port.readable.locked && !port.writable.locked);
});
