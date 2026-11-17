export function mountTheme(doc, target) {
  const select = doc.getElementById('theme');
  const media = target.matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';
  try { preference = target.localStorage.getItem('onekeyhall-theme') || 'system'; } catch {}
  if (!['light', 'dark', 'system'].includes(preference)) preference = 'system';
  select.value = preference;
  const apply = () => { doc.documentElement.dataset.theme = select.value === 'system' ? (media.matches ? 'dark' : 'light') : select.value; };
  select.addEventListener('change', () => { try { target.localStorage.setItem('onekeyhall-theme', select.value); } catch {} apply(); });
  media.addEventListener('change', apply); apply();
}
