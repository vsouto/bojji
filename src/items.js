// Notes and tasks are stored as one Markdown file each, with a small
// frontmatter header. One file per item keeps edits on different items
// from ever conflicting with each other.

import { isValidKey } from './order.js';

const FOLDERS = { note: 'notes', task: 'tasks' };
// Header keys Bojji writes itself. Any other key is kept in `item.extra` and
// written back unchanged, so fields added later survive older copies of the app.
const KNOWN = new Set(['id', 'type', 'title', 'status', 'due', 'time', 'tags', 'order', 'updated']);

export function newItem(type, fields = {}) {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const item = { id, type, title: '', body: '', tags: [], ...fields };
  if (type === 'task') {
    item.done ??= false;
    item.due ??= null;
    item.time ??= null;
  }
  return item;
}

export function pathFor(item) {
  return `${FOLDERS[item.type]}/${item.id}.md`;
}

export function isItemPath(path) {
  return /^(notes|tasks)\/[^/]+\.md$/.test(path);
}

// Tags are written as `tags: Siemens, Home`, so commas can't appear inside a tag.
// `touch: false` keeps the stored `updated` (a move isn't an edit).
export function serialize(item, { touch = true } = {}) {
  const meta = { id: item.id, type: item.type, title: item.title };
  if (item.type === 'task') {
    meta.status = item.done ? 'done' : 'todo';
    if (item.due) meta.due = item.due;
    if (item.due && item.time) meta.time = item.time; // optional HH:MM, only beside a date
  }
  if (item.tags?.length) meta.tags = item.tags.join(', ');
  if (item.order) meta.order = item.order; // manual position, see order.js
  for (const [key, value] of Object.entries(item.extra ?? {})) if (!KNOWN.has(key)) meta[key] = value;
  const updated = touch ? new Date().toISOString() : item.updated;
  if (updated) meta.updated = updated;
  const header = Object.entries(meta)
    .map(([key, value]) => `${key}: ${String(value).replace(/\r?\n/g, ' ')}`)
    .join('\n');
  return `---\n${header}\n---\n${item.body ?? ''}`;
}

export function parse(text) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!match) throw new Error('Missing frontmatter');
  const meta = {};
  for (const line of match[1].split('\n')) {
    const at = line.indexOf(': ');
    if (at > 0) meta[line.slice(0, at)] = line.slice(at + 2);
  }
  const item = {
    id: meta.id,
    type: meta.type,
    title: meta.title ?? '',
    body: match[2],
    tags: (meta.tags ?? '').split(',').map((tag) => tag.trim()).filter(Boolean),
    updated: meta.updated,
    order: isValidKey(meta.order) ? meta.order : null,
  };
  const extra = Object.fromEntries(Object.entries(meta).filter(([key]) => !KNOWN.has(key)));
  if (Object.keys(extra).length) item.extra = extra;
  if (item.type === 'task') {
    item.done = meta.status === 'done';
    item.due = meta.due || null;
    item.time = meta.time || null;
  }
  return item;
}
