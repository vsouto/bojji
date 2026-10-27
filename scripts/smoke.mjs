// End-to-end proof against real GitHub: two "devices" share one data repo.
// Uses the token from the GitHub CLI and cleans up the items it creates.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { ConflictError, createGitHubStore } from '../src/github-store.js';
import { newItem } from '../src/items.js';

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

  const task = await laptop.save(newItem('task', { title: 'Smoke: buy milk', due: '2026-11-01' }));
  const note = await laptop.save(newItem('note', { title: 'Smoke: ideas ☕', body: '# Ideas\n\nAcentuação: ção, ü, 日本語' }));
  created.push(task, note);
  step('laptop created a task and a note');

  const seen = await phone.list();
  const phoneTask = seen.find((i) => i.id === task.id);
  const phoneNote = seen.find((i) => i.id === note.id);
  assert.equal(phoneTask?.title, 'Smoke: buy milk');
  assert.equal(phoneTask.status, 'todo');
  assert.equal(phoneTask.due, '2026-11-01');
  assert.equal(phoneNote?.body, '# Ideas\n\nAcentuação: ção, ü, 日本語');
  step('phone listed both items with identical content (including non-ASCII)');

  const done = await phone.save({ ...phoneTask, status: 'done' }, phoneTask.sha);
  created[0] = done;
  step('phone marked the task done');

  await assert.rejects(laptop.save({ ...task, title: 'Smoke: buy oat milk' }, task.sha), ConflictError);
  step('laptop edit with a stale version was rejected as a conflict (no silent overwrite)');

  const fresh = (await laptop.list()).find((i) => i.id === task.id);
  assert.equal(fresh.status, 'done');
  const renamed = await laptop.save({ ...fresh, title: 'Smoke: buy oat milk' }, fresh.sha);
  created[0] = renamed;
  step('laptop reloaded, saw "done", and saved its edit on top');
} finally {
  for (const item of created) await laptop.remove(item, item.sha).catch((e) => console.error(`cleanup failed: ${e.message}`));
  step('cleaned up smoke items');
}

console.log('\nSmoke test passed.');
