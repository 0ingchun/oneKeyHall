import { mountLanguage } from './i18n.mjs';
import { commands, fields, status, presets, errors, capabilities } from './protocol-reference-data.mjs';
const language = mountLanguage(document, window);
const root = document.getElementById('reference');
function render() {
  const en = language.language === 'en', t = (zh, english) => en ? english : zh;
  document.title = `oneKeyHall · ${t('串口指令表', 'Serial command reference')}`;
  document.getElementById('back').textContent = t('返回控制台', 'Back to console');
  root.replaceChildren();
  const node = (tag, text) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; return e; };
  function section(title) { const e = node('section'); e.className = 'card'; e.append(node('h2', title)); root.append(e); return e; }
  function paragraph(parent, zh, english) { parent.append(node('p', t(zh, english))); }
  function code(parent, text) { const pre = node('pre', text); pre.className = 'protocol-frame'; parent.append(pre); }
  function table(parent, headers, rows) {
    const wrap = node('div'), element = node('table'); wrap.className = 'reference-scroll'; element.className = 'reference-table';
    const head = node('thead'), hrow = node('tr'); headers.forEach(h => hrow.append(node('th', h))); head.append(hrow);
    const body = node('tbody'); rows.forEach(values => { const row = node('tr'); values.forEach(value => row.append(node('td', String(value)))); body.append(row); });
    element.append(head, body); wrap.append(element); parent.append(wrap);
  }
  const intro = section(t('串口指令表', 'Serial command reference'));
  paragraph(intro, '适用 oneKeyHall V2.6.0，配置格式 V06。本页仅供查阅，不连接或操作设备。', 'For oneKeyHall V2.6.0, configuration format V06. Reference only: this page does not connect to or control a device.');
  paragraph(intro, 'USB CDC：VID 0x1209 / PID 0xC550，57600 波特率，DTR=1。请求使用十进制 {key:value}，key/value 各最多 3 位，支持分片和连续帧。每次等待对应应答后再发送下一条；不要用固定延时假设完成。', 'USB CDC: VID 0x1209 / PID 0xC550, 57600 baud, DTR=1. Requests use decimal {key:value}, up to 3 digits each. Fragmented and adjacent frames are supported. Wait for the matching reply before sending the next request; do not assume completion after a fixed delay.');
  code(intro, '{999:5} → [1003,2,6,2,1]\n{999:10} → [1000,10,0]\n{92:60} → [1000,92,0]\n{999:13} → [1000,13,0]');
  const cmd = section(t('全部命令：key = 999', 'All commands: key = 999'));
  table(cmd, [t('请求','Request'),t('名称','Name'),t('行为 / 前提','Behavior / prerequisites'),t('响应','Response')], commands.map(r => [`{999:${r[0]}}`,r[en?2:1],r[en?4:3],r[5]]));
  paragraph(cmd, '0/13 仅能在设置会话内且不在采样中调用。11/12 异步完成后才应答。60 秒无协议请求或关闭串口会放弃未应用设置。固件支持命令 99；成功应答只确认请求已接受，不确认 ISP 枚举。1200 波特率自动跳转已禁用。', 'Commands 0/13 require settings mode with no capture in progress. Commands 11/12 reply after asynchronous capture completes. After 60 seconds without a protocol request, or on closing the port, unapplied settings are discarded. The firmware supports command 99. A successful reply confirms acceptance, not ISP enumeration. Automatic 1200-baud entry is disabled.');
  const config = section(t('全部配置字节：key = 0–136', 'All configuration bytes: key = 0–136'));
  paragraph(config, '读取用 {999:1}。写入用 {索引:字节值}，字节值 0–255。普通写入需先执行 10，不能在端点采集中写入；0–3 与 89–91 只读，校准字段只能由 11/12 更新。全部修改完成后执行 13 应用或 0 保存，14 放弃。超出字节/索引范围的普通写入可能无应答，不要发送。', 'Read with {999:1}. Write with {index:byte}, where byte is 0–255. Begin with command 10; do not write during endpoint capture. Indices 0–3 and 89–91 are read-only; calibration fields are updated only by 11/12. Finish with 13 to apply, 0 to save, or 14 to cancel. Out-of-range byte/index writes may receive no reply and must not be sent.');
  table(config,[t('索引','Index'),t('含义与范围','Meaning and range')],fields.map(r => [r[0],r[en?2:1]]));
  paragraph(config, '键码：32–126 为可打印 ASCII；128–135 为左右 Ctrl/Shift/Alt/Win；136 及以上编码转换为 HID usage = 编码 − 136。例如 Enter=176、Tab=179、方向右/左/下/上=215/216/217/218。文本支持最多 30 个 ASCII 字节，不支持中文文本。', 'Key codes: 32–126 are printable ASCII; 128–135 are left/right Ctrl/Shift/Alt/Win; codes 136 and above map to HID usage = code − 136. Examples: Enter=176, Tab=179, right/left/down/up=215/216/217/218. Text supports at most 30 ASCII bytes, not Chinese text.');
  const mode = section(t('线性预设与双击反向', 'Linear presets and double-click reversal'));
  table(mode,[t('预设','Preset'),t('功能','Function')],presets.map(r=>[r[0],r[en?2:1]]));
  paragraph(mode, 'V06 的索引 124 = 预设 + 128 可启用双击反向，例如 130 表示滚轮向上并允许双击反向。双击切换音量映射方向、滚轮上下或面积/压力大小方向；再次双击恢复。运行中的方向不写入 Flash，应用设置、重新同步输出、重新上电或 USB 状态重置后恢复。预设 4 不支持反向。', 'In V06, index 124 = preset + 128 enables double-click reversal; 130 means wheel up with reversal enabled. Double-click reverses volume mapping, wheel direction, or area/pressure mapping; another double-click restores it. Runtime direction is not written to Flash; applying settings, resynchronization, restart or USB state reset restores the preset direction. Preset 4 cannot reverse.');
  paragraph(mode, 'V2.6.0 起线性模式也统计有效按下后的释放，按触发/释放点或 RT 判定；浅行程未触发不计数，暂停/故障不计数。计数仅在保存配置时写入 Flash。面积/压力只支持固定坐标触控；当前光标鼠标点击不带面积/压力，设备无法自行读取系统鼠标坐标。', 'From V2.6.0, linear mode counts releases after valid actuation, based on thresholds or RT. Shallow travel without actuation, pauses and faults do not count. The count is persisted only when saving configuration. Area/pressure require fixed-coordinate touch. Cursor mouse clicks carry no area/pressure, and the device cannot read the system cursor coordinates by itself.');
  const live = section(t('实时状态：命令 3', 'Live status: command 3'));
  code(live, '[1001,' + status.map(r=>r[0]).join(',') + ']');
  table(live,[t('数组索引','Array index'),t('字段','Field'),t('含义','Meaning')],status.map((r,i)=>[i+1,r[0],r[en?2:1]]));
  paragraph(live, 'V2.6.0 状态共 13 项，旧版 12 项没有 reversed，更早的 10 项没有 RT 极值/周期。reversed 是相对于所选预设的临时方向，不是保存的启用开关。', 'V2.6.0 status has 13 items. Older 12-item status omits reversed; earlier 10-item status also omits RT extreme/cycle. reversed is the runtime direction relative to the selected preset, not the saved enable switch.');
  const caps=section(t('能力位：命令 4','Capability bits: command 4'));table(caps,[t('位','Bit'),t('含义','Meaning')],capabilities.map(r=>[r[0],r[en?2:1]]));
  const ack=section(t('应答与错误码','Replies and errors'));code(ack,'[1000,keyOrCommand,status]\n');table(ack,[t('状态','Status'),t('含义','Meaning')],errors.map(r=>[r[0],r[en?2:1]]));
  paragraph(ack,'所有响应是整数数组并以换行结束。版本、配置、状态等查询使用专用数组而非 ACK。旧固件对不支持的查询一般返回状态 1；遇到超时应重新连接，不把未确认设置当成成功。','All responses are integer arrays ending in a newline. Version/config/status queries use dedicated arrays rather than ACKs. Older firmware generally returns status 1 for unsupported queries. Reconnect after a timeout; do not treat unconfirmed changes as successful.');
}
render();
document.getElementById('language').addEventListener('change', render);
window.addEventListener('storage', render);
