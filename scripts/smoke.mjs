// End-to-end proof against real GitHub: two "devices" share one data repo.
// Uses the token from the GitHub CLI and cleans up the items it creates.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { ConflictError, createGitHubStore } from '../src/github-store.js';
import { newItem } from '../src/items.js';
import { TASKS, compareTasks, keysBetween, planMove } from '../src/order.js';

const token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
const owner = execFileSync('gh', ['api', 'user', '--jq', '.login'], { encoding: 'utf8' }).trim();
const repo = process.env.BOJJI_REPO ?? 'bojji-dryrun-data';

const laptop = createGitHubStore({ token, owner, repo });
const phone = createGitHubStore({ token, owner, repo });

const step = (label) => console.log(`- ${label}`);
const created = [];

try {
  const { created: repoCreated } = await laptop.ensureRepo();
  step(`data repo ${owner}/${repo} ${repoCreated ? 'created (private)' : 'already exists'}`);

  const task = await laptop.save(newItem('task', { title: 'Smoke: buy milk', due: '2026-11-01', time: '09:30', tags: ['Siemens', 'Home'] }));
  const note = await laptop.save(newItem('note', { title: 'Smoke: ideas ☕', body: '# Ideas\n\nAcentuação: ção, ü, 日本語' }));
  created.push(task, note);
  step('laptop created a task and a note');

  const seen = await phone.list();
  const phoneTask = seen.find((i) => i.id === task.id);
  const phoneNote = seen.find((i) => i.id === note.id);
  assert.equal(phoneTask?.title, 'Smoke: buy milk');
  assert.equal(phoneTask.done, false);
  assert.deepEqual(phoneTask.tags, ['Siemens', 'Home']);
  assert.equal(phoneTask.due, '2026-11-01');
  assert.equal(phoneTask.time, '09:30');
  assert.equal(phoneNote?.body, '# Ideas\n\nAcentuação: ção, ü, 日本語');
  assert.deepEqual(phoneNote.tags, []);
  step('phone listed both items with identical content (including tags, due time and non-ASCII)');

  const done = await phone.save({ ...phoneTask, done: true }, phoneTask.sha);
  created[0] = done;
  step('phone marked the task done');

  await assert.rejects(laptop.save({ ...task, title: 'Smoke: buy oat milk' }, task.sha), ConflictError);
  step('laptop edit with a stale version was rejected as a conflict (no silent overwrite)');

  const fresh = (await laptop.list()).find((i) => i.id === task.id);
  assert.equal(fresh.done, true);
  const renamed = await laptop.save({ ...fresh, title: 'Smoke: buy oat milk' }, fresh.sha);
  created[0] = renamed;
  step('laptop reloaded, saw "done", and saved its edit on top');

  // Manual order: three tasks on one day, rearranged from both devices.
  const day = '2026-11-02';
  const keys = keysBetween(null, null, 3);
  for (const [i, name] of ['A', 'B', 'C'].entries()) {
    created.push(await laptop.save(newItem('task', { title: `Smoke: order ${name}`, due: day, order: keys[i] })));
  }
  const ours = (items) => items.filter((i) => i.title.startsWith('Smoke: order ')).sort(compareTasks);
  const names = (items) => items.map((i) => i.title.slice(-1)).join('');
  const [phoneView, laptopStale] = await Promise.all([phone.list(), laptop.list()]);
  const group = ours(phoneView);
  assert.equal(names(group), 'ABC');

  const writes = planMove(group, group[2].id, 0, TASKS);
  assert.deepEqual(writes.map((w) => w.id), [group[2].id]);
  const before = group[2];
  await phone.save({ ...before, order: writes[0].order }, before.sha, { touch: false });
  const afterMove = ours(await laptop.list());
  assert.equal(names(afterMove), 'CAB');
  const c = afterMove.find((i) => i.id === before.id);
  assert.notEqual(c.sha, before.sha);
  for (const other of group.slice(0, 2)) assert.equal(afterMove.find((i) => i.id === other.id).sha, other.sha, 'untouched items keep their sha');
  for (const other of phoneView.filter((i) => i.id !== before.id)) assert.equal((await laptop.list()).find((i) => i.id === other.id)?.sha, other.sha);
  assert.equal(c.updated, before.updated, 'a move keeps updated');
  const api = (path) => fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }).then((r) => r.json());
  const [commit] = await api(`/commits?path=${encodeURIComponent(c.path)}&per_page=1`);
  const detail = await api(`/commits/${commit.sha}`);
  assert.equal(detail.commit.message, 'Move task: Smoke: order C');
  assert.deepEqual(detail.files.map((f) => f.filename), [c.path]);
  step(`phone moved C to the top: one commit ("${detail.commit.message}") touching one file; every other sha and C's updated unchanged`);

  // The laptop still shows A B C. Moving A (a different item) from that stale list works.
  const stale = ours(laptopStale);
  const [moveA] = planMove(stale, stale[0].id, 2, TASKS);
  await laptop.save({ ...stale[0], order: moveA.order }, stale[0].sha, { touch: false });
  step('laptop moved A from its stale list: different items, both moves succeed');

  // Both devices move B from the same version: the second is a conflict.
  const [phoneNow, laptopNow] = (await Promise.all([phone.list(), laptop.list()])).map(ours);
  assert.equal(names(phoneNow), 'CBA');
  const phoneB = phoneNow.find((i) => i.title.endsWith('B'));
  const laptopB = laptopNow.find((i) => i.title.endsWith('B'));
  await phone.save({ ...phoneB, order: planMove(phoneNow, phoneB.id, 0, TASKS)[0].order }, phoneB.sha, { touch: false });
  await assert.rejects(laptop.save({ ...laptopB, order: planMove(laptopNow, laptopB.id, 2, TASKS)[0].order }, laptopB.sha, { touch: false }), ConflictError);
  assert.equal(names(ours(await laptop.list())), 'BCA');
  step('both devices moved B: the phone won, the laptop got a ConflictError (it would reload), order is B C A');
} finally {
  // Remove by the latest sha, since moves above changed some of them.
  const latest = await laptop.list().catch(() => []);
  for (const item of created) {
    const now = latest.find((i) => i.id === item.id) ?? item;
    await laptop.remove(now, now.sha).catch((e) => console.error(`cleanup failed: ${e.message}`));
  }
  assert.equal((await laptop.list()).filter((i) => created.some((c) => c.id === i.id)).length, 0, 'nothing left behind');
  step('cleaned up smoke items');
}

console.log('\nSmoke test passed.');
