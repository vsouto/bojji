# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Native iOS and Android apps are planned later; the web app comes first.

## Stack

Plain HTML, CSS and JavaScript with no framework and no build step, as in the current MVP.

## Users

Anyone who wants to keep personal notes and tasks and reach them from any device without paying a subscription, including non-technical people. They capture quick tasks and write notes throughout the day, on a laptop and on a phone.

## Product Purpose

Bojji is a free, open-source notes and tasks app. It exists because good notes and task tools (Evernote, Obsidian Sync, Todoist) charge for sync or cap their free plans. Success means someone can drop a paid notes or tasks app and not miss it.

## Positioning

Bojji runs no storage servers. Each user's notes and tasks live as plain Markdown files in a private repo in their own GitHub account, read and written directly through the GitHub API. The data is owned by the user, versioned, readable without Bojji, and costs nothing to host.

## Operating Context

- Quick capture: adding a task or jotting a note in a few seconds, often on a phone.
- Daily review: checking what's due and ticking tasks off.
- Writing: longer notes in Markdown.
- Sync is not real-time: saves take a second or two, and a device editing a stale copy gets a conflict and must reload rather than overwrite.

## Capabilities and Constraints

- Tasks: title, optional due date, done or not done.
- Notes: title and a Markdown body.
- Tags on both tasks and notes (stored as a `tags:` line in the file header, matched case-insensitively). Clicking a tag shows everything with it: open tasks, notes, then completed tasks. Renaming or merging a tag across many files is not designed yet.
- Each note and task is one Markdown file (`notes/<id>.md`, `tasks/<id>.md`) in the user's private GitHub repo (`bojji-data` by default, separate from the code repo).
- Conflicts are detected and resolved by reloading; nothing is silently overwritten.
- Not built yet: real "Sign in with GitHub" (the app uses the local `gh` login), offline mode, attachments.
- Undecided: whether storage backends other than GitHub (Google Drive, Dropbox) will be added for non-technical users.

## Brand Commitments

- Name: Bojji. MIT licensed, hosted at github.com/vsouto/bojji.
- The user asked for a very clean, lean, minimalist, Apple-like style.

## Evidence on Hand

- Market research: `references/free-notes-tasks-apps-research.html`.
- A working MVP and end-to-end smoke test (`npm run smoke`).
- No users, testimonials, logos or press yet; don't invent any.

## Product Principles

- Free for real: no feature should depend on paid infrastructure run by Bojji.
- Your data, your account: plain files the user can read and take elsewhere.
- Never lose an edit: sync conflicts are shown, never hidden or overwritten.
- Calm and fast to capture: the shortest path from thought to saved item wins.
- Hide the plumbing: non-technical users shouldn't need to understand git or repos.
