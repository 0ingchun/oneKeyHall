import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { releaseMetadata, decodeHex, syncRelease } from '../scripts/sync-release.mjs';
import { release, configLabel } from '../host/assets/release.mjs';
import { commands, fields } from '../host/assets/protocol-reference-data.mjs';

const read = name => readFile(new URL(`../${name}`, import.meta.url), 'utf8');
const [header, sketch, hex] = await Promise.all([
  read('firmware/src/FirmwareVersion.h'), read('firmware/firmware.ino'), read('firmware/build/onekeyhall-ch552-24mhz.hex'),
]);

test('published release matches source, compiled firmware and downloadable firmware across LF/CRLF', async () => {
  assert.deepEqual(await syncRelease(), release);
  assert.deepEqual(releaseMetadata(header, sketch, hex.replace(/\r?\n/g, '\r\n')), release);
  assert.deepEqual(releaseMetadata(header, sketch, hex.replace(/\r\n/g, '\n')), release);
  assert.equal(configLabel, `V${String(release.configVersion).padStart(2, '0')}`);
});

test('a version or capabilities edit without a matching rebuild is rejected', () => {
  const nextHeader = header.replace(/(#define ONEKEYHALL_FW_PATCH\s+)(\d+)/, (_, prefix, patch) => prefix + (Number(patch) + 1));
  assert.throws(() => releaseMetadata(nextHeader, sketch, hex), /Rebuild firmware first/);
  assert.throws(() => releaseMetadata(header, sketch.replace('[1002,255]', '[1002,254]'), hex), /Rebuild firmware first/);
  assert.throws(() => releaseMetadata('', sketch, hex), /Cannot read/);
});

test('invalid, incomplete and out-of-range firmware cannot become a published release', () => {
  assert.throws(() => decodeHex(':0100000000FE\n:00000001FF'), /checksum/);
  assert.throws(() => decodeHex(':0100000000FF'), /Incomplete/);
  assert.throws(() => decodeHex(':0138000000C7\n:00000001FF'), /Flash/);
  assert.throws(() => decodeHex(':0100000000FF\n:0100000000FF\n:00000001FF'), /overlaps/);
});

test('reference version examples and both language descriptions follow release metadata', async () => {
  assert.equal(commands.find(row => row[0] === 5)[5], release.versionReply);
  for (const language of [3, 4]) {
    assert(commands.find(row => row[0] === 4)[language].includes(release.version));
    assert(commands.find(row => row[0] === 1)[language].includes(String(release.configLength)));
  }
  assert(fields.find(row => row[0] === '0')[1].includes(String(release.configVersion)));
  const page = await read('host/assets/protocol-reference.mjs');
  assert(!/适用 oneKeyHall V\d|For oneKeyHall V\d/.test(page), 'Page heading must not hardcode a release');
  assert(page.includes('${release.version}') && page.includes('${configLabel}') && page.includes('${release.versionReply}'));
});
