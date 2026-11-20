export function supportsOutputSwitches(release) {
  if (!/^\d+\.\d+\.\d+$/.test(release?.version || '')) return false;
  const [major, minor, patch] = release.version.split('.').map(Number);
  return major > 2 || (major === 2 && (minor > 6 || (minor === 6 && patch >= 2)));
}

export function writeOutputSwitches(config, supported, lightOff) {
  if (supported) config[7] = lightOff ? 2 : 0;
}
