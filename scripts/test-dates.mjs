// Offline checks for the calendar arithmetic behind the Week schedule.
// Run under several time zones: TZ=America/New_York node scripts/test-dates.mjs
import assert from 'node:assert/strict';
import { addDays, mondayOf, rangeLabel, todayIso, weekDays, weekDistance, weeksBetween } from '../src/dates.js';

const step = (label) => console.log(`- ${label}`);

assert.equal(addDays('2026-11-06', 1), '2026-11-07');
assert.equal(addDays('2026-11-30', 1), '2026-12-01');
assert.equal(addDays('2026-12-31', 1), '2027-01-01');
assert.equal(addDays('2026-03-01', -1), '2026-02-28');
assert.equal(addDays('2028-03-01', -1), '2028-02-29');
step('addDays crosses months, years and leap days');

// US clocks fall back on 1 Nov 2026 and spring forward on 8 Mar 2026; the EU on 25 Oct and 29 Mar.
for (const [from, to] of [['2026-10-31', '2026-11-01'], ['2026-11-01', '2026-11-02'], ['2026-03-07', '2026-03-08'], ['2026-03-08', '2026-03-09'], ['2026-10-24', '2026-10-25'], ['2026-10-25', '2026-10-26'], ['2026-03-28', '2026-03-29'], ['2026-03-29', '2026-03-30']]) {
  assert.equal(addDays(from, 1), to);
  assert.equal(addDays(to, -1), from);
}
let day = '2026-01-01';
for (let i = 0; i < 365; i++) day = addDays(day, 1);
assert.equal(day, '2027-01-01');
step('no skipped or repeated dates at daylight-saving changes (a whole year, day by day)');

assert.equal(mondayOf('2026-11-06'), '2026-11-02'); // Friday
assert.equal(mondayOf('2026-11-02'), '2026-11-02'); // Monday
assert.equal(mondayOf('2026-11-08'), '2026-11-02'); // Sunday
assert.equal(mondayOf('2027-01-01'), '2026-12-28'); // across a year
assert.equal(mondayOf('2026-11-01'), '2026-10-26'); // the US fall-back Sunday
assert.deepEqual(weekDays('2026-10-26'), ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
step('weeks run Monday to Sunday, also across a year and a clock change');

assert.equal(weeksBetween('2026-11-02', '2026-11-30'), 4);
assert.equal(weeksBetween('2026-11-02', '2026-10-26'), -1);
assert.equal(weekDistance('2026-11-02', '2026-11-06'), 'This week');
assert.equal(weekDistance('2026-11-09', '2026-11-06'), 'Next week');
assert.equal(weekDistance('2026-10-26', '2026-11-06'), 'Last week');
assert.equal(weekDistance('2026-11-30', '2026-11-06'), 'In 4 weeks');
assert.equal(weekDistance('2026-10-12', '2026-11-06'), '3 weeks ago');
step('distance in weeks');

assert.equal(rangeLabel('2026-11-02', '2026-11-06'), '2 – 8 Nov');
assert.equal(rangeLabel('2026-11-30', '2026-11-06'), '30 Nov – 6 Dec');
assert.equal(rangeLabel('2026-12-28', '2026-11-06'), '28 Dec 2026 – 3 Jan 2027');
assert.equal(rangeLabel('2027-02-01', '2026-11-06'), '1 Feb 2027 – 7 Feb 2027');
step('range labels: same month, two months, another year');

assert.equal(todayIso(new Date(2026, 10, 6, 23, 59)), '2026-11-06');
assert.equal(todayIso(new Date(2026, 10, 7, 0, 0)), '2026-11-07');
step('today is the local calendar date');

console.log('dates: all checks passed');
