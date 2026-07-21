# bojji

Name the shipped products a vulnerability touches, and the team to call, from a graph that stays fresh on its own.

Bojji answers one question well: **`bojji expose <CVE>`** → the products a vulnerability actually reaches, each with the dependency path that proves it, its owning team, and how fresh the answer is. SBOM is the fuel; the graph is the engine; the exposed-product-plus-owner answer is the product.

See the plan in [`docs/`](docs/) (open `docs/index.html` in a browser, served) — the north star is **Plan → Focus** and the build order is **Plan → Prototype build plan**.

## Status: M0 (walking skeleton)

The first milestone is buildable and runs on a real lockfile. It parses an npm `package-lock.json` (v2/v3), builds the resolved dependency graph, and — given a package + vulnerable range — reverse-traverses to the products, printing the transitive path that proves each exposure. CVE→range resolution via OSV (so the bare `<CVE>` works) is M1.

## Build & run

```bash
npm install
npm run build

# M0: match by --package / --range against a real repo's lockfile
node dist/cli.js expose CVE-2021-44906 \
  --package minimist --range "<1.2.6" \
  --dir /path/to/a/repo
```

Example (real SWWC v2 monorepo, 4752 lockfile entries):

```
  CVE-2021-44906
  matching minimist in range "<1.2.6"

Exposed: sw-web-components is exposed to minimist (1 vulnerable copy in the tree).

● minimist@1.2.5   pulled in via: commitizen
    path: (root) → commitizen@4.2.4 → minimist@1.2.5
    product: sw-web-components (root project)

Freshness: lockfile @ 646fd7a75, last touched 25951800a (2026-07-07)
Scope: this repo only (portable mode). ...
```

Add `--json` for machine-readable output, `--help` for all flags.

## Scope discipline (the kill-list)

M0 deliberately does **not** generate SBOMs, run an MCP server, touch the org-wide extended mode, store ownership, sign attestations, or say "compliance." It reads files, computes exposure, prints, and exits. Nothing to keep alive.
