# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Bojji** is an open-source notes and task management app. It exists so people don't have to pay for tools like Evernote or Obsidian Sync. The core idea: each user's data lives in a private repo in **their own GitHub account**, accessed through the GitHub REST API, so Bojji needs no storage servers and works the same on any device with a browser.

Current state: a local dry-run MVP that validates this idea. Background research is in `references/`.

## Commands

Requires Node 22+ and the GitHub CLI (`gh auth login`). No dependencies, no build step.

```bash
npm start      # local app at http://localhost:5173
npm run smoke  # end-to-end test against real GitHub (two simulated devices, cleans up after itself)
```

Both use the data repo `<your-login>/bojji-dryrun-data` (private, created on first run). Override with `BOJJI_REPO=<name>`.

## Architecture

- `src/items.js`: the data format. Each note or task is one Markdown file with a `key: value` frontmatter header (`notes/<id>.md`, `tasks/<id>.md`). One file per item is deliberate: edits to different items never conflict.
- `src/github-store.js`: the only code that talks to GitHub. Lists items with one recursive tree call plus a blob fetch per file; writes and deletes go through the Contents API. Plain `fetch`, so it runs unchanged in the browser and in Node.
- **Conflicts:** every save or delete of an existing item must pass the file `sha` it was read with. GitHub rejects a stale sha, and the store turns that into `ConflictError`. Callers reload instead of overwriting.
- `public/`: a vanilla-JS UI that imports `src/` directly in the browser and talks to `api.github.com` itself.
- `server.mjs`: local-only static server. `/api/session` stands in for the future "Sign in with GitHub" step by handing the browser the `gh` CLI token. This is a dry-run shortcut and must not ship. Real auth is planned as a GitHub App limited to the user's data repo.

Not built yet: real OAuth/GitHub App sign-in, offline cache and queued writes, attachments, search, deployment.
