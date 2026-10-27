// Notes and tasks are stored as one Markdown file each, with a small
// frontmatter header. One file per item keeps edits on different items
// from ever conflicting with each other.

const FOLDERS = { note: 'notes', task: 'tasks' };

export function newItem(type, fields = {}) {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const item = { id, type, title: '', body: '', ...fields };
  if (type === 'task') item.status ??= 'todo';
  return item;
}

export function pathFor(item) {
  return `${FOLDERS[item.type]}/${item.id}.md`;
}

export function isItemPath(path) {
  return /^(notes|tasks)\/[^/]+\.md$/.test(path);
}

export function serialize(item) {
  const meta = { id: item.id, type: item.type, title: item.title };
  if (item.type === 'task') {
    meta.status = item.status;
    if (item.due) meta.due = item.due;
  }
  meta.updated = new Date().toISOString();
  const header = Object.entries(meta)
    .map(([key, value]) => `${key}: ${String(value).replace(/\r?\n/g, ' ')}`)
    .join('\n');
  return `---\n${header}\n---\n${item.body ?? ''}`;
}

export function parse(text) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!match) throw new Error('Missing frontmatter');
  const item = { body: match[2] };
  for (const line of match[1].split('\n')) {
    const at = line.indexOf(': ');
    if (at > 0) item[line.slice(0, at)] = line.slice(at + 2);
  }
  return item;
}
