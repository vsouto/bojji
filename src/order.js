// Manual order for notes and tasks. Each item may carry an `order:` key, a
// string that sorts with plain < and >, so an item can always be placed
// between two others by writing only its own file.
//
// generateKeyBetween and generateNKeysBetween are ported from
// rocicorp/fractional-indexing (https://github.com/rocicorp/fractional-indexing),
// released under CC0 1.0 by its authors, after David Greenspan's
// "Implementing Fractional Indexing". Keys are base62: an integer part whose
// first character encodes its length (a-z positive, A-Z negative), then an
// optional fraction that never ends in "0".

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ZERO = DIGITS[0];
const SMALLEST_INTEGER = 'A' + ZERO.repeat(26);

function midpoint(a, b) {
  if (b !== null && a >= b) throw new Error(`${a} >= ${b}`);
  if (a.slice(-1) === ZERO || (b && b.slice(-1) === ZERO)) throw new Error('trailing zero');
  if (b) {
    let n = 0;
    while ((a[n] || ZERO) === b[n]) n++;
    if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
  }
  const digitA = a ? DIGITS.indexOf(a[0]) : 0;
  const digitB = b !== null ? DIGITS.indexOf(b[0]) : DIGITS.length;
  if (digitB - digitA > 1) return DIGITS[Math.round(0.5 * (digitA + digitB))];
  if (b && b.length > 1) return b.slice(0, 1);
  return DIGITS[digitA] + midpoint(a.slice(1), null);
}

function integerLength(head) {
  if (head >= 'a' && head <= 'z') return head.charCodeAt(0) - 97 + 2;
  if (head >= 'A' && head <= 'Z') return 90 - head.charCodeAt(0) + 2;
  throw new Error(`invalid order key head: ${head}`);
}

function validateInteger(int) {
  if (int.length !== integerLength(int[0])) throw new Error(`invalid integer part of order key: ${int}`);
}

function integerPart(key) {
  const length = integerLength(key[0]);
  if (length > key.length) throw new Error(`invalid order key: ${key}`);
  return key.slice(0, length);
}

function validateKey(key) {
  if (typeof key !== 'string' || !/^[0-9A-Za-z]+$/.test(key)) throw new Error(`invalid order key: ${key}`);
  if (key === SMALLEST_INTEGER) throw new Error(`invalid order key: ${key}`);
  const int = integerPart(key);
  if (key.slice(int.length).slice(-1) === ZERO) throw new Error(`invalid order key: ${key}`);
}

function incrementInteger(x) {
  validateInteger(x);
  const [head, ...digs] = x.split('');
  let carry = true;
  for (let i = digs.length - 1; carry && i >= 0; i--) {
    const d = DIGITS.indexOf(digs[i]) + 1;
    if (d === DIGITS.length) digs[i] = ZERO;
    else { digs[i] = DIGITS[d]; carry = false; }
  }
  if (!carry) return head + digs.join('');
  if (head === 'Z') return 'a' + ZERO;
  if (head === 'z') return null;
  const h = String.fromCharCode(head.charCodeAt(0) + 1);
  if (h > 'a') digs.push(ZERO); else digs.pop();
  return h + digs.join('');
}

function decrementInteger(x) {
  validateInteger(x);
  const [head, ...digs] = x.split('');
  let borrow = true;
  for (let i = digs.length - 1; borrow && i >= 0; i--) {
    const d = DIGITS.indexOf(digs[i]) - 1;
    if (d === -1) digs[i] = DIGITS.slice(-1);
    else { digs[i] = DIGITS[d]; borrow = false; }
  }
  if (!borrow) return head + digs.join('');
  if (head === 'a') return 'Z' + DIGITS.slice(-1);
  if (head === 'A') return null;
  const h = String.fromCharCode(head.charCodeAt(0) - 1);
  if (h < 'Z') digs.push(DIGITS.slice(-1)); else digs.pop();
  return h + digs.join('');
}

export function isValidKey(key) {
  try { validateKey(key); return true; } catch { return false; }
}

// A key strictly between a and b; null means "no bound" on that side.
export function generateKeyBetween(a, b) {
  if (a !== null) validateKey(a);
  if (b !== null) validateKey(b);
  if (a !== null && b !== null && a >= b) throw new Error(`${a} >= ${b}`);
  if (a === null) {
    if (b === null) return 'a' + ZERO;
    const ib = integerPart(b);
    const fb = b.slice(ib.length);
    if (ib === SMALLEST_INTEGER) return ib + midpoint('', fb);
    if (ib < b) return ib;
    const res = decrementInteger(ib);
    if (res === null) throw new Error('cannot decrement any more');
    return res;
  }
  if (b === null) {
    const ia = integerPart(a);
    const fa = a.slice(ia.length);
    const i = incrementInteger(ia);
    return i === null ? ia + midpoint(fa, null) : i;
  }
  const ia = integerPart(a);
  const fa = a.slice(ia.length);
  const ib = integerPart(b);
  const fb = b.slice(ib.length);
  if (ia === ib) return ia + midpoint(fa, fb);
  const i = incrementInteger(ia);
  if (i === null) throw new Error('cannot increment any more');
  if (i < b) return i;
  return ia + midpoint(fa, null);
}

// n keys in order, strictly between a and b, spread out rather than bunched.
export function generateNKeysBetween(a, b, n) {
  if (n === 0) return [];
  if (n === 1) return [generateKeyBetween(a, b)];
  if (b === null) {
    let c = generateKeyBetween(a, b);
    const result = [c];
    for (let i = 0; i < n - 1; i++) result.push((c = generateKeyBetween(c, b)));
    return result;
  }
  if (a === null) {
    let c = generateKeyBetween(a, b);
    const result = [c];
    for (let i = 0; i < n - 1; i++) result.push((c = generateKeyBetween(a, c)));
    return result.reverse();
  }
  const mid = Math.floor(n / 2);
  const c = generateKeyBetween(a, b);
  return [...generateNKeysBetween(a, c, mid), c, ...generateNKeysBetween(c, b, n - mid - 1)];
}

// Bojji's additions below.

// Two devices dropping into the same gap would compute the same key, so each
// key gets two random characters. `key` must already be above any lower bound
// and below `b`: appending keeps it above, and walking until `key` is no
// longer a prefix of `b` keeps it below.
function jitter(key, b, random) {
  while (b !== null && b.startsWith(key)) key = generateKeyBetween(key, b);
  const pick = (from) => from[Math.floor(random() * from.length) % from.length];
  return key + pick(DIGITS) + pick(DIGITS.slice(1)); // a fraction never ends in "0"
}

// With no lower bound, place keys below b's integer part rather than inside
// its fraction: otherwise each key put at the top would crowd the one before
// (a jittered "Zz5k" would get "Zz2…", then "Zz1…", growing every time).
function ceiling(a, b) {
  if (a !== null || b === null) return b;
  const int = integerPart(b);
  return int === SMALLEST_INTEGER ? b : int;
}

export function keyBetween(a, b, random = Math.random) {
  a ??= null; b ??= null;
  return jitter(generateKeyBetween(a, ceiling(a, b)), b, random);
}

export function keysBetween(a, b, n, random = Math.random) {
  a ??= null; b ??= null;
  const keys = generateNKeysBetween(a, ceiling(a, b), n);
  return keys.map((key, i) => jitter(key, keys[i + 1] ?? b, random));
}

// Keys compare as plain strings (never localeCompare: base62 order is ASCII order).
const byKey = (a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const keyed = (item) => Boolean(item.order);

// Tasks without a key keep the old order inside their day: all-day first, then by time, then title.
export const byTime = (a, b) => (a.time ?? '').localeCompare(b.time ?? '') || a.title.localeCompare(b.title) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
// Notes without a key: most recently edited first.
export const byEdited = (a, b) => (b.edited ?? 0) - (a.edited ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// Due date (undated last), then within a day: keyless tasks by time, then keyed tasks by key.
export function compareTasks(a, b) {
  const due = (a.due ?? '9999').localeCompare(b.due ?? '9999');
  if (due) return due;
  if (keyed(a) !== keyed(b)) return keyed(a) ? 1 : -1;
  return keyed(a) ? byKey(a, b) : byTime(a, b);
}

// Manual notes: keyed notes by key, then keyless notes by most recently edited.
export function compareNotes(a, b) {
  if (keyed(a) !== keyed(b)) return keyed(a) ? -1 : 1;
  return keyed(a) ? byKey(a, b) : byEdited(a, b);
}

export const TASKS = { keyless: 'first', fallback: byTime };
export const NOTES = { keyless: 'last', fallback: byEdited };

// Move `id` to `toIndex` (its index once placed) inside `group`, the visible
// rows in display order. Returns the fewest `{ id, order }` writes after which
// sorting gives the new order: usually one, for the moved item. Keyless items
// always sort before (tasks) or after (notes) keyed ones, so a move among them
// also gives keys to the keyless neighbours it has to pass; a key already in
// order is kept, preferring to rewrite the moved item over any other.
export function planMove(group, id, toIndex, { keyless = 'first', fallback = byTime, random = Math.random } = {}) {
  const from = group.findIndex((item) => item.id === id);
  if (from < 0) throw new Error(`${id} is not in the group`);
  const rest = group.filter((item) => item.id !== id);
  const to = Math.max(0, Math.min(toIndex, rest.length));
  if (to === from) return [];
  const want = [...rest.slice(0, to), group[from], ...rest.slice(to)];

  // Notes are the mirror image of tasks: keyless last instead of first.
  const flip = keyless === 'last';
  const list = flip ? [...want].reverse() : want;
  const before = (x, y) => (flip ? x.order > y.order : x.order < y.order);
  const inOrder = (x, y) => (flip ? fallback(y, x) : fallback(x, y)) < 0;
  const weight = (item) => (item.id === id ? 1 : 2);

  // A run of keyless items at the start of `list` can stay keyless if they are already in fallback order.
  let prefix = 0;
  while (prefix < list.length && !keyed(list[prefix]) && (prefix === 0 || inOrder(list[prefix - 1], list[prefix]))) prefix++;

  // best[i]: the heaviest chain of keyed items starting at i whose keys already increase.
  const n = list.length;
  const best = new Array(n).fill(0), next = new Array(n).fill(-1);
  for (let i = n - 1; i >= 0; i--) {
    if (!keyed(list[i])) continue;
    best[i] = weight(list[i]);
    for (let j = i + 1; j < n; j++) {
      if (keyed(list[j]) && before(list[i], list[j]) && weight(list[i]) + best[j] > best[i]) { best[i] = weight(list[i]) + best[j]; next[i] = j; }
    }
  }
  // Choose how much keyless prefix to keep (p) and where the kept chain starts.
  const tail = new Array(n + 1).fill(-1); // index of the best chain start at or after i
  for (let i = n - 1; i >= 0; i--) tail[i] = tail[i + 1] >= 0 && best[tail[i + 1]] >= best[i] ? tail[i + 1] : best[i] ? i : tail[i + 1];
  let choice = { score: -1 };
  let prefixWeight = 0;
  for (let p = 0; p <= prefix; p++) {
    if (p) prefixWeight += weight(list[p - 1]);
    const start = tail[p];
    const score = prefixWeight + (start >= 0 ? best[start] : 0);
    if (score > choice.score) choice = { score, p, start };
  }
  const keep = new Set();
  for (let i = choice.start; i >= 0; i = next[i]) keep.add(i);

  // Every other item after the kept prefix gets a new key between its kept neighbours.
  const writes = [];
  let i = choice.p;
  while (i < n) {
    if (keep.has(i)) { i++; continue; }
    let j = i;
    while (j < n && !keep.has(j)) j++;
    const low = i > choice.p && keep.has(i - 1) ? list[i - 1].order : null;
    const high = j < n ? list[j].order : null;
    const run = list.slice(i, j);
    const keys = flip ? keysBetween(high, low, run.length, random).reverse() : keysBetween(low, high, run.length, random);
    run.forEach((item, k) => writes.push({ id: item.id, order: keys[k] }));
    i = j;
  }
  return writes;
}
