import { validateConfig } from './protocol.mjs';

// Only an explicit Save uses command 0 (DataFlash); ordinary edits use 13 (RAM).
export async function applySettings(client, requested, persist = false) {
  const next = [...validateConfig(requested)];
  let opened = false, committed = false;
  try {
    await client.command(10); opened = true;
    const actual = await client.config();
    // Calibration endpoints are owned by the device, not a stale form snapshot.
    next.splice(89, 3, ...actual.slice(89, 92));
    validateConfig(next);
    for (let i = 4; i < next.length; i++) {
      if (i >= 89 && i <= 91) continue;
      if (next[i] !== actual[i]) await client.write(i, next[i]);
    }
    await client.command(persist ? 0 : 13); committed = true;
    const confirmed = await client.config();
    for (let i = 4; i < next.length; i++) if (confirmed[i] !== next[i]) throw new Error('设备回读与请求不一致，请重新读取配置。');
    await client.command(2);
    return confirmed;
  } catch (error) {
    // Resume the previous RAM settings if validation or a write was rejected.
    if (opened && !committed) { try { await client.command(14); } catch {} }
    throw error;
  }
}
