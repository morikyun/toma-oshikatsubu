const DAY = 24 * 60 * 60 * 1000;
const JST = 9 * 60 * 60 * 1000;

// A date-only event stays visible for its entire calendar day in Japan.
export function eventExpiry(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return NaN;
  const start = Date.parse(date + 'T00:00:00+09:00');
  if (!Number.isFinite(start) || new Date(start + JST).toISOString().slice(0,10) !== date) return NaN;
  return start + DAY;
}

export function eventIsCurrent(date, now = Date.now()) {
  return Number.isFinite(now) && now < eventExpiry(date);
}
