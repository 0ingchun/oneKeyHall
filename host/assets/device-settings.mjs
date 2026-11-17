export function supportsDeviceSettings(c) { return (c?.[0] === 3 && c.length === 124) || ((c?.[0] === 4 || c?.[0] === 5 || c?.[0] === 6) && c.length === 137); }
export function deviceName(c, identity = null) {
  if (!supportsDeviceSettings(c) || !c[6]) return identity?.defaultName || 'oneKeyHall';
  return Array.from({ length: c[6] }, (_, i) => String.fromCharCode(c[100 + i * 2] | c[101 + i * 2] << 8)).join('');
}
export function doubleClickMs(c) { return supportsDeviceSettings(c) ? c[5] * 10 : 200; }
export function writeDeviceSettings(c, name, interval) {
  if (!supportsDeviceSettings(c)) return c;
  name = name.trim();
  if (name.length > 12 || /[\u0000-\u001f\u007f-\u009f\ud800-\udfff]/.test(name)) throw new Error('设备名称最多 12 个字符，支持中文、英文和数字，不支持表情或控制字符；留空恢复默认名称。');
  if (!Number.isInteger(interval) || interval < 50 || interval > 1000 || interval % 10) throw new Error('双击间隔为 50–1000 ms，步长 10 ms。');
  c[5] = interval / 10; c[6] = name.length; c.fill(0, 100, 124);
  for (let i = 0; i < name.length; i++) { c[100 + i * 2] = name.charCodeAt(i) & 255; c[101 + i * 2] = name.charCodeAt(i) >> 8; }
  return c;
}
