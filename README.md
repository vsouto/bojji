# bojji

Name the shipped products a vulnerability touches, and the team to call, from a graph that stays fresh on its own.

Bojji answers one question well: **`bojji expose <CVE>`** → the products a vulnerability actually reaches, each with the dependency path that proves it, its owning team, and how fresh the answer is. SBOM is the fuel; the graph is the engine; the exposed-product-plus-owner answer is the product.

See the plan in [`docs/`](docs/) (open `docs/index.html` in a browser, served) — the north star is **Plan → Focus** and the build order is **Plan → Prototype build plan**.

## Status: M3 (per-library attribution via the Nx graph)

Buildable and running on real lockfiles. Give it a **CVE or GHSA id** and it
resolves the affected npm package(s) and version ranges from [OSV](https://osv.dev)
(following GHSA aliases when the CVE record itself carries no npm data), parses the
npm `package-lock.json` (v2/v3), builds the resolved dependency graph, and
reverse-traverses to the **releasable unit** that pulls the vulnerability in:

- **npm-workspaces repos** → the workspace package.
- **Nx repos** (deps declared at the root) → the actual **shipped library** that
  imports it, resolved via the Nx project graph, or flagged as **root/dev tooling**
  when no shipped library uses it. Produces an exposed / not-exposed breakdown.

It then **derives ownership live from CODEOWNERS** — never stored — pointing at a
team/role, flagging individuals, stamping "as of", and saying "no rule" honestly.
`--package/--range` is an offline override; `--no-nx` / `--nx-graph <file>` control
Nx attribution.

Next: M4 — the go/no-go, `bojji expose` beside GitLab's dependency view on the real repo.

## Build & run

```bash
npm install
npm run build

# M1: give a CVE, OSV resolves the package + range
node dist/cli.js expose CVE-2021-44906 --dir /path/to/a/repo

# offline override: skip OSV, match by package + range
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
