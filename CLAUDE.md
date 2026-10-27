# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Bojji** is an open-source notes and task management app. It exists so people don't have to pay for tools like Evernote or Obsidian Sync. The core idea: each user's data lives in a private repo in **their own GitHub account** (default `bojji-data`, separate from this code repo), accessed through the GitHub REST API, so Bojji needs no storage servers. Product facts live in `PRODUCT.md`; the visual system is in `DESIGN.md`. Background research is in `references/`.

## Commands

Requires Node 22+ and the GitHub CLI (`gh auth login`). No dependencies, no build step.

```bash
npm start      # local app at http://localhost:5173, backed by <login>/bojji-data
npm run smoke  # end-to-end test against real GitHub on <login>/bojji-dryrun-data (two simulated devices, cleans up)
BOJJI_REPO=bojji-dryrun-data npm start   # point the app at another data repo
```

Opening the app from anywhere other than localhost (e.g. the GitHub Pages build) runs it as a demo on `public/demo-data.js`, saving nothing.

## Architecture

- `src/items.js`: the file format. Each note or task is one Markdown file with a `key: value` header (`notes/<id>.md`, `tasks/<id>.md`). Tasks store `status: todo|done`, tags are `tags: A, B` (so commas can't be in a tag). `parse`/`serialize` convert to the app's model (`done` boolean, `tags` array). One file per item is deliberate: edits to different items never conflict.
- `src/github-store.js`: the only code that talks to GitHub. Lists with one recursive tree call plus a blob fetch per file; writes and deletes go through the Contents API. Plain `fetch`, so it runs in the browser and in Node.
- **Conflicts:** every save or delete of an existing item must pass the `sha` it was read with. GitHub rejects a stale sha; the store raises `ConflictError`, and the app reloads instead of overwriting.
- `public/index.html`: markup and all CSS (tokens on `:root`, light and dark). `public/app.js`: UI state and rendering, plus the save queue (one debounced job per item, so typing becomes one commit). Tag colours come from hashing the tag name into `.t0`–`.t7`.
- `server.mjs`: local-only server. It serves `public/` as the site root with `src/` mounted beside it, the same layout as the Pages build. `/api/session` stands in for the future "Sign in with GitHub" by handing the browser the `gh` CLI token; that shortcut must not ship to a hosted version. Real auth is planned as a GitHub App limited to the user's data repo.
- `.github/workflows/pages.yml` publishes `public/` + `src/` as the demo at https://vsouto.github.io/bojji/.

Not built yet: real sign-in, offline queueing beyond the current session, attachments, tag rename/merge.
