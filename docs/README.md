# Bojji docs (local wiki)

A self-contained wiki that renders the Markdown files in `content/`. No build step, no dependencies.

## Run it

The wiki reads `.md` files over HTTP, so serve the folder (don't open `index.html` as a `file://` path):

```bash
cd docs
python3 -m http.server 8099
# then open http://localhost:8099
```

(Any static server works — e.g. `npx serve`.)

## Update it

- **Edit a page:** change the matching file in `content/*.md` and reload.
- **Add a page:** drop a new `.md` in `content/`, then add an entry to the `NAV` array near the top of the `index.html` `<script>`.
- **Dashboard counts/lists:** edit the `CONFIRMED` and `OPEN` arrays in `index.html`.

## Structure

- `index.html` — the app (left tree menu, Markdown renderer, dashboard).
- `content/confirmed.md` — the confirmed specs (C1–C5 + strategy).
- `content/ontology.md` — the ontology, kept as a secondary feature.
- `content/market-research.md` — market-fit summary.
- `content/heavy-light.md` — heavy-vs-light matrix + dry-run results.
