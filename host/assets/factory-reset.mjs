export const factoryResetConfirmation = '恢复出厂设置将清除设备名称、磁轴校准、按键映射、灯光、线性参数和累计释放次数，并立即保存到设备。此操作无法撤销。\n\n完成后需重新校准；拔插 USB 后恢复默认设备名称。确定继续？';

export function supportsFactoryReset(release) {
  if (!/^\d+\.\d+\.\d+$/.test(release?.version || '')) return false;
  const [major, minor, patch] = release.version.split('.').map(Number);
  return major > 2 || (major === 2 && (minor > 6 || (minor === 6 && patch >= 1)));
}

// Called with the app's operation lock held. Cancellation must not discard drafts.
export async function resetToFactory(client, { confirm, cancelPending }) {
  if (!confirm()) return null;
  cancelPending();
  await client.command(15); // Device persists and verifies defaults before ACK.
  return client.config();
}
