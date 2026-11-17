export function rtMarkers(status, settings) {
  if (!settings.enabled || !status || !status[5] || status[8] < 16) return null;
  const minimum = Math.ceil(200 / status[8]);
  const up = Math.max(settings.up, minimum), down = Math.max(settings.down, minimum);
  const live = status.length >= 12 && !!status[11] && !status[7] && !status[9] && !!status[6];
  const anchor = live ? status[10] : status[3];
  // Both distances remain visible. Only the line for the next transition is active.
  const release = Math.max(settings.top, anchor - up);
  const press = anchor + down;
  return { release, press, up, down, live, active: live ? (status[4] ? 'release' : 'press') : null,
    pressReachable: press <= 100, telemetry: status.length >= 12 };
}
