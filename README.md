# Bojji

Free, open-source notes and tasks that live in **your own GitHub account**.

No subscription and no Bojji servers holding your data. Each note and task is a plain Markdown file in a private repository you own, so you get full version history and can read everything without Bojji.

**[Try the demo](https://vsouto.github.io/bojji/)**: it runs on sample data and saves nothing.

![Bojji showing the #Siemens tag with a task open](docs/screenshots/tag-light.webp)

## What it does

- **Tasks** with due dates, in Today, Week schedule (Monday to Sunday, including the days that already passed), All tasks and Completed.
- **Notes** in Markdown. Headings and lists render in place, and the file stays plain text.
- **Tags** on tasks and notes, each with its own colour. Click a tag to see everything with it: open tasks, notes, then completed tasks.
- **Sync you can see.** Every change settles to "Kept in your GitHub", which links to your storage. If another device changed the same item first, Bojji reloads instead of overwriting.
- Light and dark mode, and a one-pane layout at phone width.

<p>
  <img src="docs/screenshots/note-dark.webp" alt="A Markdown note in dark mode" width="68%">
  <img src="docs/screenshots/mobile-tag.webp" alt="The tag view at phone width" width="24%">
</p>

## How your data is stored

Your notes and tasks go in a separate private repository in your account, `bojji-data` by default, never in this code repository. Each item is one file:

```
tasks/mvr340e4-d88hk7.md
---
id: mvr340e4-d88hk7
type: task
title: Send the Q4 proposal
status: todo
due: 2026-10-29
tags: Siemens, Proposals
updated: 2026-10-27T19:40:12.000Z
---
Optional notes in Markdown.
```

Bojji talks to the GitHub API directly from your browser, and every save is a commit.

## Run it

Bojji is early: "Sign in with GitHub" for everyone isn't built yet. For now it runs on your own machine using your GitHub CLI login.

Requires Node 22+ and the [GitHub CLI](https://cli.github.com/), logged in (`gh auth login`).

```bash
npm start      # open http://localhost:5173
npm run smoke  # end-to-end test against GitHub (uses bojji-dryrun-data, cleans up after itself)
```

The first run creates the private `bojji-data` repository in your account. Set `BOJJI_REPO=<name>` to use a different one.

## Roadmap

- Sign in with GitHub, so Bojji can be hosted for anyone
- Offline edits that sync later
- Renaming and merging tags
- Native iOS and Android apps

## License

[MIT](LICENSE)
