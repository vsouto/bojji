import { ConflictError, createGitHubStore } from './src/github-store.js';
import { AuthError, createAuth } from './src/github-auth.js';
import { newItem } from './src/items.js';
import { googleCalendarUrl } from './src/calendar.js';
import { NOTES, TASKS, byEdited, compareNotes, compareTasks, keyBetween, planMove } from './src/order.js';
import { demoItems } from './demo-data.js';
import config from './config.js';

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
  user: null, // { name, login, repo } once signed in; null means demo mode
  account: false, // the account actions under the sync footer are open
  repoEdit: false,
  noteSort: 'edited', // or 'manual'; remembered per login
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
const notes = () => state.items.filter((i) => i.type === 'note').sort(state.noteSort === 'manual' ? compareNotes : byEdited);
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

// Rows that can be dragged share a group: one per due date for open tasks, one for notes.
// Manual order only applies inside a group, so a move never changes a date.
const groupOf = (item) => (item.type === 'note' ? 'notes' : `due:${item.due ?? 'none'}`);
const SHORTCUTS = 'aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"';

function visible() {
  if (state.view === 'notes') return notes().filter(matches);
  return tasks().filter(list().filter).filter(matches).sort(compareTasks);
}

// Notes sort by date edited (the default) or by the user's own order.
const SORTS = [['edited', 'Date edited'], ['manual', 'Manual']];
const sortControl = () => `<div class="sort" role="group" aria-label="Sort notes">${SORTS.map(([value, label]) =>
  `<button data-sort="${value}" aria-pressed="${state.noteSort === value}">${label}</button>`).join('')}</div>`;

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
  if (drag) { pendingRender = true; return; }
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
  const who = state.user ? `<button class="name" id="account-toggle" aria-expanded="${state.account}">${esc(name)}</button>` : `<span class="name">${esc(name)}</span>`;
  sync.innerHTML = `<svg class="i"><use href="#${copy[0]}"/></svg><span class="text">
    <span class="who">${who}${copy[2] ? `<time>${copy[2]}</time>` : ''}</span>
    <span class="where">${copy[1]}</span></span>`;
  renderAccount();
}

// Discreet account actions: in demo mode a way in; when signed in, behind the name.
function renderAccount() {
  const el = $('#account');
  if (!state.user) {
    el.innerHTML = auth?.enabled ? '<div class="account"><button id="sign-in">Sign in with GitHub</button></div>' : '';
    return;
  }
  if (!state.account) return (el.innerHTML = '');
  el.innerHTML = state.repoEdit
    ? `<form class="repo-form" id="repo-form"><input name="repo" value="${esc(state.user.repo)}" aria-label="Repository name" autocomplete="off" required pattern="[A-Za-z0-9._\\-]+"><button class="btn btn-secondary">Use</button></form>`
    : `<div class="account"><button id="change-repo">Change repository</button><button id="sign-out">Sign out</button></div>`;
  if (state.repoEdit) el.querySelector('input').focus();
}

function renderList() {
  if (drag) { pendingRender = true; return; }
  const items = visible();
  $('#list-title').textContent = list().label;
  const range = $('#list-range');
  range.hidden = state.view !== 'week';
  if (state.view === 'week') {
    const fmt = (d) => new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    range.textContent = `${fmt(weekDays[0])} – ${fmt(weekDays[6])}`;
  }
  $('#list-total').textContent = state.view === 'notes' ? '' : items.length;
  $('#list-sort').hidden = state.view !== 'notes';
  $('#list-sort').innerHTML = state.view === 'notes' ? sortControl() : '';
  const what = state.view === 'notes' || list().tag ? 'New note' : 'New task';
  $('#compose').setAttribute('aria-label', what);
  $('#compose').title = `${what} (N)`;
  const rows = $('#rows');

  const noteRow = (n) => {
    const chips = tagChips(n);
    return `<div class="note-row" role="button" tabindex="0" data-id="${n.id}" data-group="notes" ${SHORTCUTS} aria-current="${state.selected === n.id}">
      <div class="title">${esc(n.title || 'New note')}</div>
      <div class="meta"><time>${when(n.edited)}</time><span>${esc(n.body.replace(/[#*_>-]/g, ' ').trim().split('\n')[0] || 'No additional text')}</span></div>
      ${chips ? `<div class="row-meta">${chips}</div>` : ''}
      <span class="grip" aria-hidden="true"><svg class="i"><use href="#i-grip"/></svg></span>
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
    const [date, due] = (showDue && dueLabel(t.due)) || [];
    const label = [date, t.due && t.time].filter(Boolean).join(', '); // the Week view shows only the time
    const tone = t.done ? '' : due;
    const chips = tagChips(t);
    return `<div class="task-row ${t.done ? 'done' : ''}" data-id="${t.id}"${t.done ? '' : ` data-group="${groupOf(t)}"`} aria-current="${state.selected === t.id}">
      <button class="check" role="checkbox" aria-checked="${t.done}" aria-label="${esc(t.title)}" data-check="${t.id}"><svg viewBox="0 0 24 24"><use href="#i-check"/></svg></button>
      <div class="body"><button class="title" data-id="${t.id}"${t.done ? '' : ` ${SHORTCUTS}`}>${esc(t.title)}</button>${label || chips ? `<div class="row-meta">${label ? `<span class="due ${tone}">${label}</span>` : ''}${chips}</div>` : ''}</div>${t.done ? '' : `
      <span class="grip" aria-hidden="true"><svg class="i"><use href="#i-grip"/></svg></span>`}
    </div>`;
  };
  const { tag } = list();
  if (tag) {
    const tagged = state.items.filter((i) => hasTag(i, tag) && matches(i));
    const open = tagged.filter((i) => i.type === 'task' && !i.done).sort(compareTasks);
    const tagNotes = tagged.filter((i) => i.type === 'note').sort(state.noteSort === 'manual' ? compareNotes : byEdited);
    const done = tagged.filter((i) => i.type === 'task' && i.done);
    $('#list-total').textContent = open.length;
    rows.innerHTML = open.map((t) => taskRow(t)).join('') + add
      + (tagNotes.length ? `<div class="section-bar"><h3 class="section-head">Notes</h3>${sortControl()}</div>${tagNotes.map(noteRow).join('')}` : '')
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
      ${item.type === 'task' ? `<div class="field-row"><span class="label">Due</span><div class="field-value">${chip('f-due', item.due, 'Add date')}${item.due ? timeChip(item.time) + '<button class="clear" id="clear-due">Remove</button>' + calendarLink(item) : ''}</div></div>` : ''}
      ${item.type === 'task' && item.done ? '<div class="field-row"><span class="label">Status</span><span>Completed</span></div>' : ''}
      <div class="rendered" id="f-rendered" tabindex="0" role="textbox" aria-label="Body, select to edit">${item.body ? markdown(item.body) : `<p class="placeholder">${item.type === 'note' ? 'Start writing…' : 'Notes'}</p>`}</div>
      <textarea class="body-field" id="f-body" hidden placeholder="${item.type === 'note' ? 'Start writing…' : 'Notes'}" aria-label="Body">${esc(item.body)}</textarea>
    </div></div>`;
}

function render() {
  if (drag) { pendingRender = true; return; } // a drag holds the list still; it renders once dropped
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

function timeChip(value) {
  const clear = value ? '<button class="chip-clear" id="clear-time" aria-label="Remove time"><svg class="i"><use href="#i-close"/></svg></button>' : '';
  return `<span class="date-chip time-chip ${value ? 'set' : ''}"><svg class="i"><use href="#i-clock"/></svg><span>${esc(value || 'Add time')}</span><input type="time" id="f-time" value="${esc(value ?? '')}" aria-label="Time">${clear}</span>`;
}

// Shown only once a task has a date: one-way, it opens a pre-filled event on Google.
const calendarUrl = (task) => googleCalendarUrl(task, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
function calendarLink(task) {
  const url = calendarUrl(task);
  return url ? `<a class="cal-link" id="to-calendar" href="${esc(url)}" target="_blank" rel="noopener" title="Opens a new event in Google Calendar, filled in from this task">Add to Google Calendar<svg class="i"><use href="#i-external"/></svg></a>` : '';
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
  item.updated = new Date().toISOString(); // so a later move (which keeps `updated`) writes this edit's time
  if (item.type === 'note') item.edited = new Date();
  queue(item, 'save');
}

function removed(item) {
  queue(item, 'remove');
}

// `touch: false` is a move: the file keeps its `updated`. A move and an edit
// waiting together become one commit that does update it.
function queue(item, op, { touch = true } = {}) {
  const job = jobs.get(item.id) ?? { item, touch: false };
  Object.assign(job, { item, op });
  job.touch ||= touch;
  jobs.set(item.id, job);
  clearTimeout(job.timer);
  setSync('saving');
  job.timer = setTimeout(() => run(job), op === 'remove' ? 0 : 700);
}

async function run(job) {
  if (job.running) { job.again = true; return; }
  if (store && !navigator.onLine) return setSync('offline');
  job.running = true;
  const { touch } = job;
  job.touch = false;
  try {
    if (!store) await new Promise((done) => setTimeout(done, 400));
    else if (job.op === 'remove') { if (job.item.sha) await store.remove(job.item, job.item.sha); }
    else job.item.sha = (await store.save(job.item, job.item.sha, { touch })).sha;
  } catch (error) {
    job.running = false;
    job.touch ||= touch;
    if (lostSession(error)) return;
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

// New tasks go to the bottom of their day, new notes to the top.
const keysOf = (items) => items.map((i) => i.order).filter(Boolean);
const endOfDay = (task) => keyBetween(keysOf(tasks().filter((t) => t.id !== task.id && (t.due ?? null) === (task.due ?? null))).reduce((max, k) => (max === null || k > max ? k : max), null), null);
const topOfNotes = (note) => keyBetween(null, keysOf(state.items.filter((i) => i.type === 'note' && i.id !== note.id)).reduce((min, k) => (min === null || k < min ? k : min), null));

function create(type) {
  const item = newItem(type, type === 'note' ? { edited: new Date() } : { due: state.view === 'today' ? iso(0) : null });
  const { tag } = list();
  if (tag) item.tags = [tag];
  item.order = type === 'note' ? topOfNotes(item) : endOfDay(item);
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
  const sort = e.target.closest('[data-sort]');
  if (sort) { setNoteSort(sort.dataset.sort); return render(); }

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

  if (e.target.closest('#clear-time')) { const item = byId(state.selected); item.time = null; render(); return changed(item); }
  const chipEl = e.target.closest('.date-chip');
  if (chipEl) { e.preventDefault(); const input = chipEl.querySelector('input'); try { input.showPicker(); } catch { input.focus(); } return; }
  if (e.target.closest('#clear-due')) { const item = byId(state.selected); item.due = null; item.time = null; item.order = endOfDay(item); render(); return changed(item); }
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
  task.order = endOfDay(task);
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
  if (!item || !['f-title', 'f-body', 'f-due', 'f-time'].includes(e.target.id)) return;
  if (e.target.id === 'f-body') { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }
  if (e.target.id === 'f-title') item.title = e.target.value;
  if (e.target.id === 'f-body') item.body = e.target.value;
  const cal = $('#to-calendar'); // title and body edits don't re-render the pane, so keep the link current
  if (cal) cal.href = calendarUrl(item);
  if (e.target.id === 'f-due') {
    const due = e.target.value || null;
    if (due !== item.due) item.order = endOfDay({ ...item, due }); // a new day: its end, in the same save
    item.due = due;
    if (!item.due) item.time = null;
    render(); return changed(item);
  }
  if (e.target.id === 'f-time') { item.time = e.target.value || null; render(); return changed(item); }
  changed(item);
  renderSidebar(); renderList();
});

document.addEventListener('keydown', (e) => {
  if (app.hidden) return;
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

// Manual order. A move shows at once and rewrites only the moved file (plus,
// the first time an old list is arranged, any keyless neighbours it passes).
// The file keeps its `updated`, so a moved note doesn't look edited.
const KIND = { note: NOTES, task: TASKS };
const rowsEl = () => $('#rows');
const groupRows = (group) => [...rowsEl().querySelectorAll(`[data-group="${CSS.escape(group)}"]`)].filter((el) => byId(el.dataset.id) && isOpen(byId(el.dataset.id)));
const groupItems = (group) => groupRows(group).map((el) => byId(el.dataset.id));

function groupLabel(group) {
  if (group === 'notes') return state.view === 'notes' ? 'All notes' : 'Notes';
  const due = group.slice('due:'.length);
  if (due === 'none') return 'No date';
  if (state.view === 'week' && due !== iso(0)) return new Date(due + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long' });
  return dueLabel(due)[0];
}

function announce(text) {
  const el = $('#announce');
  el.textContent = '';
  setTimeout(() => { el.textContent = text; }, 50); // a fresh change, so a repeated message is read again
}

function moveItem(id, toIndex, group) {
  const item = byId(id);
  const items = groupItems(group);
  const from = items.findIndex((i) => i.id === id);
  if (!item || from < 0 || toIndex === from) return;
  // A drag in "Date edited" keeps the order on screen and switches to Manual.
  if (item.type === 'note' && state.noteSort !== 'manual') setNoteSort('manual');
  for (const { id: changedId, order } of planMove(items, id, toIndex, KIND[item.type])) {
    const moved = byId(changedId);
    moved.order = order;
    queue(moved, 'save', { touch: false });
  }
  render();
  const now = groupItems(group);
  announce(`Moved “${item.title || (item.type === 'note' ? 'New note' : 'Task')}” to position ${now.findIndex((i) => i.id === id) + 1} of ${now.length} in ${groupLabel(group)}`);
}

function focusRow(id) {
  const rows = rowsEl();
  (rows.querySelector(`.note-row[data-id="${CSS.escape(id)}"]`) ?? rows.querySelector(`.task-row[data-id="${CSS.escape(id)}"] .title`))?.focus();
}

// Keyboard: Alt+ArrowUp/Down moves the focused row within its group.
document.addEventListener('keydown', (e) => {
  if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
  const row = e.target.closest?.('#rows [data-group]');
  if (!row || e.target.matches('input, textarea')) return;
  e.preventDefault();
  const { id, group } = row.dataset;
  const items = groupItems(group);
  const from = items.findIndex((i) => i.id === id);
  const to = from + (e.key === 'ArrowUp' ? -1 : 1);
  if (to < 0 || to >= items.length) return announce(`Already at the ${to < 0 ? 'top' : 'bottom'} of ${groupLabel(group)}`);
  moveItem(id, to, group);
  focusRow(id);
});

// Pointer dragging, without HTML5 drag and drop: a mouse or pen lifts a row
// after 4px of movement, a finger after a 400ms press (moving first scrolls).
const NO_DRAG = '.check, .tag, a, input, textarea, select, label';
const phone = matchMedia('(max-width: 760px)');
let press = null; // a pointer is down on a row, not yet dragging
let drag = null; // the lifted row
let pendingRender = false; // render() was asked for during a drag
let swallowClick = false; // the click that follows a drop must not open the item
let dropLine = null;

function cancelPress() {
  if (press) clearTimeout(press.timer);
  press = null;
}

document.addEventListener('pointerdown', (e) => {
  swallowClick = false; // a new press is a new click (the drop's own click may never come)
  if (drag || press || e.button !== 0 || !e.isPrimary) return;
  const row = e.target.closest('#rows [data-group]');
  if (!row || e.target.closest(NO_DRAG)) return;
  press = { row, pointerId: e.pointerId, x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' };
  // The grip lifts at once on touch (it has touch-action: none, so the page won't scroll);
  // anywhere else on the row a long press does.
  if (press.touch) { if (e.target.closest('.grip')) startDrag(); else press.timer = setTimeout(startDrag, 400); }
});

document.addEventListener('pointermove', (e) => {
  if (drag) {
    if (e.pointerId !== drag.pointerId) return;
    drag.y = e.clientY;
    return follow();
  }
  if (!press || e.pointerId !== press.pointerId) return;
  const distance = Math.hypot(e.clientX - press.x, e.clientY - press.y);
  if (press.touch) { if (distance > 8) cancelPress(); } // a swipe: let the page scroll
  else if (distance > 4) startDrag();
});

document.addEventListener('pointerup', (e) => {
  if (drag && e.pointerId === drag.pointerId) return endDrag(true);
  if (press && e.pointerId === press.pointerId) cancelPress();
  if (swallowClick === 'held') releaseSwallow();
});
document.addEventListener('pointercancel', (e) => {
  if (drag && e.pointerId === drag.pointerId) endDrag(false);
  cancelPress();
});
// One listener, never passive: it stops the page from scrolling only while a row is lifted.
document.addEventListener('touchmove', (e) => { if (drag) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', (e) => { if (press || drag) e.preventDefault(); });
document.addEventListener('keydown', (e) => { if (drag && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endDrag(false, true); } }, true);
document.addEventListener('click', (e) => {
  if (!swallowClick) return;
  e.preventDefault(); e.stopPropagation();
  swallowClick = false;
}, true);
addEventListener('blur', () => { if (drag) endDrag(false); cancelPress(); });

function releaseSwallow() {
  swallowClick = true;
  setTimeout(() => { swallowClick = false; }, 300);
}

function startDrag() {
  const p = press;
  cancelPress();
  const { row } = p;
  if (!row.isConnected) return;
  const { id, group } = row.dataset;
  const others = groupRows(group).filter((el) => el !== row);
  const from = groupRows(group).indexOf(row);
  if (from < 0) return;
  drag = { id, group, row, others, from, to: from, pointerId: p.pointerId, y: p.y };
  try { row.setPointerCapture(p.pointerId); } catch {}
  row.classList.add('lifted');
  rowsEl().classList.add('dragging');
  dropLine = document.createElement('div');
  dropLine.className = 'drop-line';
  dropLine.hidden = true;
  rowsEl().append(dropLine);
  drag.frame = requestAnimationFrame(autoScroll);
  follow();
}

// The lifted row stays in its slot and the 2px line follows the pointer to
// where it will land. (A row that followed the pointer would always cover the
// line, or the line would run through its title like a strikethrough.)
function follow() {
  const { row, others } = drag;
  let to = 0;
  for (const el of others) { const r = el.getBoundingClientRect(); if (drag.y > r.top + r.height / 2) to++; }
  drag.to = to;
  if (to === drag.from || !others.length) { dropLine.hidden = true; return; }
  const rows = rowsEl().getBoundingClientRect();
  const anchor = (others[to] ?? others[to - 1]).getBoundingClientRect();
  const edge = to < others.length ? anchor.top : anchor.bottom;
  const text = row.querySelector('.title').getBoundingClientRect().left; // indented to the text column
  dropLine.style.top = `${edge - rows.top + rowsEl().scrollTop - 1}px`;
  dropLine.style.left = `${text - rows.left}px`;
  dropLine.style.width = `${anchor.right - 12 - text}px`;
  dropLine.hidden = false;
}

// Near the top or bottom edge (40px), scroll: the list pane on desktop, the page on a phone.
function autoScroll() {
  if (!drag) return;
  const EDGE = 40;
  const [top, bottom] = phone.matches ? [0, innerHeight] : ((r) => [r.top, r.bottom])(rowsEl().getBoundingClientRect());
  const over = drag.y < top + EDGE ? drag.y - (top + EDGE) : drag.y > bottom - EDGE ? drag.y - (bottom - EDGE) : 0;
  if (over) {
    const step = Math.sign(over) * Math.min(16, Math.ceil(Math.abs(over) / 4));
    if (phone.matches) scrollBy(0, step); else rowsEl().scrollTop += step;
    follow();
  }
  drag.frame = requestAnimationFrame(autoScroll);
}

// `held`: Esc cancelled while the pointer is still down, so its click comes later.
function endDrag(commit, held = false) {
  const d = drag;
  drag = null;
  cancelAnimationFrame(d.frame);
  dropLine?.remove();
  dropLine = null;
  rowsEl().classList.remove('dragging');
  if (held) swallowClick = 'held'; else releaseSwallow();
  const top = d.row.getBoundingClientRect().top;
  d.row.classList.remove('lifted');
  const waiting = pendingRender;
  pendingRender = false;
  if (commit && d.to !== d.from) { moveItem(d.id, d.to, d.group); settle(d.id, top); }
  else if (waiting) render();
}

// The dropped row glides from its old slot to the new one (removed under reduced motion).
function settle(id, fromTop) {
  const row = rowsEl().querySelector(`[data-group][data-id="${CSS.escape(id)}"]`);
  if (!row) return;
  const dy = fromTop - row.getBoundingClientRect().top;
  if (!dy) return;
  row.style.transform = `translateY(${dy}px)`;
  row.getBoundingClientRect();
  row.classList.add('settling');
  row.style.transform = '';
  row.addEventListener('transitionend', () => row.classList.remove('settling'), { once: true });
  setTimeout(() => row.classList.remove('settling'), 300);
}

// Sign-in, welcome and setup. The app root stays hidden until we know where
// the user's data is: a GitHub repo they signed in to, the local gh login
// (development only), or the demo's sample data.
const welcome = $('#welcome');
const APP_URL = location.origin + location.pathname; // must match a callback URL registered on the GitHub App
const prefs = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};
const repoFor = (login) => prefs.get(`bojji.repo.${login}`) || 'bojji-data';
const sortPref = () => `bojji.noteSort.${state.user?.login ?? 'demo'}`;
function loadNoteSort() { state.noteSort = prefs.get(sortPref()) === 'manual' ? 'manual' : 'edited'; }
function setNoteSort(value) {
  state.noteSort = value === 'manual' ? 'manual' : 'edited';
  prefs.set(sortPref(), state.noteSort === 'manual' ? 'manual' : null);
}
let auth = null;
let dev = null; // session from the local server (your gh CLI token), if any
let settingUp = false; // the setup screen is showing; re-check when the tab comes back
let setup = null; // what the setup screen was last shown with

function showWelcome(html) { welcome.innerHTML = `<div class="welcome-card">${html}</div>`; welcome.hidden = false; app.hidden = true; }
// The mascot: a small, kind king holding his notes (an original drawing, not a copy of any character).
const MASCOT = `<svg class="mascot" viewBox="0 0 120 120" aria-hidden="true">
  <ellipse class="m-shadow" cx="60" cy="111" rx="24" ry="3.5"/>
  <g class="m-bob">
    <ellipse class="m-line m-body" cx="49" cy="106" rx="7" ry="4"/><ellipse class="m-line m-body" cx="71" cy="106" rx="7" ry="4"/>
    <path class="m-line m-body" d="M60 40c21 0 33 15 33 35 0 19-13 30-33 30S27 94 27 75c0-20 12-35 33-35z"/>
    <g class="m-crown"><path class="m-line m-gold" d="M45 43 47 23l8 9 5-13 5 13 8-9 2 20z"/><circle class="m-ink" cx="60" cy="36" r="2.2"/></g>
    <g class="m-eyes"><ellipse class="m-ink" cx="50" cy="69" rx="2.6" ry="3.6"/><ellipse class="m-ink" cx="68" cy="69" rx="2.6" ry="3.6"/></g>
    <circle class="m-blush" cx="43" cy="78" r="4.5"/><circle class="m-blush" cx="75" cy="78" r="4.5"/>
    <path class="m-line" d="M55 79q4 4 8 0" fill="none"/>
    <g class="m-note"><rect class="m-line m-paper" x="72" y="76" width="22" height="26" rx="3.5"/><path class="m-tick" d="m77 86 3 3 6-6"/><path class="m-line" d="M77 95h12" fill="none"/></g>
    <circle class="m-line m-body" cx="74" cy="92" r="4"/>
  </g>
</svg>`;
const head = (title, lede = '', small = false) => `<div class="mascot-wrap${small ? ' small' : ''}">${MASCOT}</div><h1>${title}</h1>${lede ? `<p class="lede">${lede}</p>` : ''}`;
const ext = '<svg class="i"><use href="#i-external"/></svg>';

function renderWelcome(error) {
  settingUp = false;
  const signIn = auth.enabled;
  showWelcome(head('Your notes, kept in your GitHub.', 'Private, plain Markdown. Free, always.')
    + (signIn ? '<button class="btn btn-primary" id="sign-in"><svg class="i"><use href="#i-github"/></svg>Sign in with GitHub</button><button class="alt" id="demo">Try the demo</button>'
      : '<button class="btn btn-primary" id="demo">Try the demo</button><p class="note">Sign-in isn’t set up on this copy of Bojji yet.</p>')
    + (dev ? `<button class="alt quiet" id="dev-in">Continue as ${esc(dev.name || dev.owner)} · local</button>` : '')
    + (error ? `<p class="note error">${esc(error)}</p>` : ''));
  welcome.insertAdjacentHTML('beforeend', '<button class="about-btn" id="about-open" aria-label="How Bojji keeps your data"><svg class="i"><use href="#i-info"/></svg></button>');
}

// Shown once per account: the app can't see a data repo yet.
function renderSetup({ login, repo, installed, repoExists, error }) {
  settingUp = true;
  setup = { login, repo, installed, repoExists };
  const newRepo = `https://github.com/new?name=${encodeURIComponent(repo)}&description=${encodeURIComponent('Bojji notes and tasks')}&visibility=private`;
  const create = `<a class="btn btn-secondary" href="${newRepo}" target="_blank" rel="noopener">Create on GitHub ${ext}</a>`;
  const step = (n, title, text, action, done) => `<li class="step ${done ? 'done' : ''}"><span class="num">${done ? '<svg class="i"><use href="#i-check"/></svg>' : n}</span><div><h2>${title}</h2>${text ? `<p>${text}</p>` : ''}${done ? '' : action}</div></li>`;
  const steps = installed
    ? step(1, `Create a private repository called ${esc(repo)}`, repoExists ? '' : 'It holds your notes and tasks as plain Markdown files, in your account.', create, repoExists)
      + step(2, `Give Bojji access to ${esc(repo)}`, 'In the Bojji app settings on GitHub, add it under “Repository access”. Bojji never sees anything else.', `<a class="btn btn-secondary" href="https://github.com/settings/installations/${installed.id}" target="_blank" rel="noopener">Open GitHub settings ${ext}</a>`)
    : step(1, `Create a private repository called ${esc(repo)}`, 'It holds your notes and tasks as plain Markdown files, in your account.', create)
      + step(2, 'Let Bojji use it', `On GitHub, choose “Only select repositories” and pick ${esc(repo)}. Bojji never sees anything else.`, '<button class="btn btn-secondary" id="install">Continue on GitHub</button>');
  showWelcome(head('Give Bojji a home in your GitHub', 'Two quick steps on GitHub, just this once.', true)
    + `<ol class="steps">${steps}</ol>`
    + (installed ? '<button class="btn btn-primary" id="recheck">I’ve done this</button>' : '')
    + (error ? `<p class="note error">${esc(error)}</p>` : '')
    + `<p class="who-line">Signed in as <b>${esc(login)}</b> · Repository <code>${esc(repo)}</code> <button id="change-repo">Change</button> · <button id="sign-out">Sign out</button></p>`
    + (state.repoEdit ? `<form class="repo-form" id="repo-form"><input name="repo" value="${esc(repo)}" aria-label="Repository name" autocomplete="off" required pattern="[A-Za-z0-9._\\-]+"><button class="btn btn-secondary">Use</button></form>` : ''));
  if (state.repoEdit) welcome.querySelector('input').focus();
}

// A 401 or a dead refresh token means the sign-in is gone: back to the start.
function lostSession(error) {
  if (!(error instanceof AuthError) && error?.status !== 401) return false;
  leave().then(() => renderWelcome(error.message));
  return true;
}

async function leave() {
  jobs.forEach((job) => clearTimeout(job.timer));
  jobs.clear();
  store = null;
  Object.assign(state, { user: null, items: [], selected: null, account: false, repoEdit: false, view: 'today' });
  prefs.set('bojji.dev', null);
  try { sessionStorage.removeItem('bojji.demo'); } catch {}
  await auth.signOut();
}

// Everything is in place: show the app and load the items.
async function enter(user, newStore, prepare) {
  settingUp = false;
  state.user = user;
  store = newStore;
  loadNoteSort();
  state.sync = { state: 'loading' };
  welcome.hidden = true; app.hidden = false;
  render();
  try {
    if (prepare) await prepare();
    await reload();
    state.sync = { state: 'kept', at: null };
  } catch (error) {
    if (lostSession(error)) return;
    state.sync = { state: 'error', detail: error.message };
  }
  render();
}

function enterDemo() {
  try { sessionStorage.setItem('bojji.demo', '1'); } catch {}
  state.user = null;
  loadNoteSort();
  state.items = demoItems({ iso, ago });
  state.selected = 't2';
  state.sync = { state: 'kept', at: null };
  welcome.hidden = true; app.hidden = false;
  render();
}

function enterDev() {
  prefs.set('bojji.dev', '1');
  const s = createGitHubStore(dev);
  enter({ name: dev.name || dev.owner, login: dev.owner, repo: dev.repo }, s, () => s.ensureRepo());
}

// Signed in with GitHub: find the account, the installation and the data repo.
async function start() {
  showWelcome(head('Signing you in…', '', true));
  try {
    const token = () => auth.token();
    const me = await createGitHubStore({ token, owner: '', repo: '' }).user();
    const repo = repoFor(me.login);
    const s = createGitHubStore({ token, owner: me.login, repo });
    const installed = await s.installation((await auth.config()).app_slug);
    if (!installed) return renderSetup({ login: me.login, repo, installed: null });
    if (!(await s.hasRepo())) {
      // Bojji asks GitHub only for Contents and Metadata, so this normally
      // fails (403) and the setup screen guides the user to create the repo.
      // It succeeds only if a fork of Bojji grants repository creation; GitHub
      // then gives the app access to the repo it created. 422 means the repo
      // exists but wasn't shared with Bojji.
      try { await s.createRepo(); } catch (error) {
        if (lostSession(error)) return;
        return renderSetup({ login: me.login, repo, installed, repoExists: error.status === 422 });
      }
    }
    enter({ name: me.name, login: me.login, repo }, s);
  } catch (error) {
    if (!lostSession(error)) renderWelcome(error.message);
  }
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#sign-in')) return auth.signIn().catch((error) => renderWelcome(error.message));
  if (e.target.closest('#demo')) return enterDemo();
  if (e.target.closest('#about-open')) return $('#about').showModal();
  if (e.target.closest('#about-close') || e.target.id === 'about') return $('#about').close();
  if (e.target.closest('#dev-in')) return enterDev();
  if (e.target.closest('#install')) return auth.install().catch((error) => renderWelcome(error.message));
  if (e.target.closest('#recheck')) return start();
  if (e.target.closest('#sign-out')) return leave().then(() => renderWelcome());
  if (e.target.closest('#account-toggle')) { state.account = !state.account; state.repoEdit = false; return renderSync(); }
  if (e.target.closest('#change-repo')) {
    state.repoEdit = true;
    return settingUp ? renderSetup(setup) : renderAccount();
  }
});

document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'repo-form') return;
  e.preventDefault();
  const repo = e.target.repo.value.trim();
  if (!repo) return;
  state.repoEdit = false; state.account = false;
  const login = state.user?.login ?? setup?.login;
  prefs.set(`bojji.repo.${login}`, repo === 'bojji-data' ? null : repo);
  if (dev && store && !auth.session()) { dev = { ...dev, repo }; return enterDev(); }
  renderSetup({ ...setup, repo });
  start();
});

// Coming back from GitHub during setup, re-check without a click.
document.addEventListener('visibilitychange', () => { if (settingUp && !document.hidden && !state.repoEdit) start(); });

async function boot() {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (local) try {
    const res = await fetch('api/session');
    if (res.ok) dev = await res.json();
  } catch {}
  auth = createAuth({ authUrl: config.authUrl || dev?.authUrl || '', redirectUri: APP_URL });
  let error = null;
  try { await auth.handleRedirect(); } catch (e) { error = e.message; }
  if (auth.session()) return start();
  if (dev && prefs.get('bojji.dev')) return enterDev();
  let demo = false;
  try { demo = sessionStorage.getItem('bojji.demo') === '1'; } catch {}
  if (demo && !error) return enterDemo();
  renderWelcome(error);
}
boot();
