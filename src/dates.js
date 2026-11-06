// Calendar dates as local ISO strings (YYYY-MM-DD). Arithmetic goes through
// the Date constructor's day field, never through milliseconds, so a 23- or
// 25-hour day at a daylight-saving change can't skip or repeat a date.

const parts = (iso) => iso.split('-').map(Number);
const local = (iso) => { const [y, m, d] = parts(iso); return new Date(y, m - 1, d); };
export const isoOf = (date) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
};

export const todayIso = (now = new Date()) => isoOf(now);
export const addDays = (iso, n) => { const [y, m, d] = parts(iso); return isoOf(new Date(y, m - 1, d + n)); };

// Weeks run Monday to Sunday.
export const mondayOf = (iso) => addDays(iso, -((local(iso).getDay() + 6) % 7));
export const weekDays = (monday) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));
export const weeksBetween = (fromMonday, toMonday) => Math.round((local(toMonday) - local(fromMonday)) / 6048e5);

// "2 – 8 Nov", "30 Nov – 6 Dec", "28 Dec 2026 – 3 Jan 2027" (the year only when it isn't this one).
export function rangeLabel(monday, today) {
  const sunday = addDays(monday, 6);
  const [y1, m1] = parts(monday), [y2, m2] = parts(sunday), [ty] = parts(today);
  const fmt = (iso, opts) => local(iso).toLocaleDateString('en-GB', opts);
  if (y1 !== ty || y2 !== ty) return `${fmt(monday, { day: 'numeric', month: 'short', year: 'numeric' })} – ${fmt(sunday, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  if (m1 === m2) return `${parts(monday)[2]} – ${fmt(sunday, { day: 'numeric', month: 'short' })}`;
  return `${fmt(monday, { day: 'numeric', month: 'short' })} – ${fmt(sunday, { day: 'numeric', month: 'short' })}`;
}

// "This week", "Next week", "Last week", "In 4 weeks", "3 weeks ago".
export function weekDistance(monday, today) {
  const n = weeksBetween(mondayOf(today), monday);
  if (n === 0) return 'This week';
  if (n === 1) return 'Next week';
  if (n === -1) return 'Last week';
  return n > 0 ? `In ${n} weeks` : `${-n} weeks ago`;
}
