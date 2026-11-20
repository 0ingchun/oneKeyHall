import { supportsOutputSwitches } from './output-switches.mjs';
import { mountLanguage } from './i18n.mjs';
import { SerialClient, validateConfig } from './protocol.mjs';
import { mountKeyboardTest } from './keyboard-test.mjs';
import { mountTheme } from './theme.mjs';
import { rtMarkers } from './rt-markers.mjs';
import { createBootFeedback } from './boot-feedback.mjs';
import { mountLinear, supportsNativeLinear } from './device-linear.mjs';
import { supportsDeviceSettings, deviceName, doubleClickMs, writeDeviceSettings } from './device-settings.mjs';
import { mountLighting } from './lighting.mjs';
import { calibrationSpan } from './calibration.mjs';
import { createAutoApply } from './auto-apply.mjs';
import { applySettings } from './settings-session.mjs';
import { factoryResetConfirmation, supportsFactoryReset, resetToFactory } from './factory-reset.mjs';
const $ = id => document.getElementById(id);
const language = mountLanguage(document, window);
mountKeyboardTest(document, window);
mountTheme(document, window);
const lighting = mountLighting(document);
let bootStorage;
try { bootStorage = window.localStorage; } catch {}
const bootFeedback = createBootFeedback(bootStorage, events => {
  $('boot-result').textContent = events.length ? events.map(e => `${e.time}  ${e.text}`).join('\n') : '尚无下载请求记录。记录仅在当前页面保留，刷新后清空；时间采用 UTC（北京时间 +8 小时）。';
});
let client = null, config = null, busy = false, polling = false, editing = false, restReady = false, timer;
let canBoot = false;
let canFactoryReset = false;
let canOutputSwitches = false;
let capabilityBits = null;
let identity = null;
let lastStatus = null;
let lastCountRead = -Infinity;
let calibrating = false;
const autoApply = createAutoApply({
  canApply: () => !!client && !busy && !calibrating,
  apply: () => action(() => apply(false)),
  onError: error => message(error.message, true),
});
const linear = mountLinear(document, () => !!client && !busy && !editing && !!(capabilityBits & 16) && supportsNativeLinear(config) && config[4] === 3 && (config[124] & 7) < 2, () => !!client && !!(capabilityBits & 128) && config?.[0] >= 6);
function renderWorkMode() {
  const enabled = Number($('key-select').value) === 3;
  $('linear-panel').hidden = !enabled;
  $('key-editors').hidden = enabled || Number($('key-select').value) === 4;
  $('double-click-settings').hidden = ![2, 3].includes(Number($('key-select').value));
  $('double-click-ms').disabled = !supportsDeviceSettings(config);
  $('double-click-note').textContent = supportsDeviceSettings(config) ? '从第一次按下到第二次按下，小于此间隔视为双击；达到间隔后才输出单击。默认 200 ms，步长 10 ms。RT 与双击互斥。' : '当前固件固定为 200 ms；升级 V2.3.0 后可修改。';
  if (enabled && supportsDeviceSettings(config)) $('double-click-note').textContent = '线性模式以两次有效按下的时间差判定双击，默认 200 ms；双击反向不延迟原有输出。';
  $('linear-count-note').textContent = (capabilityBits & 128) ? '线性模式下，有效按下再释放会累计一次；使用触发点、释放点或 RT 判定。设置暂停和 ADC 故障不计数，保存配置后次数断电保留。' : '旧固件在线性模式下不累计释放次数；升级 V2.6.0 后支持。';
  $('linear-support').textContent = !(capabilityBits & 16) || !supportsNativeLinear(config) ? '设备独立运行需要 V2.4.0 或更新固件。' : config[4] !== 3 ? '选择预设后自动应用，让设备进入线性模式。' : '设备已进入线性模式，关闭网页后仍会运行。切换到 KEY1 / KEY2 后自动退出。';
  linear.refresh();
}
$('key-select').addEventListener('change', renderWorkMode);
const binding = { 'key-select': 4, 'rgb-mode': 14, brightness: 13, 'rgb-interval': 15, 'rgb-step': 16, actuation: 92, release: 93, retrigger: 95, 'rapid-release': 96, filter: 97, debounce: 98, top: 99 };
const keyNames = new Map([[0, '无 / 结束'], [32, 'Space 空格'], [128, '左 Ctrl'], [129, '左 Shift'], [130, '左 Alt'], [131, '左 Win / Cmd'], [132, '右 Ctrl'], [133, '右 Shift'], [134, '右 Alt'], [135, '右 Win / Cmd'], [176, 'Enter'], [177, 'Esc'], [178, 'Backspace'], [179, 'Tab'], [193, 'Caps Lock'], [209, 'Insert'], [210, 'Home'], [211, 'Page Up'], [212, 'Delete'], [213, 'End'], [214, 'Page Down'], [215, '→'], [216, '←'], [217, '↓'], [218, '↑']]);
for (let n = 33; n <= 126; n++) keyNames.set(n, String.fromCharCode(n));
for (let n = 1; n <= 12; n++) keyNames.set(193 + n, `F${n}`);
for (let n = 13; n <= 24; n++) keyNames.set(227 + n, `F${n}`);
for (const number of [1, 2]) {
  const editor = document.createElement('div'); editor.className = 'key-editor';
  editor.innerHTML = `<h3>KEY${number}</h3><label>输出方式<select id="mode${number}"><option value="0">单键 · 按住保持</option><option value="1">组合键 · 按下后立即释放</option><option value="2">组合键 · 按住保持</option><option value="3">输入文本（最多 30 字节 ASCII）</option></select></label><div class="key-picks" id="picks${number}"></div><label>文本<textarea id="text${number}" maxlength="30" placeholder="仅支持 ASCII 字符"></textarea></label>`;
  $('key-editors').append(editor);
  for (let slot = 0; slot < 5; slot++) {
    const label = document.createElement('label'); label.textContent = slot ? `组合键 ${slot + 1}` : '主键 / 组合键 1';
    const select = document.createElement('select'); select.id = `key${number}-${slot}`;
    for (const [value, title] of keyNames) select.add(new Option(title, value));
    label.append(select); $(`picks${number}`).append(label);
  }
}
function message(text, error = false) { $('message').textContent = text; $('message').classList.toggle('error', error); }
function updateControls() {
  $('controls').disabled = !client || busy;
  $('output-off-mode').disabled = !client || busy || !canOutputSwitches;
  $('output-switch-support').textContent = canOutputSwitches ? '关闭输出模式仍累计有效释放次数；灯光可独立关闭。自动应用，保存后断电保留。' : '关闭输出和灯光模式需要 V2.6.2 或更新固件。';
  for (const id of ['reload', 'cancel', 'save']) $(id).disabled = !client || busy;
  $('save').disabled ||= calibrating;
  $('connect').disabled = busy;
  $('device-name').disabled = !client || busy || !supportsDeviceSettings(config);
  $('device-name-note').textContent = !client ? '连接后读取名称。' : supportsDeviceSettings(config) ? (identity ? '自定义名称最多 12 个字符，支持中文；留空使用 oneKeyHall 加芯片序列号。保存后拔插 USB，USB 产品与串口接口名称生效。' : '最多 12 个字符，支持中文；留空恢复 oneKeyHall。保存配置后拔插 USB，USB 产品与串口接口名称生效；系统部分列表可能仍显示驱动通用名称。') : '当前固件不支持改名，请升级 V2.3.0。';
  $('connect').textContent = client ? '断开设备' : '连接设备';
  $('rest').disabled = !calibrating; $('bottom').disabled = !calibrating || !restReady;
  $('bootloader').disabled = !client || busy || !canBoot;
  $('factory-reset').disabled = !client || busy || !canFactoryReset;
  $('factory-reset-support').textContent = !client ? '连接设备后可恢复出厂设置。' : canFactoryReset ? '清除全部配置和计数并立即保存，完成后需要重新校准。' : '恢复出厂设置需要 V2.6.1 或更新固件。';
  $('boot-support').textContent = !client ? '连接后检查固件是否支持下载模式。' : capabilityBits === null ? '正在读取固件能力…' : canBoot ? `固件能力 0x${capabilityBits.toString(16).padStart(2, '0')}：支持进入下载模式。` : `固件能力 0x${capabilityBits.toString(16).padStart(2, '0')}：当前固件不支持软件进入下载模式。`;
  $('session-state').textContent = editing ? '设置中：键盘输出已暂停。离开或断线将放弃未应用的设置。' : '参数修改后自动应用，不写入断电保存区；点击“保存配置”后断电保留。';
  lighting.support(!!client && !!(capabilityBits & 64) && config?.[0] >= 5, !!client && !busy && canOutputSwitches);
  renderWorkMode();
}
function setSelect(id, value) {
  const select = $(id);
  if (![...select.options].some(option => Number(option.value) === value)) select.add(new Option(`原配置值 ${value}`, value));
  select.value = value;
}
function renderConfig(c) {
  config = [...c];
  $('device-name').value = supportsDeviceSettings(c) && c[6] ? deviceName(c) : '';
  $('double-click-ms').value = doubleClickMs(c);
  $('connection-state').textContent = `${deviceName(c, identity)} · 已连接`;
  $('config-version').textContent = `配置格式 V${String(c[0]).padStart(2, '0')}`;
  for (const [id, index] of Object.entries(binding)) $(id).value = c[index];
  $('rapid').checked = !!c[94];
  $('rgb-color').value = '#' + c.slice(10, 13).map(n => n.toString(16).padStart(2, '0')).join('');
  lighting.render(c);
  renderCalibrationSpan(c, editing);
  $('count').textContent = (c[2] << 8) | c[3];
  $('calibration-state').textContent = c[89] ? '已校准' : '尚未校准';
  $('endpoints').textContent = c[89] ? `顶部 ADC ${c[90]} / 底部 ADC ${c[91]} · 按下时数值${c[91] > c[90] ? '增大' : '减小'}` : '顶部 ADC — / 底部 ADC —';
  $('act-marker').style.left = `${c[92]}%`; $('release-marker').style.left = `${c[93]}%`;
  for (const number of [1, 2]) {
    const base = number === 1 ? 17 : 53;
    $(`mode${number}`).value = c[base];
    for (let slot = 0; slot < 5; slot++) setSelect(`key${number}-${slot}`, c[base + 1 + slot]);
    const bytes = c.slice(base + 6, base + 36); const end = bytes.findIndex(n => n === 0 || n === 255);
    $(`text${number}`).value = String.fromCharCode(...bytes.slice(0, end < 0 ? undefined : end));
  }
  linear.render(c);
  renderMarkers();
  renderWorkMode();
}
function renderCalibrationSpan(c, draft = false) {
  const span = calibrationSpan(c, draft);
  $('calibration-span').textContent = span.value;
  $('calibration-span-note').textContent = span.note;
}
function renderMarkers() {
  const actuation = Number($('actuation').value), release = Number($('release').value);
  if (Number.isFinite(actuation)) $('act-marker').style.left = `${Math.max(0, Math.min(100, actuation))}%`;
  if (Number.isFinite(release)) $('release-marker').style.left = `${Math.max(0, Math.min(100, release))}%`;
  const enabled = $('rapid').checked;
  const settings = { enabled, top: Number($('top').value), up: Number($('rapid-release').value), down: Number($('retrigger').value) };
  const parametersValid = settings.top >= 1 && settings.top <= 10 && settings.up >= 1 && settings.up <= 50 && settings.down >= 1 && settings.down <= 50;
  const lines = parametersValid ? rtMarkers(lastStatus, settings) : null;
  const draft = !config || !config[94] || settings.up !== config[96] || settings.down !== config[95] || settings.top !== config[99] || actuation !== config[92];
  $('release-marker').hidden = enabled;
  $('trigger-legend').textContent = enabled ? '紫线首次触发 · 绿线 RT 抬起 · 橙线 RT 再按' : '紫线按下触发 / 灰线固定释放';
  $('rt-legend').hidden = !enabled;
  for (const name of ['release', 'press']) {
    const marker = $(`rt-${name}-marker`);
    marker.hidden = !lines;
    marker.classList.toggle('active', !!lines && !draft && lines.active === name);
    if (lines) marker.style.left = `${Math.max(0, Math.min(100, lines[name]))}%`;
  }
  $('rt-release-value').textContent = lines ? `${lines.release}%（距离 ${lines.up}%）` : '—';
  $('rt-press-value').textContent = lines ? `${lines.press}%（距离 ${lines.down}%）${lines.pressReachable ? '' : ' · 超出行程'}` : '—';
  $('rt-line-note').textContent = !parametersValid ? '请填写有效的 RT 距离和顶部死区。' : !lines ? '连接并完成校准后显示 RT 参数线。' : draft ? '参数预览：有效参数将在停止修改后自动应用。' : !lines.telemetry ? '当前固件未上报 RT 极值，显示以当前行程为基准的距离参考线；更新固件可查看实时阈值。' : !lines.live ? '等待首次触发或设备恢复输出；两条线暂为距离参考。' : `高亮线为下一次${lines.active === 'release' ? '释放' : '按下'}阈值，另一条为距离参考。${lines.active === 'press' && !lines.pressReachable ? '再次按下阈值超出行程，需抬起更多或回到顶部复位。' : ''}`;
}
for (const id of ['rapid', 'actuation', 'release', 'top', 'rapid-release', 'retrigger']) $(id).addEventListener('input', renderMarkers);
function readForm() {
  // Controls are disabled during an operation, so native reportValidity() would
  // skip them. Validate their declared ranges explicitly before writing.
  for (const input of document.querySelectorAll('input[type=number]:not([id^="linear-"])')) {
    const value = Number(input.value);
    if (input.value === '' || !Number.isInteger(value) || value < Number(input.min) || value > Number(input.max)) throw new Error('请填写全部数值，并检查数值范围。');
  }
  const c = [...config];
  writeDeviceSettings(c, $('device-name').value, Number($('double-click-ms').value));
  for (const [id, index] of Object.entries(binding)) c[index] = Number($(id).value);
  if (c[4] === 4 && !canOutputSwitches) throw new Error('关闭输出和灯光模式需要 V2.6.2 或更新固件。');
  lighting.write(c, canOutputSwitches);
  if (c[14] >= 3 && !(capabilityBits & 64)) throw new Error('线性灯效需要 V2.5.0 或更新固件。');
  c[94] = Number($('rapid').checked);
  [c[10], c[11], c[12]] = $('rgb-color').value.slice(1).match(/../g).map(n => parseInt(n, 16));
  for (const number of [1, 2]) {
    const base = number === 1 ? 17 : 53;
    c[base] = Number($(`mode${number}`).value);
    for (let slot = 0; slot < 5; slot++) c[base + slot + 1] = Number($(`key${number}-${slot}`).value);
    const text = $(`text${number}`).value;
    if (text.length > 30 || /[^\x08\x09\x0a\x20-\x7e]/.test(text)) throw new Error(`KEY${number} 文本只支持最多 30 个 ASCII 字节（英文、数字、符号）。`);
    for (let i = 0; i < 30; i++) c[base + 6 + i] = text.charCodeAt(i) || 0;
  }
  if (supportsNativeLinear(c)) linear.write(c);
  if ((c[124] & 128) && !(capabilityBits & 128)) throw new Error('双击反向需要 V2.6.0 或更新固件。');
  return validateConfig(c);
}
async function action(task) {
  if (busy) return;
  const focused = document.activeElement;
  const selection = focused && [focused.selectionStart, focused.selectionEnd];
  busy = true; updateControls();
  try { await task(); } catch (error) { message(error.message, true); }
  finally {
    busy = false; updateControls();
    if (client && focused?.matches('input, textarea, select') && !focused.disabled) {
      focused.focus({ preventScroll: true });
      if (selection[0] !== null && selection[0] !== undefined) focused.setSelectionRange(...selection);
    }
  }
}
async function disconnect(error) {
  autoApply.cancel(); calibrating = false;
  canFactoryReset = false; canOutputSwitches = false;
  clearTimeout(timer);
  const old = client; client = null; editing = restReady = canBoot = false;
  capabilityBits = null; identity = null;
  lighting.sample(null);
  $('boot-version').textContent = $('chip-uid').textContent = '—';
  $('device-name').placeholder = 'oneKeyHall';
  lastStatus = null;
  lastCountRead = -Infinity;
  linear.disconnected();
  await old?.close();
  $('connection-state').textContent = '未连接设备';
  $('device-name').value = '';
  renderCalibrationSpan(null);
  $('firmware-version').textContent = '—';
  $('config-version').textContent = 'oneKeyHall · 磁轴固件';
  for (const id of ['adc', 'filtered', 'position', 'span', 'count']) $(id).textContent = '—';
  $('travel-fill').style.width = '0%'; document.querySelector('.track').setAttribute('aria-valuenow', '0');
  $('key-state').textContent = '等待设备'; $('key-state').classList.remove('pressed');
  $('armed-state').textContent = '设备未连接，显示数据已清除。';
  message(error?.message || '已断开连接。设备会放弃未应用的设置。', !!error); updateControls(); renderMarkers();
}
async function poll() {
  if (!client) return;
  if (!busy && !polling) {
    polling = true;
    const active = client;
    try {
      const s = await active.status();
      if (active !== client) return;
      lastStatus = s; renderMarkers();
      $('adc').textContent = s[1]; $('filtered').textContent = s[2]; $('position').textContent = s[5] ? s[3] : '—';
      $('span').textContent = s[5] ? s[8] : '—';
      $('resolution').textContent = s[5] ? `每计数约 ${(100 / s[8]).toFixed(2)}% 相对行程` : '至少 16 个计数';
      $('rt-minimum').textContent = s[5] ? `当前 RT 最小有效距离为 ${Math.ceil(200 / s[8])}%（至少 2 个 ADC 计数）。` : '请先校准，再查看 RT 的有效分辨率。';
      $('travel-fill').style.width = `${s[5] ? s[3] : 0}%`;
      document.querySelector('.track').setAttribute('aria-valuenow', s[5] ? s[3] : 0);
      $('key-state').textContent = s[9] ? 'ADC 异常' : s[7] ? '设置中 · 输出暂停' : !s[5] ? '尚未校准' : s[4] ? '已按下' : '已释放';
      $('key-state').classList.toggle('pressed', !!s[4]);
      $('armed-state').textContent = s[9] ? 'ADC 接近 0 或 255，按键已释放。请检查信号。' : !s[5] ? '完成两点校准后才能启用磁轴。' : s[7] ? '完成校准后自动应用，然后松开轴体。' : config[4] === 4 ? '模拟键鼠输出已关闭，仍可读取行程。' : s[6] ? '已就绪 · 按键输出启用' : '请先完全松开轴体，等待进入顶部死区。';
      if (editing && !busy && !s[7]) { autoApply.cancel(); calibrating = editing = restReady = false; message('设备设置会话已结束，未应用修改已回退，请重新读取。', true); updateControls(); }
      linear.sample(s); lighting.sample(s);
      if (active !== client) return;
      if (!busy && performance.now() - lastCountRead >= 500) {
        const count = await active.releaseCount();
        if (active !== client) return;
        // Do not render the returned config: preserve unsaved form edits.
        $('count').textContent = count;
        lastCountRead = performance.now();
      }
    } catch (error) { if (active === client) await disconnect(error); }
    finally { polling = false; }
  }
  if (client) timer = setTimeout(poll, 100);
}
$('connect').addEventListener('click', () => action(async () => {
  if (client) {
    if (editing) await client.command(14);
    await disconnect(); return;
  }
  if (!navigator.serial || !window.isSecureContext) throw new Error('Web Serial 不可用。请使用桌面 Chrome / Edge，通过 HTTPS 或本地 http://127.0.0.1:5173 访问。');
  const port = await navigator.serial.requestPort({ filters: [{ usbVendorId: 0x1209, usbProductId: 0xc550 }] });
  try {
    await port.open({ baudRate: 57600 }); await port.setSignals({ dataTerminalReady: true });
    client = new SerialClient(port, error => { void disconnect(error); }); client.start();
    renderConfig(await client.config());
    capabilityBits = await client.capabilities();
    canBoot = !!(capabilityBits & 1);
    identity = (capabilityBits & 32) ? await client.deviceIdentity() : null;
    $('boot-version').textContent = identity ? identity.bootloaderVersion || '未识别' : '固件未提供';
    $('chip-uid').textContent = identity?.uid || '—';
    $('device-name').placeholder = identity?.defaultName || 'oneKeyHall';
    const release = await client.firmwareVersion();
    canFactoryReset = supportsFactoryReset(release);
    canOutputSwitches = supportsOutputSwitches(release);
    $('firmware-version').textContent = release ? `V${release.version}` : '未上报';
    $('connection-state').textContent = `${deviceName(config, identity)} · 已连接`;
    message(config[89] ? '连接成功。可查看实时数据，或调整触发手感。' : '连接成功。请先开始校准：采集松开和压到底两个端点。');
    timer = setTimeout(poll, 0);
  } catch (error) { await disconnect(error); try { await port.close(); } catch {} throw error; }
}));
$('begin').addEventListener('click', () => action(async () => {
  autoApply.cancel();
  await client.command(10); calibrating = editing = true; restReady = false; message('键盘输出已暂停。请完全松开轴体，然后采集顶部。');
}));
$('rest').addEventListener('click', () => action(async () => {
  await client.command(11); restReady = true; message('顶部采集成功。请压住轴体到底，保持不动，再采集底部。');
}));
$('bottom').addEventListener('click', () => action(async () => {
  await client.command(12); restReady = false;
  await client.command(13); calibrating = editing = false;
  // Only update calibration fields; preserve any locally edited key/RGB parameters.
  const c = await client.config(); config.splice(89, 3, ...c.slice(89, 92));
  renderCalibrationSpan(c);
  $('calibration-state').textContent = '已校准';
  $('endpoints').textContent = `顶部 ADC ${c[90]} / 底部 ADC ${c[91]} · 按下时数值${c[91] > c[90] ? '增大' : '减小'}`;
  message('校准已自动应用。请松开轴体；点击“保存配置”后断电保留。');
  autoApply.schedule();
}));
async function apply(persist) {
  if (calibrating) return;
  const next = readForm();
  if (next[4] === 3 && (!(capabilityBits & 16) || !supportsNativeLinear(next))) throw new Error('设备独立运行需要 V2.4.0 或更新固件。');
  if (!persist && next.every((value, i) => i < 4 || value === config[i])) return;
  const active = client;
  editing = true;
  let confirmed;
  try { confirmed = await applySettings(active, next, persist); }
  finally { editing = restReady = false; }
  if (active !== client) return;
  renderConfig(confirmed);
  message((persist ? '已保存到设备，断电后保留。请完全松开轴体以启用按键。' : '已应用到运行内存，断电后恢复已保存配置。请完全松开轴体。') + (supportsDeviceSettings(confirmed) ? (persist ? ' 若修改了名称，请拔插 USB 以更新 USB 名称。' : ' USB 名称需保存配置后拔插才能生效。') : ''));
}
$('linear-sync').addEventListener('click', () => action(async () => {
  if (!(capabilityBits & 16) || config?.[4] !== 3 || (config[124] & 7) >= 2) throw new Error('请先应用音量预设。');
  await client.command(16); message('请松开轴体，设备将先发送约 2 秒音量降低，再按行程估算音量。');
}));
$('save').addEventListener('click', () => action(() => { autoApply.cancel(); return apply(true); }));
$('cancel').addEventListener('click', () => action(async () => {
  autoApply.cancel();
  await client.command(14); calibrating = editing = restReady = false; renderConfig(await client.config()); message('已放弃待应用修改或未完成的校准；已自动应用的参数保持不变。');
}));
$('reload').addEventListener('click', () => action(async () => {
  autoApply.cancel();
  renderConfig(await client.config()); message(editing ? '已读取校准会话中的参数；完成底部采集后自动应用。' : '已读取设备当前运行配置。');
}));
$('factory-reset').addEventListener('click', () => action(async () => {
  if (!client || !canFactoryReset) throw new Error('恢复出厂设置需要 V2.6.1 或更新固件。');
  let requested = false;
  try {
    const confirmed = await resetToFactory(client, {
      confirm: () => window.confirm(language.translate(factoryResetConfirmation)),
      cancelPending: () => { requested = true; autoApply.cancel(); },
    });
    if (!confirmed) return;
    calibrating = editing = restReady = false;
    lastStatus = null; lastCountRead = -Infinity;
    linear.disconnected(); lighting.sample(null);
    renderConfig(confirmed);
    message('已恢复出厂设置并保存。请重新校准；拔插 USB 后默认设备名称生效。');
  } catch (error) {
    // Never let an old form auto-apply after an unconfirmed destructive request.
    if (requested) await disconnect(error);
    throw error;
  }
}));
// Only device controls participate: theme, language and keyboard-test input do not.
function scheduleFormApply(event) {
  if (!client || busy || event.isComposing || !event.target.matches('input, select, textarea')) return;
  autoApply.schedule();
}
for (const type of ['input', 'change', 'compositionend']) {
  $('controls').addEventListener(type, scheduleFormApply);
  $('device-name').addEventListener(type, scheduleFormApply);
}
for (const element of [$('controls'), $('device-name')]) element.addEventListener('compositionstart', () => autoApply.cancel());
$('bootloader').addEventListener('click', () => action(async () => {
  if (!client || !canBoot) throw new Error('当前设备未连接或固件不支持软件进入下载模式。');
  if (!window.confirm(language.translate('进入下载模式将关闭 LED 并断开当前连接，未保存的设备配置会丢失。\n\n请先保存需要保留的配置，并准备好烧录工具。是否继续？'))) {
    bootFeedback('已取消，没有发送下载命令。'); return;
  }
  bootFeedback(`用户确认；能力 0x${capabilityBits.toString(16)}；请求进入队列，等待固件应答。`);
  try {
    await client.enterBootloader(() => bootFeedback('已收到固件成功应答 [1000,99,0]，正在关闭应用串口；尚未确认 ISP 枚举。'));
    await disconnect();
    const result = '应用串口已关闭。此按钮不会自动打开烧录工具或烧录；请在 CH54x-55x 烧录工具中确认 ISP 设备。部分 BootLoader 会超时返回应用。';
    bootFeedback(result); message(result);
  } catch (error) {
    bootFeedback(`请求未完成：${error.message}`); throw error;
  }
}));
if (!navigator.serial || !window.isSecureContext) message('当前浏览器不支持 Web Serial 或页面不在安全环境中。请使用桌面 Chrome / Edge，通过 HTTPS 或本地 HTTP 地址打开。', true);
window.addEventListener('beforeunload', () => { autoApply.cancel(); void client?.close(); });
updateControls();
