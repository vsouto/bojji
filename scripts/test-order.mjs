// Offline checks for manual order: fractional keys, sorting, planMove and the file format.
import assert from 'node:assert/strict';
import {
  NOTES, TASKS, compareNotes, compareTasks, generateKeyBetween, generateNKeysBetween,
  isValidKey, keyBetween, keysBetween, planMove,
} from '../src/order.js';
import { parse, serialize } from '../src/items.js';

const step = (label) => console.log(`- ${label}`);
// A small seeded generator (mulberry32), so failures can be replayed.
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Placement, from the reference implementation's own examples.
assert.equal(generateKeyBetween(null, null), 'a0');
assert.equal(generateKeyBetween(null, 'a0'), 'Zz');
assert.equal(generateKeyBetween('a0', null), 'a1');
assert.equal(generateKeyBetween('a0', 'a1'), 'a0V');
assert.equal(generateKeyBetween('a1', 'a2'), 'a1V');
assert.equal(generateKeyBetween('a0V', 'a1'), 'a0l');
assert.equal(generateKeyBetween('Zz', 'a0'), 'ZzV');
assert.equal(generateKeyBetween('a0', 'a0V'), 'a0G');
assert.equal(generateKeyBetween('b125', 'b129'), 'b127');
assert.equal(generateKeyBetween('az', null), 'b00');
assert.equal(generateKeyBetween(null, 'b00'), 'az');
assert.deepEqual(generateNKeysBetween('a0', 'a1', 3), ['a0G', 'a0V', 'a0l']);
assert.deepEqual(generateNKeysBetween(null, null, 3), ['a0', 'a1', 'a2']);
for (const [a, b] of [['a1', 'a0'], ['a0', 'a0'], ['b00', 'az']]) assert.throws(() => generateKeyBetween(a, b), />=/);
for (const bad of ['a00', 'a0 ', '', 'A00000000000000000000000000', 'b0', '!x']) assert.equal(isValidKey(bad), false, bad);
for (const good of ['a0', 'Zz', 'a0V', 'b00', 'a1xY']) assert.equal(isValidKey(good), true, good);
step('between, before and after; a >= b throws; invalid keys are rejected');

const rand = seeded(42);
for (const [a, b] of [[null, null], [null, 'a0'], ['a0', null], ['a0', 'a1'], ['a0', 'a0V'], ['a1', 'a1V'], ['Zz', 'a0']]) {
  const key = keyBetween(a, b, rand);
  assert.ok(isValidKey(key), key);
  assert.ok((a === null || a < key) && (b === null || key < b), `${a} < ${key} < ${b}`);
}
const spread = keysBetween('a0', 'a1', 5, rand);
assert.ok(spread.every((k, i) => isValidKey(k) && (i === 0 ? 'a0' < k : spread[i - 1] < k)) && spread.at(-1) < 'a1');
step('random suffix keeps every key strictly inside its bounds, also next to a prefix bound');

// Fuzz: 5,000 insertions at random positions, keys stay sorted and valid.
{
  const r = seeded(7);
  const keys = [];
  for (let n = 0; n < 5000; n++) {
    const at = Math.floor(r() * (keys.length + 1));
    const key = keyBetween(keys[at - 1] ?? null, keys[at] ?? null, r);
    assert.ok(isValidKey(key));
    assert.ok((at === 0 || keys[at - 1] < key) && (at === keys.length || key < keys[at]));
    keys.splice(at, 0, key);
  }
  for (let i = 1; i < keys.length; i++) assert.ok(keys[i - 1] < keys[i]);
  step(`fuzz: 5,000 random insertions stay strictly sorted (longest key ${Math.max(...keys.map((k) => k.length))} characters)`);
}

{
  const r = seeded(3);
  let last = null, longest = 0;
  for (let n = 0; n < 1000; n++) { last = keyBetween(last, null, r); longest = Math.max(longest, last.length); }
  assert.ok(longest <= 6, `append: ${longest}`);
  let first = null; let longestStart = 0;
  for (let n = 0; n < 1000; n++) { first = keyBetween(null, first, r); longestStart = Math.max(longestStart, first.length); }
  assert.ok(longestStart <= 6, `prepend: ${longestStart}`);
  step(`1,000 additions at the end (longest ${longest}) and 1,000 at the start (longest ${longestStart}) stay within 6 characters`);
}

{
  const laptop = keyBetween('a0', 'a1', seeded(1));
  const phone = keyBetween('a0', 'a1', seeded(2));
  assert.notEqual(laptop, phone);
  assert.equal(generateKeyBetween('a0', 'a1'), generateKeyBetween('a0', 'a1'), 'without the suffix both devices would collide');
  let same = 0;
  for (let n = 0; n < 1000; n++) if (keyBetween('a0', 'a1') === keyBetween('a0', 'a1')) same++;
  assert.ok(same < 10, `${same} collisions in 1,000 pairs`);
  step(`two devices dropping into the same gap get distinct keys (${same} collisions in 1,000 random pairs; ties fall back to id)`);
}

// Comparators.
const t = (id, fields = {}) => ({ id, type: 'task', title: id, due: '2026-11-04', time: null, order: null, ...fields });
const n = (id, fields = {}) => ({ id, type: 'note', title: id, order: null, edited: new Date(0), ...fields });
const ids = (list) => list.map((i) => i.id).join(' ');
{
  const list = [
    t('undated-keyed', { due: null, order: 'a0' }), t('late', { time: '18:30' }), t('k2', { order: 'a2' }),
    t('k1', { order: 'a1', time: '07:00' }), t('allday'), t('early', { time: '09:00' }), t('yesterday', { due: '2026-11-03', order: 'a5' }),
    t('undated', { due: null }), t('tie-b', { order: 'a3' }), t('tie-a', { order: 'a3' }),
  ];
  assert.equal(ids(list.sort(compareTasks)), 'yesterday allday early late k1 k2 tie-a tie-b undated undated-keyed');
  assert.ok('a0' < 'Zz' === false && compareTasks(t('x', { order: 'Zz' }), t('y', { order: 'a0' })) < 0, 'plain string order, not locale order');
  const notes = [n('old', { edited: new Date(1) }), n('k2', { order: 'a2' }), n('new', { edited: new Date(5) }), n('k1', { order: 'a1', edited: new Date(9) })];
  assert.equal(ids(notes.sort(compareNotes)), 'k1 k2 new old');
  step('tasks: date, then keyless by time and title, then keys (ties by id); notes: keys first, then most recently edited');

  // An old repo (no keys anywhere) sorts exactly as before this change.
  const byDueBefore = (a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || (a.time ?? '').localeCompare(b.time ?? '') || a.title.localeCompare(b.title);
  const r = seeded(5);
  for (let trial = 0; trial < 500; trial++) {
    const old = Array.from({ length: 12 }, (_, i) => t(`o${i}`, { due: [null, '2026-11-03', '2026-11-04'][Math.floor(r() * 3)], time: [null, '09:00', '18:30'][Math.floor(r() * 3)], title: `Task ${i}` }));
    assert.equal(ids([...old].sort(compareTasks)), ids([...old].sort(byDueBefore)));
  }
  step('an old repo without keys sorts its tasks exactly as before');
}

// planMove: apply the writes, sort, and check the result is the order asked for.
function check(group, id, to, kind, cmp, expect) {
  const writes = planMove(group, id, to, { ...kind, random: seeded(group.length * 31 + to) });
  const after = group.map((item) => ({ ...item, ...(writes.find((w) => w.id === item.id) ?? {}) }));
  const rest = group.filter((i) => i.id !== id);
  const want = [...rest.slice(0, to), group.find((i) => i.id === id), ...rest.slice(to)];
  assert.equal(ids([...after].sort(cmp)), ids(want), `move ${id} to ${to} in ${ids(group)}`);
  for (const w of writes) assert.ok(isValidKey(w.order));
  if (expect) assert.equal(writes.map((w) => w.id).sort().join(' '), expect.split(' ').sort().join(' '), `writes for ${id} → ${to}`);
  return writes;
}
{
  const keyedTasks = [t('A', { order: 'a0' }), t('B', { order: 'a1' }), t('C', { order: 'a2' })];
  check(keyedTasks, 'C', 1, TASKS, compareTasks, 'C');
  check(keyedTasks, 'A', 2, TASKS, compareTasks, 'A');
  check(keyedTasks, 'B', 0, TASKS, compareTasks, 'B');
  assert.deepEqual(planMove(keyedTasks, 'B', 1), []);
  step('planMove: keyed list, one write for the moved item only; dropping in place writes nothing');

  const old = [t('A'), t('B', { time: '09:00' }), t('C', { time: '18:30' })];
  check(old, 'A', 2, TASKS, compareTasks, 'A');
  check(old, 'C', 0, TASKS, compareTasks, 'A B'); // C stays keyless on top; A and B get keys after it
  check(old, 'A', 1, TASKS, compareTasks, 'A C');
  const mixed = [t('L1'), t('L2'), t('K1', { order: 'a1' }), t('K2', { order: 'a2' })];
  check(mixed, 'K2', 1, TASKS, compareTasks, 'K2 L2');
  check(mixed, 'L1', 3, TASKS, compareTasks, 'L1');
  check(mixed, 'K1', 3, TASKS, compareTasks, 'K1');
  check(mixed, 'L2', 2, TASKS, compareTasks, 'L2');
  step('planMove: old keyless tasks get keys only where the move passes them (time no longer wins)');

  const dup = [t('A', { order: 'a1' }), t('B', { order: 'a1' }), t('C', { order: 'a2' })];
  check(dup, 'C', 1, TASKS, compareTasks);
  const screen = [n('N2', { edited: new Date(9) }), n('N3', { edited: new Date(5) }), n('N1', { order: 'a0', edited: new Date(1) })];
  check(screen, 'N3', 0, NOTES, compareNotes, 'N3 N2');
  const manual = [n('K1', { order: 'a0' }), n('K2', { order: 'a1' }), n('L1', { edited: new Date(9) }), n('L2', { edited: new Date(5) })];
  check(manual, 'L2', 0, NOTES, compareNotes, 'L2');
  check(manual, 'K1', 3, NOTES, compareNotes, 'K1 L1 L2');
  check(manual, 'L1', 3, NOTES, compareNotes, 'L2'); // L1 must stay keyless to sit last, so L2 gets a key
  check(manual, 'K2', 0, NOTES, compareNotes, 'K2');
  step('planMove: equal keys, notes from the on-screen date order, and Manual notes with keyless ones last');

  // Property test: any group, any move, the sorted result is the order asked for.
  const r = seeded(99);
  let writes = 0, trials = 0;
  for (const [kind, cmp, make] of [[TASKS, compareTasks, t], [NOTES, compareNotes, n]]) {
    for (let trial = 0; trial < 3000; trial++) {
      const size = 1 + Math.floor(r() * 8);
      const pool = generateNKeysBetween(null, null, 4);
      const items = Array.from({ length: size }, (_, i) => make(`i${i}`, {
        order: r() < 0.5 ? null : pool[Math.floor(r() * pool.length)],
        time: r() < 0.5 ? null : ['08:00', '12:00', '18:30'][Math.floor(r() * 3)],
        title: 'abc'[Math.floor(r() * 3)],
        edited: new Date(Math.floor(r() * 4)),
      })).sort(cmp);
      const moved = items[Math.floor(r() * size)].id;
      writes += check(items, moved, Math.floor(r() * size), kind, cmp).length;
      trials++;
    }
  }
  step(`planMove: ${trials} random moves over keyed, keyless and duplicate keys all sort as asked (${(writes / trials).toFixed(2)} writes per move on average)`);
}

// File format.
{
  const old = '---\nid: a1\ntype: task\ntitle: Old task\nstatus: todo\ndue: 2026-10-29\nupdated: 2026-10-27T19:40:12.000Z\n---\nBody';
  const item = parse(old);
  assert.equal(item.order, null);
  assert.equal(item.extra, undefined);
  assert.equal(serialize(item, { touch: false }), old, 'an old file saves byte for byte');
  assert.doesNotMatch(serialize(item), /^order:/m);
  const note = '---\nid: n1\ntype: note\ntitle: Ideas\ntags: Home\nupdated: 2026-10-27T19:40:12.000Z\n---\n# Ideas\n';
  assert.equal(serialize(parse(note), { touch: false }), note);
  step('items: old files without order read and save unchanged');

  assert.equal(parse(old.replace('updated', 'order: a0 x\nupdated')).order, null);
  assert.equal(parse(old.replace('updated', 'order: a00\nupdated')).order, null);
  const keyedText = old.replace('updated', 'order: a0V\nupdated');
  assert.equal(parse(keyedText).order, 'a0V');
  assert.equal(serialize(parse(keyedText), { touch: false }), keyedText);
  step('items: a valid order round-trips; an invalid one is ignored');

  const future = '---\nid: a1\ntype: task\ntitle: Old task\nstatus: todo\npriority: high\ncolour: red: ish\nupdated: 2026-10-27T19:40:12.000Z\n---\nBody';
  const kept = parse(future);
  assert.deepEqual(kept.extra, { priority: 'high', colour: 'red: ish' });
  const written = serialize({ ...kept, title: 'Renamed', order: 'a1' });
  assert.match(written, /\npriority: high\ncolour: red: ish\n/);
  assert.match(written, /\norder: a1\n/);
  assert.deepEqual(parse(written).extra, kept.extra);
  step('items: unknown header keys are kept and written back');

  const moved = serialize({ ...item, order: 'a2' }, { touch: false });
  assert.match(moved, /\nupdated: 2026-10-27T19:40:12.000Z\n/);
  assert.doesNotMatch(serialize({ ...item, order: 'a2' }), /2026-10-27T19:40:12/);
  step('items: touch:false keeps updated; a normal save sets it to now');
}

console.log('\nOrder tests passed.');
