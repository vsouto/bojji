import { ConflictError, createGitHubStore } from '/src/github-store.js';
import { newItem } from '/src/items.js';

const $ = (selector) => document.querySelector(selector);
let store;
let items = [];
let editing = null;

function setStatus(text, isError = false) {
  $('#status').textContent = text;
  $('#status').classList.toggle('error', isError);
}

// Every write goes straight to GitHub; on a conflict we reload instead of overwriting.
async function run(label, action) {
  setStatus(`${label}…`);
  try {
    await action();
    setStatus('Saved to GitHub');
  } catch (error) {
    if (error instanceof ConflictError) {
      await load();
      setStatus(error.message + ' Reloaded.', true);
    } else {
      setStatus(error.message, true);
    }
  }
  render();
}

async function load() {
  items = await store.list();
  editing &&= items.find((item) => item.id === editing.id) ?? null;
}

function replace(saved) {
  items = items.filter((item) => item.id !== saved.id).concat(saved);
}

function row(item, onOpen) {
  const li = document.createElement('li');
  const title = Object.assign(document.createElement('span'), { className: 'title', textContent: item.title || 'Untitled' });
  title.onclick = onOpen;
  const remove = Object.assign(document.createElement('button'), { className: 'quiet', textContent: 'Delete' });
  remove.onclick = () => run('Deleting', async () => {
    await store.remove(item, item.sha);
    items = items.filter((other) => other.id !== item.id);
    if (editing?.id === item.id) editing = null;
  });
  li.append(title, remove);
  return li;
}

function render() {
  const byTitle = (a, b) => a.title.localeCompare(b.title);
  const tasks = items.filter((item) => item.type === 'task').sort((a, b) => (a.status === 'done') - (b.status === 'done') || byTitle(a, b));
  const notes = items.filter((item) => item.type === 'note').sort(byTitle);

  $('#tasks').replaceChildren(...tasks.map((task) => {
    const li = row(task, () => toggle(task));
    li.classList.toggle('done', task.status === 'done');
    const check = Object.assign(document.createElement('input'), { type: 'checkbox', checked: task.status === 'done' });
    check.setAttribute('aria-label', `Mark ${task.title} done`);
    check.onchange = () => toggle(task);
    li.prepend(check);
    if (task.due) li.insertBefore(Object.assign(document.createElement('span'), { className: 'due', textContent: task.due }), li.lastChild);
    return li;
  }));
  if (!tasks.length) $('#tasks').innerHTML = '<li class="empty">No tasks yet.</li>';

  $('#notes').replaceChildren(...notes.map((note) => row(note, () => openNote(note))));
  if (!notes.length) $('#notes').innerHTML = '<li class="empty">No notes yet.</li>';

  $('#editor').hidden = !editing;
}

function toggle(task) {
  run('Saving', async () => replace(await store.save({ ...task, status: task.status === 'done' ? 'todo' : 'done' }, task.sha)));
}

function openNote(note) {
  editing = note;
  $('#note-title').value = note.title;
  $('#note-body').value = note.body;
  render();
}

$('#task-form').onsubmit = (event) => {
  event.preventDefault();
  const form = event.target;
  const task = newItem('task', { title: form.title.value.trim(), due: form.due.value || undefined });
  form.reset();
  run('Adding task', async () => replace(await store.save(task)));
};

$('#note-form').onsubmit = (event) => {
  event.preventDefault();
  const note = newItem('note', { title: event.target.title.value.trim() });
  event.target.reset();
  run('Adding note', async () => {
    const saved = await store.save(note);
    replace(saved);
    openNote(saved);
  });
};

$('#note-save').onclick = () => {
  const note = { ...editing, title: $('#note-title').value.trim(), body: $('#note-body').value };
  run('Saving note', async () => {
    editing = await store.save(note, editing.sha);
    replace(editing);
  });
};

$('#note-close').onclick = () => { editing = null; render(); };
$('#reload').onclick = () => run('Reloading', load);

const res = await fetch('/api/session');
if (!res.ok) {
  setStatus(await res.text(), true);
} else {
  const session = await res.json();
  store = createGitHubStore(session);
  await run('Loading', async () => {
    await store.ensureRepo();
    await load();
  });
  setStatus(`Synced with ${session.owner}/${session.repo} · ${items.length} items`);
}
