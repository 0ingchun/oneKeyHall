export function calibrationSpan(c, draft = false) {
  if (!c?.[89]) return { value: '—', note: '完成顶部和底部采集后显示；最低要求 16 个 ADC 计数。' };
  const span = Math.abs(c[91] - c[90]);
  return { value: `${span} ADC`, note: `${draft ? '本次采集 · 待应用' : '当前校准'} · |${c[91]} − ${c[90]}| = ${span} · ${span >= 16 ? '达到最低要求' : '跨度不足 16'}${span ? ` · 每计数约 ${(100 / span).toFixed(2)}% 行程` : ''}` };
}
