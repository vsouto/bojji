// Offline checks for the optional task time and the "Add to Google Calendar" link.
import assert from 'node:assert/strict';
import { googleCalendarUrl, MAX_DETAILS, MAX_DETAILS_ENCODED } from '../src/calendar.js';
import { newItem, parse, serialize } from '../src/items.js';

const step = (label) => console.log(`- ${label}`);
const query = (url) => {
  const u = new URL(url);
  assert.equal(u.origin + u.pathname, 'https://calendar.google.com/calendar/render');
  return u.searchParams;
};
const task = (fields) => newItem('task', { title: 'Pay the bill', ...fields });

let q = query(googleCalendarUrl(task({ due: '2026-11-04' })));
assert.equal(q.get('action'), 'TEMPLATE');
assert.equal(q.get('text'), 'Pay the bill');
assert.equal(q.get('dates'), '20261104/20261105');
assert.equal(q.has('ctz'), false);
assert.equal(q.has('details'), false);
step('all-day: dates=YYYYMMDD/next day, no ctz, no empty details');

assert.equal(query(googleCalendarUrl(task({ due: '2026-12-31' }))).get('dates'), '20261231/20270101');
assert.equal(query(googleCalendarUrl(task({ due: '2026-01-31' }))).get('dates'), '20260131/20260201');
assert.equal(query(googleCalendarUrl(task({ due: '2028-02-28' }))).get('dates'), '20280228/20280229');
step('all-day end date rolls over the year (Dec 31), the month and a leap day');

q = query(googleCalendarUrl(task({ due: '2026-11-04', time: '09:30' }), { timeZone: 'Europe/Lisbon' }));
assert.equal(q.get('dates'), '20261104T093000/20261104T103000');
assert.equal(q.get('ctz'), 'Europe/Lisbon');
assert.equal(query(googleCalendarUrl(task({ due: '2026-12-31', time: '23:30' }), { timeZone: 'America/Sao_Paulo' })).get('dates'), '20261231T233000/20270101T003000');
step('timed: one hour in floating local time (no Z) plus ctz, crossing midnight into a new year');

const title = 'Q4 & Q1: 50% off? #Siemens / a+b = "c" ção 日本 ☕';
const url = googleCalendarUrl(task({ title, due: '2026-11-04', body: 'Line 1\nLine 2 & more', tags: ['Siemens', 'Proposals'] }));
assert.doesNotMatch(url.split('?')[1], /[ #"+\n]/, 'every value is percent-encoded');
assert.equal(url.split('?')[1].split('&').length, 4, 'special characters must not add parameters');
q = query(url);
assert.equal(q.get('text'), title);
assert.equal(q.get('details'), 'Line 1\nLine 2 & more\n\n#Siemens #Proposals');
step('special characters in the title and body round-trip; tags go in details');

const long = '☕'.repeat(5000);
const d = query(googleCalendarUrl(task({ due: '2026-11-04', body: long, tags: ['Home'] }))).get('details');
assert.ok([...d].length <= MAX_DETAILS, `details is ${[...d].length} characters`);
assert.ok(d.endsWith('…\n\n#Home'), 'truncated body keeps the tags');
assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(d), 'no half emoji');
assert.ok(encodeURIComponent(d).length <= MAX_DETAILS_ENCODED);
const ascii = query(googleCalendarUrl(task({ due: '2026-11-04', body: 'x'.repeat(10000) }))).get('details');
assert.equal(ascii.length, MAX_DETAILS);
assert.ok(googleCalendarUrl(task({ due: '2026-11-04', body: 'x'.repeat(10000) })).length < 2000);
step(`long body is cut to ${MAX_DETAILS} characters (${MAX_DETAILS_ENCODED} bytes encoded) with an ellipsis, tags kept, no half emoji`);

assert.equal(googleCalendarUrl(task({ due: null })), null);
step('no due date, no link');

const old = '---\nid: a1\ntype: task\ntitle: Old task\nstatus: todo\ndue: 2026-10-29\nupdated: 2026-10-27T19:40:12.000Z\n---\nBody';
const parsed = parse(old);
assert.equal(parsed.time, null);
assert.equal(parsed.due, '2026-10-29');
assert.doesNotMatch(serialize(parsed), /^time:/m);
const timed = parse(serialize({ ...parsed, time: '14:05' }));
assert.equal(timed.time, '14:05');
assert.match(serialize(timed), /\ndue: 2026-10-29\ntime: 14:05\n/);
assert.doesNotMatch(serialize({ ...timed, due: null }), /^time:/m);
step('items: files without time parse and save unchanged; time: HH:MM round-trips, only beside a date');

console.log('\nCalendar tests passed.');
