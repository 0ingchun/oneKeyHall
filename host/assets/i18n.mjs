import { messages } from './i18n-catalog.mjs';

export const languageStorageKey = 'onekeyhall-language';
const patterns = [
  [/^行程 (\d+)% · 预览亮度 (\d+)\/255 · 有效修改自动应用$/u, (_, p, b) => `Travel ${p}% · Preview brightness ${b}/255 · Valid changes apply automatically`],
  [/^行程 (\d+)% · 预览亮度 (\d+)\/255 · 应用后设备生效$/u, (_, p, b) => `Travel ${p}% · Preview brightness ${b}/255 · Apply to update device`],
  [/^(.+) · 已连接$/u, (_, name) => `${name} · Connected`],
  [/^配置格式 V(\d+)$/u, (_, version) => `Config format V${version}`],
  [/^组合键 (\d+)$/u, (_, n) => `Chord key ${n}`],
  [/^原配置值 (\d+)$/u, (_, n) => `Stored value ${n}`],
  [/^顶部 ADC (\d+) \/ 底部 ADC (\d+) · 按下时数值(增大|减小)$/u, (_, top, bottom, direction) => `Rest ADC ${top} / Bottom ADC ${bottom} · ${direction === '增大' ? 'Increases' : 'Decreases'} when pressed`],
  [/^每计数约 ([\d.]+)% 相对行程$/u, (_, n) => `About ${n}% relative travel per ADC count`],
  [/^当前 RT 最小有效距离为 (\d+)%（至少 2 个 ADC 计数）。$/u, (_, n) => `Current minimum effective RT distance: ${n}% (at least 2 ADC counts).`],
  [/^([\d.-]+)%（距离 (\d+)%）( · 超出行程)?$/u, (_, point, distance, excess) => `${point}% (distance ${distance}%)${excess ? ' · Beyond full travel' : ''}`],
  [/^高亮线为下一次(释放|按下)阈值，另一条为距离参考。(再次按下阈值超出行程，需抬起更多或回到顶部复位。)?$/u, (_, action, excess) => `The highlighted line is the next ${action === '释放' ? 'release' : 'press'} threshold; the other is a distance reference.${excess ? ' The next press threshold is beyond full travel. Release further or return to rest to reset.' : ''}`],
  [/^(本次采集 · 待应用|当前校准) · (\|\d+ − \d+\| = \d+) · (达到最低要求|跨度不足 16)(?: · 每计数约 ([\d.]+)% 行程)?$/u, (_, state, math, result, step) => `${state === '当前校准' ? 'Current calibration' : 'New capture · Not applied'} · ${math} · ${result === '达到最低要求' ? 'Minimum span met' : 'Span below 16'}${step ? ` · About ${step}% travel per count` : ''}`],
  [/^固件能力 0x([\da-f]+)：支持进入下载模式。$/u, (_, bits) => `Capabilities 0x${bits}: Software ISP entry supported.`],
  [/^固件能力 0x([\da-f]+)：当前固件不支持软件进入下载模式。$/u, (_, bits) => `Capabilities 0x${bits}: This firmware does not support software ISP entry.`],
  [/^KEY([12]) 文本只支持最多 30 个 ASCII 字节（英文、数字、符号）。$/u, (_, key) => `KEY${key} text supports up to 30 ASCII bytes (letters, numbers and symbols).`],
  [/^线性参数 (\w+) 超出范围或步长无效。$/u, (_, field) => `Linear parameter ${field} is outside its range or has an invalid step.`],
  [/^估算目标音量 (\d+)%$/u, (_, n) => `Estimated target volume ${n}%`],
  [/^滚轮目标 ([\d.]+) 格\/秒$/u, (_, n) => `Target wheel rate ${n} detents/s`],
  [/^接触面积 ([\d.]+)% 屏幕 · 压力 (\d+)\/255$/u, (_, area, pressure) => `Contact area ${area}% of screen · Pressure ${pressure}/255`],
  [/^(HUE 渐变|#[\dA-F]{6}) · 亮度为 0 时关闭灯光$/u, (_, color) => `${color === 'HUE 渐变' ? 'Hue cycle' : color} · Brightness 0 turns the LED off`],
  [/^用户确认；能力 0x([\da-f]+)；请求进入队列，等待固件应答。$/u, (_, bits) => `Confirmed by user; capabilities 0x${bits}; request queued, waiting for firmware ACK.`],
  [/^请求未完成：([\s\S]*)$/u, (_, error) => `Request incomplete: ${translateText(error, 'en')}`],
  [/^(按下|释放) (.+)$/u, (_, action, key) => `${action === '按下' ? 'Pressed' : 'Released'} ${key}`],
  [/^(.*?) · ([\d.]+) s · 持续 (\d+) ms$/u, (_, key, time, duration) => `${key} · ${time} s · Held ${duration} ms`],
  [/^(pointer\w+) · 类型 (\w+) · 压力 ([\d.]+) · 接触 ([\d.]+) × ([\d.]+) CSS px · 坐标 ([\d., -]+)$/u, (_, event, type, pressure, width, height, xy) => `${event} · Type ${type} · Pressure ${pressure} · Contact ${width} × ${height} CSS px · Position ${xy}`],
];

export function translateText(source, language = 'zh-CN') {
  if (language !== 'en' || typeof source !== 'string') return source;
  const text = source.trim();
  let translated = messages.get(text);
  if (translated == null) {
    for (const [pattern, render] of patterns) {
      const match = text.match(pattern);
      if (match) { translated = render(...match); break; }
    }
  }
  if (translated == null) {
    const timestamp = text.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z\s+)([\s\S]*)$/u);
    if (timestamp) translated = timestamp[1] + translateText(timestamp[2], language);
    else if (text.includes('\n')) translated = text.split('\n').map(line => translateText(line, language)).join('\n');
    else {
      // Save/apply notices append a name-change notice. Only translate whole
      // catalog sentences, never arbitrary substrings in device names or data.
      const sentences = text.split(/(?<=。)\s*/u).filter(Boolean);
      if (sentences.length > 1 && sentences.every(sentence => messages.has(sentence))) translated = sentences.map(sentence => messages.get(sentence)).join(' ');
    }
  }
  return translated == null ? source : source.slice(0, source.length - source.trimStart().length) + translated + source.slice(source.trimEnd().length);
}

export function initialLanguage(storage, browserLanguage = 'zh-CN') {
  try { const saved = storage?.getItem(languageStorageKey); if (saved === 'en' || saved === 'zh-CN') return saved; } catch {}
  return /^zh\b/i.test(browserLanguage) ? 'zh-CN' : 'en';
}

// Presentation-only adapter for existing renderers. Retain source text per node,
// and update text/accessible labels in place; never replace controls, HTML, values,
// selection, or application state. The observer only visits changed subtrees.
export function mountLanguage(doc, target) {
  let storage;
  try { storage = target.localStorage; } catch {}
  let language = initialLanguage(storage, target.navigator?.language);
  const select = doc.getElementById('language');
  const textSources = new WeakMap(), attributeSources = new WeakMap();
  const attributes = ['title', 'placeholder', 'aria-label'];
  const ignored = 'script,style,textarea,input,[contenteditable],[data-i18n-ignore]';
  function translateNode(node) {
    if (node.nodeType === 3) {
      if (node.parentElement?.closest(ignored)) return;
      const old = textSources.get(node);
      const source = old && node.data === old.output ? old.source : node.data;
      const output = translateText(source, language);
      textSources.set(node, { source, output });
      if (node.data !== output) node.data = output;
    } else if (node.nodeType === 1) {
      if (node.closest('[data-i18n-ignore]')) return;
      for (const attr of attributes) {
        if (!node.hasAttribute(attr)) continue;
        const current = node.getAttribute(attr);
        const records = attributeSources.get(node) || {};
        const old = records[attr];
        const source = old && current === old.output ? old.source : current;
        const output = translateText(source, language);
        records[attr] = { source, output }; attributeSources.set(node, records);
        if (current !== output) node.setAttribute(attr, output);
      }
      if (node.matches(ignored)) return;
      for (const child of node.childNodes) translateNode(child);
    }
  }
  const observer = new target.MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'childList') for (const node of record.addedNodes) translateNode(node);
      else translateNode(record.target);
    }
  });
  function apply(next, persist = false) {
    if (next !== 'en' && next !== 'zh-CN') return;
    language = next; select.value = next; doc.documentElement.lang = next;
    translateNode(doc.documentElement);
    if (persist) try { storage?.setItem(languageStorageKey, next); } catch {}
  }
  select.addEventListener('change', () => apply(select.value, true));
  target.addEventListener('storage', event => {
    if (event.key === languageStorageKey || event.key === null) apply(initialLanguage(storage, target.navigator?.language));
  });
  apply(language);
  observer.observe(doc.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes });
  return { get language() { return language; }, translate: source => translateText(source, language) };
}
