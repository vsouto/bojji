import { ConflictError, createGitHubStore } from './src/github-store.js';
import { newItem } from './src/items.js';
import { demoItems } from './demo-data.js';

const DAY = 864e5;
const today = new Date(); today.setHours(0, 0, 0, 0);
const iso = (offset) => new Date(today.getTime() + offset * DAY).toLocaleDateString('en-CA');
const ago = (minutes) => new Date(Date.now() - minutes * 6e4);
// The week runs Monday to Sunday and includes the days that already passed.
const weekStart = -((today.getDay() + 6) % 7);
const weekDays = Array.from({ length: 7 }, (_, i) => iso(weekStart + i));

const state = {
  view: 'today',
  selected: null,
  draftDue: iso(0),
  showDone: false,
  query: '',
  sync: { state: 'loading' },
  user: null, // set when the local server hands over a GitHub session; null means demo mode
  items: [],
};

const LISTS = {
  today:     { label: 'Today',     icon: 'i-today',     filter: (t) => !t.done && t.due && t.due <= iso(0) },
  week:      { label: 'Week schedule', icon: 'i-week', filter: (t) => !t.done && t.due && t.due >= weekDays[0] && t.due <= weekDays[6] },
  all:       { label: 'All tasks', icon: 'i-all',       filter: (t) => !t.done },
  completed: { label: 'Completed', icon: 'i-done',      filter: (t) => t.done },
  notes:     { label: 'All notes', icon: 'i-note' },
};

const $ = (s) => document.querySelector(s);
const app = $('#app');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tasks = () => state.items.filter((i) => i.type === 'task');
const notes = () => state.items.filter((i) => i.type === 'note').sort((a, b) => b.edited - a.edited);
const byId = (id) => state.items.find((i) => i.id === id);
const matches = (i) => !state.query || [i.title, i.body, ...(i.tags ?? [])].join(' ').toLowerCase().includes(state.query.toLowerCase());

// Tags are matched case-insensitively and keep the spelling they were first given.
const TAG = 'tag:';
const same = (a, b) => a.toLowerCase() === b.toLowerCase();
const hasTag = (item, tag) => (item.tags ?? []).some((t) => same(t, tag));
const hue = (tag) => [...tag.toLowerCase()].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 8;
const isOpen = (item) => item.type === 'note' || !item.done;
function allTags() {
  const seen = new Map();
  for (const item of state.items) for (const t of item.tags ?? []) if (!seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t);
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
function list(view = state.view) {
  if (!view.startsWith(TAG)) return LISTS[view];
  const tag = view.slice(TAG.length);
  return { label: '#' + tag, icon: 'i-tag', tag, filter: (i) => hasTag(i, tag) && isOpen(i) };
}
const tagChips = (item) => (item.tags ?? []).filter((t) => !list().tag || !same(t, list().tag))
  .map((t) => `<button class="tag t${hue(t)}" data-tag="${esc(t)}">#${esc(t)}</button>`).join('');

function visible() {
  if (state.view === 'notes') return notes().filter(matches);
  return tasks().filter(list().filter).filter(matches)
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.title.localeCompare(b.title));
}

function dueLabel(due) {
  if (!due) return '';
  const diff = Math.round((new Date(due + 'T00:00') - today) / DAY);
  if (diff === 0) return ['Today', 'today'];
  if (diff === 1) return ['Tomorrow', ''];
  if (diff === -1) return ['Yesterday', 'overdue'];
  const text = new Date(due + 'T00:00').toLocaleDateString('en-GB', { weekday: diff > 0 && diff < 7 ? 'long' : undefined, day: 'numeric', month: 'short' });
  return [text, diff < 0 ? 'overdue' : ''];
}

function when(date) {
  const diff = (today - new Date(date).setHours(0, 0, 0, 0)) / DAY;
  if (diff < 1) return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (diff < 2) return 'Yesterday';
  if (diff < 7) return date.toLocaleDateString('en-GB', { weekday: 'long' });
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function navButton(key) {
  const entry = list(key);
  const count = key === 'notes' ? notes().length : entry.tag ? state.items.filter(entry.filter).length : tasks().filter(entry.filter).length;
  return `<button class="nav-item${entry.tag ? ` tagged t${hue(entry.tag)}` : ''}" data-view="${esc(key)}" aria-current="${state.view === key}">
    <svg class="i"><use href="#${entry.icon}"/></svg><span>${esc(entry.tag ?? entry.label)}</span><span class="count">${count}</span></button>`;
}

function renderSidebar() {
  $('#task-nav').innerHTML = ['today', 'week', 'all', 'completed'].map(navButton).join('');
  $('#note-nav').innerHTML = navButton('notes');
  const tags = allTags();
  $('#tag-group').hidden = !tags.length;
  $('#tag-nav').innerHTML = tags.map((t) => navButton(TAG + t)).join('');
  $('#tag-options').innerHTML = tags.map((t) => `<option value="${esc(t)}">`).join('');
}

function renderSync() {
  const s = state.sync;
  const link = (href, text, title) => `<a href="${href}" target="_blank" rel="noopener" title="${title}">${text}<svg class="i"><use href="#i-external"/></svg></a>`;
  const name = state.user ? state.user.name : 'Demo';
  const kept = state.user
    ? link(`https://github.com/${state.user.login}/${state.user.repo}`, 'Kept in your GitHub', 'Open your notes and tasks on GitHub. They live in a private repository only you can see.')
    : link('https://github.com/vsouto/bojji', 'Sample data · Get Bojji', 'This demo runs on sample data and saves nothing. Bojji is free and open source.');
  const copy = {
    loading: () => ['i-saving', 'Loading from your GitHub…', ''],
    saving: () => ['i-saving', 'Saving…', ''],
    kept: () => ['i-kept', kept, !s.at ? '' : Date.now() - s.at < 6e4 ? 'Just now' : when(s.at)],
    offline: () => ['i-offline', 'Offline, will save when you reconnect', ''],
    conflict: () => ['i-alert', 'Changed on another device, reloaded', ''],
    error: () => ['i-alert', `Couldn’t save. ${esc(s.detail ?? '')}`, ''],
  }[s.state]();
  const sync = $('#sync');
  sync.dataset.state = s.state;
  sync.title = s.detail ?? '';
  sync.innerHTML = `<svg class="i"><use href="#${copy[0]}"/></svg><span class="text">
    <span class="who"><span class="name">${esc(name)}</span>${copy[2] ? `<time>${copy[2]}</time>` : ''}</span>
    <span class="where">${copy[1]}</span></span>`;
}

function renderList() {
  const items = visible();
  $('#list-title').textContent = list().label;
  const range = $('#list-range');
  range.hidden = state.view !== 'week';
  if (state.view === 'week') {
    const fmt = (d) => new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    range.textContent = `${fmt(weekDays[0])} – ${fmt(weekDays[6])}`;
  }
  $('#list-total').textContent = state.view === 'notes' ? '' : items.length;
  const what = state.view === 'notes' || list().tag ? 'New note' : 'New task';
  $('#compose').setAttribute('aria-label', what);
  $('#compose').title = `${what} (N)`;
  const rows = $('#rows');

  const noteRow = (n) => {
    const chips = tagChips(n);
    return `<div class="note-row" role="button" tabindex="0" data-id="${n.id}" aria-current="${state.selected === n.id}">
      <div class="title">${esc(n.title || 'New note')}</div>
      <div class="meta"><time>${when(n.edited)}</time><span>${esc(n.body.replace(/[#*_>-]/g, ' ').trim().split('\n')[0] || 'No additional text')}</span></div>
      ${chips ? `<div class="row-meta">${chips}</div>` : ''}
    </div>`;
  };
  if (state.view === 'notes') {
    rows.innerHTML = items.length ? items.map(noteRow).join('') : `<p class="empty">${state.query ? 'No notes match.' : 'No notes yet.'}</p>`;
    return;
  }

  const add = state.view === 'completed' ? '' : `
    <form class="add-row" id="add-task">
      <span class="plus"><svg class="i"><use href="#i-plus"/></svg></span>
      <input name="title" placeholder="New task" aria-label="New task" autocomplete="off">
      ${chip('add-due', state.draftDue, 'Add date')}
    </form>`;
  const taskRow = (t, showDue = true) => {
    const [label, due] = (showDue && dueLabel(t.due)) || [];
    const tone = t.done ? '' : due;
    const chips = tagChips(t);
    return `<div class="task-row ${t.done ? 'done' : ''}" data-id="${t.id}" aria-current="${state.selected === t.id}">
      <button class="check" role="checkbox" aria-checked="${t.done}" aria-label="${esc(t.title)}" data-check="${t.id}"><svg viewBox="0 0 24 24"><use href="#i-check"/></svg></button>
      <div class="body"><button class="title" data-id="${t.id}">${esc(t.title)}</button>${label || chips ? `<div class="row-meta">${label ? `<span class="due ${tone}">${label}</span>` : ''}${chips}</div>` : ''}</div>
    </div>`;
  };
  const { tag } = list();
  if (tag) {
    const tagged = state.items.filter((i) => hasTag(i, tag) && matches(i));
    const open = tagged.filter((i) => i.type === 'task' && !i.done)
      .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.title.localeCompare(b.title));
    const tagNotes = tagged.filter((i) => i.type === 'note').sort((a, b) => b.edited - a.edited);
    const done = tagged.filter((i) => i.type === 'task' && i.done);
    $('#list-total').textContent = open.length;
    rows.innerHTML = open.map((t) => taskRow(t)).join('') + add
      + (tagNotes.length ? `<h3 class="section-head">Notes</h3>${tagNotes.map(noteRow).join('')}` : '')
      + (done.length ? `<button class="section-toggle" id="toggle-done" aria-expanded="${state.showDone}">${state.showDone ? 'Hide' : 'Show'} completed (${done.length})</button>${state.showDone ? done.map((t) => taskRow(t)).join('') : ''}` : '')
      + (tagged.length ? '' : `<p class="empty">${state.query ? 'Nothing matches.' : `Nothing tagged ${esc(tag)} yet.`}</p>`);
    return;
  }
  if (state.view === 'week') {
    rows.innerHTML = weekDays.map((day) => {
      const dayTasks = items.filter((t) => t.due === day);
      const date = new Date(day + 'T00:00');
      const phase = day < iso(0) ? 'past' : day === iso(0) ? 'today' : '';
      return `<section class="day ${phase}" aria-label="${date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}">
        <h3 class="day-head"><span>${day === iso(0) ? 'Today' : date.toLocaleDateString('en-GB', { weekday: 'long' })}</span><span class="date">${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></h3>
        ${dayTasks.length ? dayTasks.map((t) => taskRow(t, false)).join('') : '<p class="day-empty">No tasks</p>'}
      </section>`;
    }).join('') + add;
    return;
  }
  rows.innerHTML = items.map((t) => taskRow(t)).join('') + (items.length || add ? '' : '<p class="empty">Nothing completed yet.</p>') + add
    + (!items.length && add ? `<p class="empty">${state.query ? 'No tasks match.' : state.view === 'today' ? 'Nothing due today.' : 'No tasks here.'}</p>` : '');
}

function renderDetail() {
  const item = byId(state.selected);
  const detail = $('#detail');
  const toolbar = (extra = '') => `<div class="toolbar">
      <button class="icon-btn back" id="to-list"><svg class="i"><use href="#i-back"/></svg><span>${esc(list().label)}</span></button>
      <span class="spacer"></span>${extra}</div>`;
  if (!item) {
    detail.innerHTML = toolbar() + `<div class="detail-empty">${state.view === 'notes' ? 'No note selected' : list().tag ? 'Select a task or note' : 'Select a task to see its details'}</div>`;
    return;
  }
  const trash = `<button class="icon-btn" id="delete" aria-label="Delete ${item.type}"><svg class="i"><use href="#i-trash"/></svg></button>`;
  const stamp = item.type === 'note'
    ? item.edited.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' at ' + item.edited.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '';
  detail.innerHTML = toolbar(trash) + `<div class="paper"><div class="paper-inner">
      ${stamp ? `<div class="stamp">${stamp}</div>` : '<div class="stamp-gap"></div>'}
      <input class="title-field" id="f-title" value="${esc(item.title)}" placeholder="${item.type === 'note' ? 'Title' : 'Task'}" aria-label="Title">
      <div class="field-row"><span class="label">Tags</span><div class="tag-editor">${(item.tags ?? []).map((t) => `<span class="tag t${hue(t)}"><button data-tag="${esc(t)}">#${esc(t)}</button><button class="tag-remove" data-remove-tag="${esc(t)}" aria-label="Remove tag ${esc(t)}"><svg class="i"><use href="#i-close"/></svg></button></span>`).join('')}<input id="f-tag" list="tag-options" placeholder="${item.tags?.length ? 'Add' : 'Add a tag'}" aria-label="Add a tag" autocomplete="off" enterkeyhint="done"></div></div>
      ${item.type === 'task' ? `<div class="field-row"><span class="label">Due</span>${chip('f-due', item.due, 'Add date')}${item.due ? '<button class="clear" id="clear-due">Remove</button>' : ''}</div>` : ''}
      ${item.type === 'task' && item.done ? '<div class="field-row"><span class="label">Status</span><span>Completed</span></div>' : ''}
      <div class="rendered" id="f-rendered" tabindex="0" role="textbox" aria-label="Body, select to edit">${item.body ? markdown(item.body) : `<p class="placeholder">${item.type === 'note' ? 'Start writing…' : 'Notes'}</p>`}</div>
      <textarea class="body-field" id="f-body" hidden placeholder="${item.type === 'note' ? 'Start writing…' : 'Notes'}" aria-label="Body">${esc(item.body)}</textarea>
    </div></div>`;
}

function render() {
  renderSidebar(); renderList(); renderDetail(); renderSync();
}

// Light Markdown rendering for reading; the file itself stays plain Markdown.
function markdown(text) {
  const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>');
  let html = '', list = false;
  for (const line of text.split('\n')) {
    const item = /^\s*[-*]\s+(.*)/.exec(line);
    if (item) { html += (list ? '' : '<ul>') + `<li>${inline(item[1])}</li>`; list = true; continue; }
    if (list) { html += '</ul>'; list = false; }
    const head = /^(#{1,3})\s+(.*)/.exec(line);
    if (head) html += head[1].length === 3 ? `<h3>${inline(head[2])}</h3>` : `<h2>${inline(head[2])}</h2>`;
    else if (line.trim()) html += `<p>${inline(line)}</p>`;
  }
  return html + (list ? '</ul>' : '');
}

function chip(id, value, empty) {
  const label = value ? dueLabel(value)[0] : id === 'add-due' ? '' : empty;
  return `<label class="date-chip ${value ? 'set' : ''}"><svg class="i"><use href="#i-today"/></svg>${label ? `<span>${label}</span>` : ''}<input type="date" id="${id}" value="${value ?? ''}" aria-label="Due date"></label>`;
}

function editBody() {
  const rendered = $('#f-rendered'), area = $('#f-body');
  if (!rendered) return;
  rendered.hidden = true; area.hidden = false;
  area.style.height = 'auto'; area.style.height = area.scrollHeight + 'px';
  area.focus();
}

// Each edit is written to GitHub after a short pause, one job per item, so fast
// typing becomes one commit. A stale version is rejected by GitHub as a conflict;
// we then reload instead of overwriting. In demo mode jobs only pretend to save.
let store = null;
const jobs = new Map();

function setSync(next, detail) {
  state.sync = { state: next, at: new Date(), detail };
  renderSync();
}

function changed(item) {
  if (item.type === 'note') item.edited = new Date();
  queue(item, 'save');
}

function removed(item) {
  queue(item, 'remove');
}

function queue(item, op) {
  const job = jobs.get(item.id) ?? { item };
  Object.assign(job, { item, op });
  jobs.set(item.id, job);
  clearTimeout(job.timer);
  setSync('saving');
  job.timer = setTimeout(() => run(job), op === 'remove' ? 0 : 700);
}

async function run(job) {
  if (job.running) { job.again = true; return; }
  if (store && !navigator.onLine) return setSync('offline');
  job.running = true;
  try {
    if (!store) await new Promise((done) => setTimeout(done, 400));
    else if (job.op === 'remove') { if (job.item.sha) await store.remove(job.item, job.item.sha); }
    else job.item.sha = (await store.save(job.item, job.item.sha)).sha;
  } catch (error) {
    job.running = false;
    if (!(error instanceof ConflictError)) return setSync('error', error.message);
    jobs.delete(job.item.id);
    await reload();
    return setSync('conflict', error.message);
  }
  job.running = false;
  if (job.again) { job.again = false; return run(job); }
  jobs.delete(job.item.id);
  if (!jobs.size) setSync('kept');
}

const fromFile = (item) => ({ ...item, edited: new Date(item.updated ?? Date.now()) });

async function reload() {
  state.items = (await store.list()).map(fromFile);
  if (!byId(state.selected)) state.selected = null;
  render();
}

function select(id) {
  state.selected = id;
  app.dataset.view = 'detail';
  render();
}

function addTag(item, raw) {
  const name = raw.replace(/^#+/, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (!name) return;
  const tag = allTags().find((t) => same(t, name)) ?? name;
  if (!hasTag(item, tag)) item.tags = [...(item.tags ?? []), tag];
  renderSidebar(); renderList(); renderDetail(); changed(item);
  $('#f-tag')?.focus();
}

function removeTag(item, tag) {
  item.tags = (item.tags ?? []).filter((t) => !same(t, tag));
  renderSidebar(); renderList(); renderDetail(); changed(item);
  $('#f-tag')?.focus();
}

function setView(view) {
  state.view = view;
  state.showDone = false;
  state.draftDue = ['today', 'week'].includes(view) ? iso(0) : null;
  state.selected = view === 'notes' ? notes()[0]?.id ?? null : null;
  app.dataset.view = 'list';
  render();
}

function create(type) {
  const item = newItem(type, type === 'note' ? { edited: new Date() } : { due: state.view === 'today' ? iso(0) : null });
  const { tag } = list();
  if (tag) item.tags = [tag];
  state.items.push(item);
  if (type === 'note' && state.view !== 'notes' && !tag) state.view = 'notes';
  if (type === 'task' && !tag && !['today', 'week', 'all'].includes(state.view)) state.view = 'all';
  select(item.id);
  $('#f-title').focus();
  changed(item);
}

document.addEventListener('click', (e) => {
  const nav = e.target.closest('.nav-item');
  if (nav) return setView(nav.dataset.view);

  const check = e.target.closest('[data-check]');
  if (check) {
    const task = byId(check.dataset.check);
    task.done = !task.done;
    check.setAttribute('aria-checked', task.done);
    changed(task);
    const row = check.closest('.task-row');
    setTimeout(() => { row.classList.add('leaving'); setTimeout(render, 350); }, 450);
    return;
  }

  const removeEl = e.target.closest('[data-remove-tag]');
  if (removeEl) return removeTag(byId(state.selected), removeEl.dataset.removeTag);
  const tagEl = e.target.closest('[data-tag]');
  if (tagEl) return setView(TAG + tagEl.dataset.tag);
  if (e.target.closest('#toggle-done')) { state.showDone = !state.showDone; return renderList(); }

  const row = e.target.closest('.note-row, .task-row .title');
  if (row) return select(row.dataset.id);

  const chipEl = e.target.closest('.date-chip');
  if (chipEl) { e.preventDefault(); const input = chipEl.querySelector('input'); try { input.showPicker(); } catch { input.focus(); } return; }
  if (e.target.closest('#clear-due')) { const item = byId(state.selected); item.due = null; render(); return changed(item); }
  if (e.target.closest('#f-rendered')) return editBody();
  if (e.target.closest('#compose')) return create(state.view === 'notes' || list().tag ? 'note' : 'task');
  if (e.target.closest('#to-sidebar')) { app.dataset.view = 'sidebar'; return; }
  if (e.target.closest('#to-list')) { app.dataset.view = 'list'; state.selected = state.view === 'notes' ? state.selected : null; return render(); }
  if (e.target.closest('#delete')) {
    removed(byId(state.selected));
    state.items = state.items.filter((i) => i.id !== state.selected);
    state.selected = state.view === 'notes' ? notes()[0]?.id ?? null : null;
    app.dataset.view = 'list';
    render();
  }
});

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'add-task') return;
  e.preventDefault();
  const title = e.target.title.value.trim();
  if (!title) return;
  const { tag } = list();
  const task = newItem('task', { title, due: state.draftDue, tags: tag ? [tag] : [] });
  state.items.push(task);
  state.draftDue = ['today', 'week'].includes(state.view) ? iso(0) : null;
  render(); changed(task);
  $('#add-task input[name=title]').focus();
});

document.addEventListener('input', (e) => {
  const item = byId(state.selected);
  if (e.target.id === 'search') { state.query = e.target.value; return renderList(); }
  if (e.target.id === 'add-due') { state.draftDue = e.target.value || null; return renderList(); }
  if (e.target.id === 'f-tag') {
    // A pick from the suggestions arrives as one replacement, and a typed comma finishes a tag.
    if (e.inputType === 'insertReplacementText' || !e.inputType || e.target.value.includes(',')) addTag(item, e.target.value);
    return;
  }
  if (!item || !['f-title', 'f-body', 'f-due'].includes(e.target.id)) return;
  if (e.target.id === 'f-body') { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }
  if (e.target.id === 'f-title') item.title = e.target.value;
  if (e.target.id === 'f-body') item.body = e.target.value;
  if (e.target.id === 'f-due') { item.due = e.target.value || null; render(); return changed(item); }
  changed(item);
  renderSidebar(); renderList();
});

document.addEventListener('keydown', (e) => {
  const typing = e.target.matches('input, textarea');
  if (e.key === 'n' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); create(state.view === 'notes' ? 'note' : 'task'); }
  if (e.key === 'Escape' && typing) e.target.blur();
  if (e.target.id === 'f-tag') {
    const item = byId(state.selected);
    if (e.key === 'Enter') { e.preventDefault(); addTag(item, e.target.value); }
    if (e.key === 'Backspace' && !e.target.value && item.tags?.length) removeTag(item, item.tags.at(-1));
  }
  if (e.target.matches('.note-row') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(e.target.dataset.id); }
});

document.addEventListener('focusout', (e) => {
  if (e.target.id !== 'f-body') return;
  const item = byId(state.selected), rendered = $('#f-rendered');
  rendered.innerHTML = item.body ? markdown(item.body) : `<p class="placeholder">${item.type === 'note' ? 'Start writing…' : 'Notes'}</p>`;
  e.target.hidden = true; rendered.hidden = false;
});
document.addEventListener('keydown', (e) => { if (e.target.id === 'f-rendered' && e.key === 'Enter') { e.preventDefault(); editBody(); } });
addEventListener('online', () => { if (jobs.size) jobs.forEach(run); else renderSync(); });
addEventListener('offline', () => { if (jobs.size) setSync('offline'); });
// Coming back to the tab picks up changes made on other devices.
document.addEventListener('visibilitychange', () => {
  if (store && !document.hidden && !jobs.size && !document.activeElement?.matches('input, textarea')) reload().catch(() => {});
});
setInterval(renderSync, 3e4);

async function boot() {
  let session = null;
  // Only the local server can hand over a session; anywhere else this is the public demo.
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (local) try {
    const res = await fetch('api/session');
    if (res.ok) session = await res.json();
  } catch {}
  if (!session) {
    state.items = demoItems({ iso, ago });
    state.selected = 't2';
    state.sync = { state: 'kept', at: null };
    return render();
  }
  state.user = { name: session.name || session.owner, login: session.owner, repo: session.repo };
  render();
  store = createGitHubStore(session);
  try {
    await store.ensureRepo();
    await reload();
    state.sync = { state: 'kept', at: null };
  } catch (error) {
    state.sync = { state: 'error', detail: error.message };
  }
  render();
}
boot();
