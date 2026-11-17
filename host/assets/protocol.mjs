export const CONFIG_LENGTH = 137;
export const VERSION = 6;
export const errors = { 1: '操作顺序不正确，请重新进入设置。', 2: '参数组合无效，请检查触发点、释放点和 RT 模式。', 3: '采样不稳定或 ADC 接近电源轨，请保持轴体静止并检查接线。', 4: '两点差值不足 16 个 ADC 计数，请检查磁铁方向、位置或传感器。', 5: '设备存储回读校验失败，本次保存未确认。请重新连接并检查。' };

// USB CDC packets can contain partial frames or several adjacent frames.
export class FrameDecoder {
  buffer = '';
  push(text) {
    this.buffer += text;
    const frames = [];
    for (;;) {
      const begin = this.buffer.lastIndexOf('[', this.buffer.indexOf(']'));
      const end = this.buffer.indexOf(']');
      if (end < 0) break;
      if (begin >= 0) {
        try {
          const frame = JSON.parse(this.buffer.slice(begin, end + 1));
          if (Array.isArray(frame) && frame.every(Number.isInteger)) frames.push(frame);
        } catch { /* Ignore malformed frames; next '[' resynchronizes. */ }
      }
      this.buffer = this.buffer.slice(end + 1);
    }
    if (this.buffer.length > 4096) this.buffer = '';
    return frames;
  }
}

export function validateConfig(c) {
  if (!((c.length === CONFIG_LENGTH && (c[0] === 4 || c[0] === 5 || c[0] === VERSION)) || (c.length === 124 && c[0] === 3) || (c.length === 100 && c[0] === 2)) || c.some(v => !Number.isInteger(v) || v < 0 || v > 255)) throw new Error('需要 oneKeyHall 磁轴固件；此页面不能配置旧版机械轴固件。');
  if (c[0] >= 3) {
    if (c[5] < 5 || c[5] > 100 || c[6] > 12) throw new Error('双击间隔或设备名称长度无效。');
    for (let i = 0; i < c[6]; i++) {
      const code = c[100 + i * 2] | c[101 + i * 2] << 8;
      if (code < 32 || (code >= 127 && code < 160) || (code >= 0xd800 && code <= 0xdfff)) throw new Error('设备名称字符无效。');
    }
  }
  if (c[0] >= 4 && ((c[0] >= 6 ? (c[124] & 0x78) !== 0 || c[124] === 132 : c[124] > 7) || c[125] < 1 || c[125] > 100 || c[126] > c[127] || c[127] > 100 || c[128] < 1 || c[128] > 100 || c[130] > 127 || c[132] > 127 || c[133] < 1 || c[133] > c[134] || c[134] > 250 || c[135] > c[136])) throw new Error('设备线性参数超出范围。');
  if (c[4] > 3 || c[17] > 3 || c[53] > 3 || c[14] > (c[0] >= 5 ? 6 : 2)) throw new Error('按键或灯效模式无效。');
  if (c[92] < 5 || c[92] > 95 || c[93] >= c[92] || c[99] < 1 || c[99] > 10 || c[93] < c[99]) throw new Error('需要：顶部死区 ≤ 释放点 < 触发点，触发点为 5–95%。');
  if (c[94] > 1 || c[95] < 1 || c[95] > 50 || c[96] < 1 || c[96] > 50 || c[97] > 3 || c[98] < 1 || c[98] > 10) throw new Error('RT 距离、滤波或确认采样数超出范围。');
  if (c[94] && c[4] === 2) throw new Error('快速触发不能和双击模式同时开启，请选择直接使用 KEY1 或 KEY2。');
  if (c[89] > 1 || (c[89] && (Math.abs(c[91] - c[90]) < 16 || c[90] < 2 || c[90] > 253 || c[91] < 2 || c[91] > 253))) throw new Error('校准数据无效，请重新校准。');
  return c;
}

export class SerialClient {
  constructor(port, onDisconnect = () => {}) {
    this.port = port; this.onDisconnect = onDisconnect; this.queue = Promise.resolve();
    this.decoder = new FrameDecoder(); this.pending = null; this.closed = false;
  }
  start() {
    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();
    this.readTask = this.readLoop();
  }
  fail(error) {
    if (this.pending) { this.pending.reject(error); this.pending = null; }
  }
  abort(error) {
    this.broken = true;
    this.fail(error);
    if (!this.bootAcknowledged) this.onDisconnect(error);
    void this.close();
  }
  async readLoop() {
    const decoder = new TextDecoder();
    try {
      while (!this.closed) {
        const { value, done } = await this.reader.read();
        if (done) break;
        for (const frame of this.decoder.push(decoder.decode(value, { stream: true }))) {
          if (this.pending?.match(frame)) this.pending.resolve(frame);
        }
      }
      if (!this.closed) throw new Error('设备已断开。');
    } catch (error) {
      if (!this.closed) this.abort(error);
    } finally { this.reader.releaseLock(); }
  }
  request(key, value, match) {
    const operation = this.queue.then(async () => {
      if (this.closed || this.broken || this.bootAcknowledged) throw new Error('串口已关闭。');
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          // Do not reuse a desynchronized stream: a late ACK could match a later request.
          this.abort(new Error('设备响应超时，请重新连接；未确认的设置不视为成功。'));
        }, 2500);
        const finish = (error, frame) => {
          clearTimeout(timer); this.pending = null;
          if (error) reject(error); else resolve(frame);
        };
        this.pending = { match, resolve: frame => finish(null, frame), reject: error => finish(error) };
        this.writer.write(new TextEncoder().encode(`{${key}:${value}}`)).catch(error => this.abort(error));
      });
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
  async write(index, value) {
    const frame = await this.request(index, value, f => f.length === 3 && f[0] === 1000 && f[1] === index);
    if (frame[2]) throw new Error(errors[frame[2]] || '设备拒绝了写入。');
  }
  async command(value) {
    const frame = await this.request(999, value, f => f.length === 3 && f[0] === 1000 && f[1] === value);
    if (frame[2]) throw new Error(errors[frame[2]] || '设备拒绝了命令。');
  }
  async config() {
    const frame = await this.request(999, 1, f => f.length >= 89 && f[0] < 255);
    return validateConfig(frame);
  }
  async releaseCount() {
    // Existing firmware returns the live RAM counter in config bytes 2 and 3.
    // Read only these bytes; a settings draft need not pass full validation.
    const frame = await this.request(999, 1, f => ((f.length === CONFIG_LENGTH && (f[0] === 4 || f[0] === 5 || f[0] === VERSION)) || (f.length === 124 && f[0] === 3) || (f.length === 100 && f[0] === 2)) &&
      f[2] >= 0 && f[2] <= 255 && f[3] >= 0 && f[3] <= 255);
    return (frame[2] << 8) | frame[3];
  }
  status() { return this.request(999, 3, f => (f.length === 10 || f.length === 12 || f.length === 13) && f[0] === 1001); }
  async capabilities() {
    const frame = await this.request(999, 4, f => (f.length === 2 && f[0] === 1002) || (f.length === 3 && f[0] === 1000 && f[1] === 4));
    // Earlier v2 firmware responds with unsupported-command status 1.
    return frame[0] === 1002 ? frame[1] : 0;
  }
  async firmwareVersion() {
    const frame = await this.request(999, 5, f =>
      (f.length === 5 && f[0] === 1003 && f.slice(1, 4).every(v => v >= 0 && v <= 255) && (f[4] === 0 || f[4] === 1)) ||
      (f.length === 3 && f[0] === 1000 && f[1] === 5));
    if (frame[0] === 1003) return { version: frame.slice(1, 4).join('.'), isp: !!frame[4] };
    if (frame[2] === 1) return null; // Older firmware only reports its config format.
    throw new Error('设备未返回有效的固件版本。');
  }
  async deviceIdentity() {
    const frame = await this.request(999, 6, f =>
      (f.length === 8 && f[0] === 1004 && f.slice(1).every(v => v >= 0 && v <= 255)) ||
      (f.length === 3 && f[0] === 1000 && f[1] === 6));
    if (frame[0] !== 1004) return null;
    const [lo, hi] = frame.slice(1, 3);
    const recognized = hi > 0 && hi <= 9 && (lo >> 4) <= 9 && (lo & 15) <= 9;
    const uid = frame.slice(3).map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
    return { bootloaderVersion: recognized ? `${hi}.${lo >> 4}${lo & 15}` : null, uid, defaultName: `oneKeyHall${uid}` };
  }
  async enterBootloader(onAcknowledged) {
    const frame = await this.request(999, 99, f => {
      if (f.length !== 3 || f[0] !== 1000 || f[1] !== 99) return false;
      // Set on reception so immediate USB removal after the ACK is expected.
      if (f[2] === 0) this.bootAcknowledged = true;
      return true;
    });
    if (frame[2]) throw new Error('设备拒绝进入下载模式，请确认固件是否支持此功能。');
    // Diagnostic feedback must never prevent closing the acknowledged port.
    try { onAcknowledged?.(frame); } catch {}
    await this.close();
  }
  close() {
    if (this.closeTask) return this.closeTask;
    this.closed = true; this.fail(new Error('串口已关闭。'));
    this.closeTask = (async () => {
      try { await this.reader?.cancel(); await this.readTask; } catch { /* Already removed. */ }
      try { this.writer?.releaseLock(); } catch { /* Already released. */ }
      try { await this.port.close(); } catch { /* Already removed. */ }
    })();
    return this.closeTask;
  }
}
