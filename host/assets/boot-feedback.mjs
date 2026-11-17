const storageKey = 'onekeyhall-boot-events';
export function createBootFeedback(storage, render, now = () => new Date().toISOString()) {
  let events = [];
  try {
    // Remove history persisted by older versions; new events stay in memory.
    storage?.removeItem(storageKey);
  } catch { /* Storage may be blocked; page-local history still works. */ }
  render(events);
  return text => {
    events = [...events, { time: now(), text }].slice(-12);
    render(events);
  };
}
