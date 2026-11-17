// Mirrors the firmware's full-saturation, 8-bit hue conversion.
export function hueColor(hue) {
  const region = Math.floor(hue / 43), remainder = (hue - region * 43) * 6;
  const q = remainder ? 255 - remainder : 254, t = remainder;
  return [[255,t,0],[q,255,0],[0,255,t],[0,q,255],[t,0,255],[255,0,q]][region];
}
export function linearLight(mode, position, brightness, start, end, color, valid = true) {
  const p = Math.max(0, Math.min(100, position));
  const hue = start + Math.sign(end - start) * Math.floor(Math.abs(end - start) * p / 100);
  const level = !valid ? 0 : mode === 5 ? brightness : Math.floor(brightness * (mode === 4 ? 100 - p : p) / 100);
  return { color: mode >= 5 ? '#' + hueColor(hue).map(v => v.toString(16).padStart(2, '0')).join('') : color, level, hue };
}
export function mountLighting(doc) {
  const $ = id => doc.getElementById(id);
  const radios = [...doc.querySelectorAll('input[name="rgb-effect"]')];
  const channels = ['r', 'g', 'b'];
  let status = null;
  function preview() {
    const mode = Number($('rgb-mode').value), hex = $('rgb-color').value;
    let color = mode === 2 ? 'linear-gradient(90deg,#ff4b69,#ffc940,#63df7d,#55b7ff,#be70ff)' : hex;
    let level = Number($('brightness').value);
    if (mode >= 3) {
      const valid = !!status?.[5] && !status[9];
      const light = linearLight(mode, status?.[3] || 0, level, Number($('rgb-hue-start').value), Number($('rgb-hue-end').value), hex, valid);
      color = light.color; level = light.level;
      $('rgb-preview-note').textContent = valid ? `行程 ${status[3]}% · 预览亮度 ${level}/255 · 有效修改自动应用` : '连接并完成校准后显示行程灯效预览；未校准或 ADC 异常时灯光关闭。';
    } else $('rgb-preview-note').textContent = mode === 2 ? 'HUE 渐变 · 亮度为 0 时关闭灯光' : `${hex.toUpperCase()} · 亮度为 0 时关闭灯光`;
    $('rgb-swatch').style.background = color;
    $('rgb-swatch').style.opacity = level / 255;
  }
  function refresh() {
    const mode = Number($('rgb-mode').value);
    for (const radio of radios) radio.checked = Number(radio.value) === mode;
    $('rgb-channels').hidden = mode === 2 || mode >= 5;
    $('rgb-animation').hidden = mode !== 1 && mode !== 2;
    $('rgb-hue').hidden = mode < 5;
    const hex = $('rgb-color').value;
    channels.forEach((channel, i) => {
      const value = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
      $(`rgb-${channel}`).value = value;
      $(`rgb-${channel}-value`).textContent = value;
    });
    for (const id of ['brightness', 'rgb-step', 'rgb-interval', 'rgb-hue-start', 'rgb-hue-end']) $(`${id}-value`).textContent = $(id).value + (id === 'rgb-interval' ? ' ms' : '');
    preview();
  }
  radios.forEach(radio => radio.addEventListener('change', () => { if (radio.checked) { $('rgb-mode').value = radio.value; refresh(); } }));
  channels.forEach(channel => $(`rgb-${channel}`).addEventListener('input', () => {
    $('rgb-color').value = '#' + channels.map(c => Number($(`rgb-${c}`).value).toString(16).padStart(2, '0')).join(''); refresh();
  }));
  for (const id of ['rgb-color', 'brightness', 'rgb-step', 'rgb-interval', 'rgb-hue-start', 'rgb-hue-end']) $(id).addEventListener('input', refresh);
  refresh();
  return {
    refresh,
    render(c) {
      // Interval/step and hue endpoints share EEPROM bytes, but separate controls
      // keep zero hue values valid without producing an invalid interval slider.
      if (c[14] >= 5) {
        $('rgb-hue-start').value = c[15]; $('rgb-hue-end').value = c[16];
      }
      $('rgb-interval').value = Math.max(1, c[15]); $('rgb-step').value = Math.max(1, c[16]);
      refresh();
    },
    write(c) {
      if (c[14] >= 5) { c[15] = Number($('rgb-hue-start').value); c[16] = Number($('rgb-hue-end').value); }
    },
    sample(s) { status = s; preview(); },
    support(enabled) { for (const radio of radios) if (Number(radio.value) >= 3) radio.disabled = !enabled; }
  };
}
