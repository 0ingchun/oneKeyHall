import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { translateText, initialLanguage, languageStorageKey, mountLanguage } from '../host/assets/i18n.mjs';
import { messages } from '../host/assets/i18n-catalog.mjs';
import { errors, validateConfig } from '../host/assets/protocol.mjs';
import { calibrationSpan } from '../host/assets/calibration.mjs';

const han = /[\u4e00-\u9fff]/u;
test('both pages have English for all static text and accessible labels', async () => {
  for (const path of ['../host/index.html', '../host/assets/touch-test.html', '../host/assets/protocol.html']) {
    const html = (await readFile(new URL(path, import.meta.url), 'utf8')).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gu, '');
    const texts = [...html.matchAll(/>([^<]+)</gu)].map(m => m[1]);
    texts.push(...[...html.matchAll(/(?:placeholder|title|aria-label)="([^"]+)"/gu)].map(m => m[1]));
    for (const text of texts.filter(text => han.test(text))) {
      if (['中文', 'Language / 语言'].includes(text.trim())) continue; // Language autonyms.
      assert(!han.test(translateText(text, 'en')), `Untranslated static text: ${text}`);
      assert.equal(translateText(text, 'zh-CN'), text);
    }
  }
  for (const [source, english] of messages) {
    assert(english && !han.test(english), source);
    assert.equal(translateText(source, 'en'), english);
  }
});

test('live telemetry, previews, logs, validation and confirmation retain their values in English', () => {
  const samples = [
    '进入下载模式将关闭 LED 并断开当前连接，未保存的设备配置会丢失。\n\n请先保存需要保留的配置，并准备好烧录工具。是否继续？',
    '行程 50% · 预览亮度 127/255 · 有效修改自动应用',
    '校准已自动应用。请松开轴体；点击“保存配置”后断电保留。',
    '已放弃待应用修改或未完成的校准；已自动应用的参数保持不变。',
    '行程 50% · 预览亮度 127/255 · 应用后设备生效', '配置格式 V05', '组合键 5', '原配置值 253',
    '顶部 ADC 200 / 底部 ADC 100 · 按下时数值减小', '顶部 ADC 100 / 底部 ADC 200 · 按下时数值增大',
    '每计数约 1.25% 相对行程', '当前 RT 最小有效距离为 13%（至少 2 个 ADC 计数）。',
    '105%（距离 12%） · 超出行程', '45%（距离 5%）',
    '高亮线为下一次释放阈值，另一条为距离参考。',
    '高亮线为下一次按下阈值，另一条为距离参考。再次按下阈值超出行程，需抬起更多或回到顶部复位。',
    '固件能力 0x1f：支持进入下载模式。',
    '固件能力 0x1e：当前固件不支持软件进入下载模式。',
    'KEY2 文本只支持最多 30 个 ASCII 字节（英文、数字、符号）。', '线性参数 volumeSteps 超出范围或步长无效。',
    '估算目标音量 73%', '滚轮目标 0.5 格/秒', '接触面积 0.13% 屏幕 · 压力 128/255',
    'HUE 渐变 · 亮度为 0 时关闭灯光', '#AABBCC · 亮度为 0 时关闭灯光',
    '按下 KeyA', '释放 Space', 'a · 12.500 s · 持续 150 ms',
    'pointermove · 类型 touch · 压力 0.502 · 接触 30.0 × 40.0 CSS px · 坐标 500, 600',
    '用户确认；能力 0x1f；请求进入队列，等待固件应答。', '请求未完成：串口已关闭。',
  ];
  const c = Array(137).fill(0); c[89] = 1; c[90] = 100; c[91] = 200;
  samples.push(calibrationSpan(c).note, calibrationSpan(c, true).note);
  c[91] = 100; samples.push(calibrationSpan(c).note);
  for (const text of [...samples, ...Object.values(errors)]) assert(!han.test(translateText(text, 'en')), text);
  for (const prefix of ['已保存到设备，断电后保留。请完全松开轴体以启用按键。', '已应用到运行内存，断电后恢复已保存配置。请完全松开轴体。']) {
    for (const suffix of [' 若修改了名称，请拔插 USB 以更新 USB 名称。', ' USB 名称需保存配置后拔插才能生效。']) assert(!han.test(translateText(prefix + suffix, 'en')));
  }
  const log = samples.slice(-2).map((text, i) => `2026-11-17T05:00:0${i}.123Z  ${text}`).join('\n');
  assert(!han.test(translateText(log, 'en')));
  assert(translateText(log, 'en').startsWith('2026-11-17T05:00:00.123Z  '));
  assert.equal(translateText('未连接设备 · 已连接', 'en'), '未连接设备 · Connected'); // User's device name stays intact.
  assert.equal(translateText('任意用户内容', 'en'), '任意用户内容');
  assert.throws(() => validateConfig([]), error => !han.test(translateText(error.message, 'en')));
});

test('language preference uses saved selection, handles blocked storage and browser defaults', () => {
  assert.equal(initialLanguage(null, 'zh-TW'), 'zh-CN');
  assert.equal(initialLanguage(null, 'en-US'), 'en');
  assert.equal(initialLanguage({ getItem: () => 'en' }, 'zh-CN'), 'en');
  assert.equal(initialLanguage({ getItem: () => 'invalid' }, 'zh-CN'), 'zh-CN');
  assert.equal(initialLanguage({ getItem() { throw Error('blocked'); } }, 'en-GB'), 'en');
});

// Small DOM/event doubles exercise presentation changes independently of USB.
class TextNode {
  nodeType = 3;
  constructor(data) { this.data = data; }
}
class Element {
  nodeType = 1;
  constructor(tag, attrs = {}, children = []) { this.tag = tag; this.attrs = { ...attrs }; this.childNodes = children; this.handlers = {}; for (const child of children) child.parentElement = this; }
  hasAttribute(key) { return key in this.attrs; }
  getAttribute(key) { return this.attrs[key]; }
  setAttribute(key, value) { this.attrs[key] = value; }
  matches(selector) { return selector.split(',').some(s => s === this.tag || (s.startsWith('[') && this.hasAttribute(s.slice(1, -1)))); }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector); }
  addEventListener(type, handler) { this.handlers[type] = handler; }
}
test('switching twice and receiving new status preserves controls, user content and handlers', () => {
  const label = new TextNode('连接设备'), status = new TextNode('等待设备');
  const input = new Element('input', { placeholder: '仅支持 ASCII 字符' }); input.value = '连接设备'; input.selectionStart = 2;
  const textarea = new Element('textarea', {}, [new TextNode('按下')]); textarea.value = '保存配置';
  const editable = new Element('div', { contenteditable: '' }, [new TextNode('设备信息')]);
  const select = new Element('select', { 'data-i18n-ignore': '' });
  const button = new Element('button', { title: '触发点' }, [label]); let clicks = 0;
  button.addEventListener('click', () => ++clicks); button.disabled = true;
  const root = new Element('html', {}, [select, button, new Element('p', {}, [status]), input, textarea, editable]);
  const saved = new Map(); const storage = { getItem: key => saved.get(key), setItem: (k, v) => saved.set(k, v) };
  const handlers = {}; let notify;
  const win = { localStorage: storage, navigator: { language: 'zh-CN' }, addEventListener(type, handler) { handlers[type] = handler; },
    MutationObserver: class { constructor(callback) { notify = callback; } observe() {} } };
  const doc = { documentElement: root, getElementById: id => { assert.equal(id, 'language'); return select; } };
  const mounted = mountLanguage(doc, win);
  select.value = 'en'; select.handlers.change();
  assert.equal(root.lang, 'en'); assert.equal(label.data, 'Connect device'); assert.equal(status.data, 'Waiting for device');
  assert.equal(input.getAttribute('placeholder'), 'ASCII characters only'); assert.equal(button.getAttribute('title'), 'Actuation point');
  assert.equal(input.value, '连接设备'); assert.equal(input.selectionStart, 2); assert.equal(textarea.value, '保存配置');
  assert.equal(textarea.childNodes[0].data, '按下'); assert.equal(editable.childNodes[0].data, '设备信息');
  assert(button.disabled); button.handlers.click(); assert.equal(clicks, 1); assert.equal(saved.get(languageStorageKey), 'en');
  status.data = '已就绪 · 按键输出启用'; notify([{ type: 'characterData', target: status }]);
  assert.equal(status.data, 'Ready · Output enabled');
  notify([{ type: 'characterData', target: status }]); assert.equal(status.data, 'Ready · Output enabled'); // Own mutations are idempotent.
  select.value = 'zh-CN'; select.handlers.change();
  assert.equal(label.data, '连接设备'); assert.equal(status.data, '已就绪 · 按键输出启用'); assert.equal(input.getAttribute('placeholder'), '仅支持 ASCII 字符');
  saved.set(languageStorageKey, 'en'); handlers.storage({ key: languageStorageKey });
  assert.equal(mounted.language, 'en'); assert.equal(label.data, 'Connect device');
  const fresh = new TextNode('保存配置'); fresh.parentElement = button;
  notify([{ type: 'childList', addedNodes: [fresh] }]); assert.equal(fresh.data, 'Save to device');
  assert.equal(mounted.translate('串口已关闭。'), 'Serial port closed.');
});
