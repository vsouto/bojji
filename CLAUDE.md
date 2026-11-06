# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Bojji** is an open-source notes and task management app. It exists so people don't have to pay for tools like Evernote or Obsidian Sync. The core idea: each user's data lives in a private repo in **their own GitHub account** (default `bojji-data`, separate from this code repo), accessed through the GitHub REST API, so Bojji needs no storage servers. Product facts live in `PRODUCT.md`; the visual system is in `DESIGN.md`. Background research is in `references/`.

## Commands

Requires Node 22+ and the GitHub CLI (`gh auth login`). No dependencies, no build step.

```bash
npm start      # local app at http://localhost:5173, backed by <login>/bojji-data
npm run smoke  # end-to-end test against real GitHub on <login>/bojji-dryrun-data (two simulated devices, cleans up)
npm run test:order  # offline: fractional order keys, sorting, planMove, file format
npm run test:dates  # offline: calendar arithmetic for the Week schedule (run with TZ=... to try other zones)
BOJJI_REPO=bojji-dryrun-data npm start   # point the app at another data repo
```

The app opens on a welcome screen: **Sign in with GitHub**, **Try the demo** (`public/demo-data.js`, saves nothing), and on localhost only **Continue as <you>** with the `gh` login. Sign-in needs `authUrl` in `public/config.js` (or `BOJJI_AUTH_URL` locally); without it the hosted copy offers only the demo. `npm run test:worker` tests the sign-in Worker offline; `npm run test:calendar` tests the calendar link and task times.

## Architecture

- `src/items.js`: the file format. Each note or task is one Markdown file with a `key: value` header (`notes/<id>.md`, `tasks/<id>.md`). Tasks store `status: todo|done`, an optional `due: YYYY-MM-DD` and, only beside a date, an optional `time: HH:MM` (files without it are unchanged); tags are `tags: A, B` (so commas can't be in a tag); an optional `order: <key>` holds the manual position (ignored unless valid). Unknown header keys are kept in `item.extra` and written back. `serialize(item, { touch: false })` keeps the stored `updated` (used for moves). `parse`/`serialize` convert to the app's model (`done` boolean, `tags` array). One file per item is deliberate: edits to different items never conflict.
- `src/order.js`: manual order. Fractional-index keys (`generateKeyBetween`, ported from rocicorp/fractional-indexing, CC0) plus two random characters so two devices never pick the same key; compare with plain `<`, ties by `id`. `compareTasks` (date, then keyless by time and title, then by key) and `compareNotes` (keyed first, then keyless by date edited). `planMove(group, id, toIndex)` returns the fewest `{ id, order }` writes: normally only the moved file, plus keyless neighbours the first time an old list is arranged. A move never changes a due date.
- `src/github-store.js`: the only code that talks to GitHub. Lists with one recursive tree call plus a blob fetch per file; writes and deletes go through the Contents API. Plain `fetch`, so it runs in the browser and in Node.
- **Conflicts:** every save or delete of an existing item must pass the `sha` it was read with. GitHub rejects a stale sha; the store raises `ConflictError`, and the app reloads instead of overwriting.
- `public/index.html`: markup and all CSS (tokens on `:root`, light and dark). `public/app.js`: UI state and rendering, plus the save queue (one debounced job per item, so typing becomes one commit; a move queues `touch: false`, commit "Move task: …"). Rows with `data-group` (open tasks per due date, notes) can be reordered by pointer drag (4px for mouse, 400ms long press for touch), or Alt+ArrowUp/Down; `render()` is held while dragging. Notes sort by "Date edited" (default) or "Manual", stored per login in `bojji.noteSort.<login>`. Tag colours come from hashing the tag name into `.t0`–`.t7`.
- `src/dates.js`: local ISO dates (`addDays`, `mondayOf`, `weekDays`, `rangeLabel`). Arithmetic goes through the Date day field, never milliseconds, so daylight-saving days can't skip a date. In `app.js`, `todayStr` and `today` are refreshed at midnight (`refreshToday`, on the 30s tick and when the tab comes back, never mid-typing); the Week schedule shows `state.weekStart` (reset to this week from the sidebar) with edge rows for tasks before and after it, and a toast with "Show" when a date change takes a task off the list on screen.
- `src/calendar.js`: `googleCalendarUrl(task, { timeZone })` builds the one-way "Add to Google Calendar" link shown on dated tasks (all-day, or one hour in floating local time plus `ctz`; no Google API). `npm run test:calendar` tests it and the `time` field offline.
- `src/github-auth.js` + `worker/`: "Sign in with GitHub" through a **GitHub App** (Contents write and Metadata read only), so a user token reaches only the repos where the user installed the app. The stateless Cloudflare Worker in `worker/worker.js` holds the client secret and does the code exchange, refresh and revoke. The browser keeps the session in `localStorage`, with 8-hour tokens refreshed on demand and one refresh at a time. First run: no installation, or the repo isn't shared, leads to a setup screen with create-repo and install steps. The chosen repo name is stored per login (`bojji.repo.<login>`). Setup steps for the app and Worker are in `worker/README.md`.
- `server.mjs`: local-only server. It serves `public/` as the site root with `src/` mounted beside it, the same layout as the Pages build. `/api/session` hands the browser the `gh` CLI token for the dev-only "Continue as" path; that shortcut must never ship hosted. It also serves `worker/register-app.html` for one-click registration of the GitHub App from its manifest: GitHub returns to `/registered`, the server turns the code into credentials in `.bojji-app.json` (gitignored, never commit it) and opens the app. With that file present, the server runs `worker/worker.js` in-process at `/auth`, so real sign-in works locally without deploying the Worker.
- `.github/workflows/pages.yml` publishes `public/` + `src/` as the demo at https://vsouto.github.io/bojji/.

Not built yet: offline queueing beyond the current session, attachments, tag rename/merge, dragging a task to another day.
