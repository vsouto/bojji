// "Add to Google Calendar": a pre-filled event link, one way, no Google API.
// A task with only a due date becomes an all-day event; with a time it is a
// one-hour event in floating local time, pinned to the given time zone.

const BASE = 'https://calendar.google.com/calendar/render';
// Keeps the whole URL well under browser and Google limits, also for non-Latin
// text, where one character can take up to 12 bytes once encoded.
export const MAX_DETAILS = 1500; // characters
export const MAX_DETAILS_ENCODED = 4000; // bytes after percent-encoding

const pad = (n, size = 2) => String(n).padStart(size, '0');
// Date.UTC is only a calendar here: it rolls days, months and years over and has no DST.
const stamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
// encodeURIComponent throws on a lone surrogate, which a hand-edited file could hold.
const whole = (text) => text.toWellFormed?.() ?? text;
const clock = (d) => `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`;

function details(task) {
  let body = whole(task.body ?? '').trim();
  const tags = (task.tags ?? []).map((t) => `#${t}`).join(' ');
  const extra = tags ? `\n\n${tags}` : '';
  const size = (text) => [[...text].length, encodeURIComponent(text).length];
  const [chars, bytes] = size(body + extra);
  if (chars > MAX_DETAILS || bytes > MAX_DETAILS_ENCODED) {
    // Cut whole code points, so an emoji or accent is never split in half.
    let [c, b] = size('…' + extra), kept = '';
    for (const char of body) {
      c += 1; b += encodeURIComponent(char).length;
      if (c > MAX_DETAILS || b > MAX_DETAILS_ENCODED) break;
      kept += char;
    }
    body = kept.trimEnd() + '…';
  }
  return (body + extra).trim();
}

export function googleCalendarUrl(task, { timeZone, minutes = 60 } = {}) {
  const [y, m, d] = (task.due ?? '').split('-').map(Number);
  if (!y || !m || !d) return null;
  const [hh, mm] = /^\d{2}:\d{2}$/.test(task.time ?? '') ? task.time.split(':').map(Number) : [];
  let dates;
  const params = [['action', 'TEMPLATE'], ['text', whole(task.title || 'Task')]];
  if (hh == null) {
    dates = `${stamp(new Date(Date.UTC(y, m - 1, d)))}/${stamp(new Date(Date.UTC(y, m - 1, d + 1)))}`; // end is exclusive
  } else {
    const start = new Date(Date.UTC(y, m - 1, d, hh, mm));
    const end = new Date(start.getTime() + minutes * 6e4);
    dates = `${stamp(start)}${clock(start)}/${stamp(end)}${clock(end)}`;
  }
  params.push(['dates', dates]);
  const text = details(task);
  if (text) params.push(['details', text]);
  if (hh != null && timeZone) params.push(['ctz', timeZone]);
  return `${BASE}?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}
