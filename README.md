# Bojji

Free, open-source notes and tasks that live in **your own GitHub account**.

No subscription, no Bojji servers holding your data. Each note and task is a plain Markdown file in a private repo you own, with full version history, readable without Bojji.

## Status

Early dry-run MVP that proves the storage idea works. Sign-in is a local stand-in for now (it uses your GitHub CLI login), so it only runs on your own machine.

## Try it locally

Requires Node 22+ and the [GitHub CLI](https://cli.github.com/) logged in (`gh auth login`).

```bash
npm start      # open http://localhost:5173
npm run smoke  # end-to-end test against GitHub
```

The first run creates a private repo `bojji-dryrun-data` in your account to hold your notes and tasks.

## License

[MIT](LICENSE)
