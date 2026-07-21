# Extended mode spec (M5) — org-wide exposure

> [!KEY] **The one new answer.** `bojji expose &lt;CVE&gt; --index &lt;org-index&gt;` → every exposed **product across every repo in the org**, each with its owning team, the proving path, and how fresh the slice is. Same engine as portable mode, wrapped in an emit → seed → compose loop over a thin git index. This is the paid, on-prem tier.

> [!OK] **Status: core built (2026-07-21).** M5.0 (slice + `index emit`), M5.1 (`expose --index` compose), M5.3 (`index publish`), M5.4-local (`index crawl --repos`), and M5.5 (`--as-of`) are implemented and validated on two local fixtures. The GitLab crawl code path is written but **guarded and not executed** (personal project — no employer data). M5.2 (positioning gate) is a human call, not code. This doc has been reconciled to describe what was actually built; deviations from the original plan are flagged inline with **[as built]**.

> [!NOTE] Portable mode (M0–M4) is shipped and stays free and standalone. Extended mode is strictly additive and reuses the portable engine verbatim (see `src/analyze.ts` — the shared `analyzeRepo` / `buildReport` seam both modes call).

## The core insight: the slice is CVE-agnostic

The per-repo engine (M0–M4) already builds everything the org-wide answer needs *except the advisory*: a resolved dependency graph, product boundaries (workspace / Nx), ownership references, and coverage notes. A **slice** is a serialization of exactly that structure — **with no CVE and no OSV data in it**.

That one property carries the whole design:

- A **new CVE** is answerable across the whole org **with no re-crawl** — you match fresh OSV ranges against the stored graphs at query time.
- The index only changes when a repo's **dependencies** change, not when the vulnerability world changes.
- Exposure and ownership are still **computed/derived on read**, honoring the confirmed spec ("persist structure only").

## Architecture

```
per repo (portable, free):
    package-lock.json + package.json + CODEOWNERS + nx graph
         │  bojji index emit
         ▼
    slice.json   — CVE-agnostic structure: graph · products · owner refs · freshness

seeding (paid, one read-only pass — no per-team opt-in):
    bojji index crawl --gitlab <url> --group <org>
         │  reads each repo's files via the GitLab API (read-only, buildless)
         ▼
    <org>/bojji-index   — a git repo of slices; its git history IS the time machine

org-wide query (paid):
    bojji expose <CVE> --index <org>/bojji-index
         │  match OSV vs every slice's graph · attribute to products · resolve owners
         ▼
    every exposed PRODUCT across all repos + owner + path + freshness + "as of"
```

## The slice format **[as built]**

A versioned JSON document, one per repo, structure-only. This is the schema `bojji index emit` actually produces (`src/slice.ts`):

```
{
  "sliceVersion": 1,
  "repo": "demo-monorepo",              // slug/name — the index identity
  "commit": "6ecf3cb",                  // lockfile's last commit, else HEAD, else null
  "generatedAt": "2026-07-21",
  "fidelity": "workspace",              // nx | workspace | root
  "freshness": {                        // git provenance, stamped at emit
    "lockfileCommit": "6ecf3cb", "lockfileDate": "2026-07-20", "head": "e09ebe4"
  },
  "graph": {
    "nodes": [ { "key": "node_modules/minimist", "name": "minimist", "version": "1.2.5" } ],
    "edges": [ ["packages/web", "node_modules/minimist", "minimist"] ],  // [from, to, depName]
    "unresolved": 0                     // declared edges absent from the lockfile (coverage)
  },
  "products": [ { "name": "@acme/web", "dir": "packages/web", "isRoot": false } ],
  "nx": null,                           // NxProject[] (name, root, npmDeps) when fidelity==="nx", else null
  "ownership": {                        // raw CODEOWNERS references; kinds derived on read
    "relPath": "CODEOWNERS",
    "rules": [ { "pattern": "/packages/web/", "owners": ["@acme/frontend-team"], "line": 3 } ]
  },
  "codeownersDate": "2026-07-20",
  "coverage": [ ]                       // human notes (e.g. unresolved edges), for the org view
}
```

The `graph` + `products` + `nx` are what M0–M3 already compute; `emit` just serializes them via `analyzeRepo`. `ownership` stores CODEOWNERS **patterns and tokens** (references), never resolved people — team-vs-individual is classified on read, exactly as portable mode does.

> [!NOTE] **[as built] Deviations from the original sketch, each deliberate:**
> - **Node shape is `{key, name, version}` — no `purl`.** `isRoot`/`isLocal` are *derived from the key* on load (the same rule `buildGraph` uses), so they need not be stored. `purl` was decorative: the engine's join key is `name@version`, which is already present. Dropped to keep the slice minimal and the CVE-agnostic keystone clean.
> - **Edges carry `depName`** (`[from, to, depName]`), not bare `[from, to]` — matches the engine's `Edge` type. It isn't required for the round-trip (traversal keys on nodes) but it's cheap provenance.
> - **Added `freshness`, `codeownersDate`, `nx`, and `graph.unresolved`.** These are load-bearing for reproducing an *identical* M3 answer offline: freshness/codeownersDate feed the "as of" stamps; `nx` is the per-library attribution data; `unresolved` feeds the coverage line. Without them the round-trip could not be byte-identical.
> - **`ownership` is an object `{relPath, rules[]}`**, not a flat array, and stores no per-rule `kinds` — kinds are derived on read (`ownerKind`), preserving "store references, derive on read."
> - **`products` store `{name, dir, isRoot}`**, not `kind`/`imports`. Per-lib imports live in `nx.npmDeps` (the real source); a product's `kind` is implied by its attribution at query time.

> [!WARNING] **[as built] Known limitation inherited from portable mode.** Product discovery (`discoverProducts`) enumerates units by scanning `packages/`, `libs/`, `apps/` — so a workspace under a *different* directory (e.g. `services/*`) is not registered as a product and its exposures collapse to the repo root, even though the proving path still resolves correctly. This is a portable-mode gap, not an extended-mode one; the fix (also honor workspace roots declared in the lockfile) is noted for a future milestone. The `demo-service` fixture uses `packages/*` to stay within the supported convention.

## The index repo

A normal git repo (`&lt;org&gt;/bojji-index`), on-prem inside the org's own GitLab:

```
<org>/bojji-index/
  manifest.json            # repos indexed, last-crawled commit + date each, schema version
  slices/
    swwc__sw-web-components/latest.json
    swwc__another-repo/latest.json
```

- **No database, no service.** Composition is "read every `latest.json`, run the engine per slice, union the results."
- **Its git history is the dated snapshot store** (see below).
- On-prem and read-only-seeded, so it never leaves the org boundary.

> [!NOTE] **[as built] Compose is a union of results, not a physically merged graph.** For each slice, `composeOrg` (`src/compose.ts`) reconstructs that repo's graph and runs the *same* `matchAdvisories` + `computeExposures` + `resolveOwner` as portable mode, then unions the per-repo exposures (deduped per repo × product × culprit). Because separate repos' lockfile graphs never share keys and never have cross-repo edges, a physically merged/namespaced graph would add a collision hazard for zero benefit — the answer is identical and the engine is reused verbatim. The original "union the graphs" phrasing is realized as "union the answers."

## The commands **[as built]**

| Command | Tier | What it does |
|---|---|---|
| `bojji index emit [--out &lt;file&gt;]` | free | Print (or write) this repo's slice (structure only). Runnable in CI or by hand. `--out` writes a file; default prints to stdout. |
| `bojji index publish --index &lt;path&gt;` | paid | Write this repo's slice into the index dir (`slices/&lt;slug&gt;/latest.json` + `manifest.json`). Committing is left to the user (`git add/commit`). |
| `bojji index crawl --index &lt;path&gt; --repos &lt;p1,p2,...&gt;` | paid | **Local mode (validated):** emit+publish slices for several local repo paths in one pass, fidelity set honestly per repo. |
| `bojji index crawl --index &lt;path&gt; --gitlab &lt;url&gt; --group &lt;g&gt;` | paid | **GitLab mode (written, guarded, unexecuted):** read every repo's lockfile/package.json/CODEOWNERS via the GitLab API and seed the index. Refuses to run unless `BOJJI_GITLAB_TOKEN` is set — the token is **never** a flag. |
| `bojji expose &lt;CVE&gt; --index &lt;path&gt; [--as-of &lt;ref&gt;]` | paid | Compose all slices → org-wide exposed products + owners + paths + freshness. `--as-of` reads the index at a past git ref. |
| `bojji expose &lt;CVE&gt; --slice &lt;file&gt;` | free | Run the engine against one stored slice (offline round-trip / debugging). |

> [!NOTE] **[as built]** The original sketch named only four commands and put the token on the `--gitlab` command. As built there are two `crawl` modes (local vs GitLab) and a `--slice` query for the M5.0 round-trip; the crawler token is read strictly from the `BOJJI_GITLAB_TOKEN` environment variable and the GitLab path throws immediately if it is absent.

## Ownership & freshness in extended mode

Ownership is still **derived on read** — but from the slice's stored CODEOWNERS references, which were captured **as of the crawl/emit**. So the "as of" stamp matters more here: an answer says *"owner per CODEOWNERS as of 2026-07-07 (last crawl)."* Re-crawling refreshes it. A future option is to re-fetch live CODEOWNERS per repo at query time for a "live ownership" mode; the git-only default trades that for zero query-time network.

## Dated "as-of" snapshots (audit requirement E6) — for free

Because slices are committed with each repo's commit sha + date, **the index repo's own git log is the time machine**. "What did we ship, and know, at release v2.3?" = read the index as of that date and run `expose` against those slices. No extra machinery: point-in-time answers fall out of committing structure to git.

## Two-tier fidelity (honest coverage)

The Nx per-library attribution (M3) needs the Nx project graph, which lives in a repo's `.nx` cache — not reliably available to a **central crawler** without building (which we won't do). So:

> [!WARNING] **Crawler-seeded slices degrade gracefully.** npm-workspaces repos get full per-product fidelity from the crawler (the lockfile carries workspace boundaries). Nx repos crawled centrally fall back to **root-level** attribution (`fidelity: "root"`), because per-lib needs the Nx graph. A repo that adds a one-line **`bojji index emit` CI job** (where its Nx cache exists) publishes a **`fidelity: "nx"`** slice with full per-library attribution. The org view is complete on day one (central crawl), and sharpens per repo as teams opt into the CI emit. Every answer states its fidelity, so coarse data is never mistaken for fine.

## Positioning: this faces a tougher incumbent than portable mode did

> [!WARNING] Portable mode beat GitLab's *per-project* view easily. Extended mode competes with **GitLab Ultimate's group-level security dashboard**, which already aggregates vulnerabilities across a group's repos. So the wedge must lean hard on what that dashboard still does *not* do: **product-granular exposure inside a monorepo** (not repo-granular), **owner routing to the team per exposed product**, **dated as-of answers from git history**, and **buildless/offline** operation. If a security lead can't tell Bojji's org answer from the group dashboard, extended mode dies (pre-mortem P1). Validate that gap on real repos before building the crawler.

## Licensing boundary

Open-core, per the business plan. `expose` (portable) and `index emit` are **free** — emit is the funnel, and it lets any repo produce a slice. The **paid** surface is the org-wide machinery: `crawl`, `publish`, and `expose --index`. On-prem, per-repo license (you pay per repo represented in the index).

## Milestones

> [!NOTE] Sequenced so each step is demoable and the risky positioning question gets tested early, before the crawler is built.

- **M5.0 — Slice + `index emit`.** ✅ **Built.** Serialize the structure M0–M3 build; round-trip it. *Verified:* `expose CVE-2021-44906 --slice` is **byte-identical** to `expose CVE-2021-44906 --dir fixtures/demo-monorepo` for both human and `--json` output.
- **M5.1 — `expose --index &lt;dir&gt;` compose.** ✅ **Built.** Per-slice engine run unioned into an org-wide answer with per-slice attribution, owners, paths, freshness, and dedup by repo × product. *Verified:* a two-repo index (`demo-monorepo`, `demo-service`) answers CVE-2021-44906 org-wide — `@acme/web` (direct) and `@svc/gateway` (via `mkdirp`), each with owner + path.
- **M5.2 — Positioning check (gate).** ⏸ **Human call, not code.** The compose output is built to support it; deferred to a human comparison against GitLab's group dashboard on real repos.
- **M5.3 — Index repo + `publish`.** ✅ **Built.** `manifest.json` + `slices/&lt;slug&gt;/latest.json`; `index publish` writes/refreshes a slice; the user commits.
- **M5.4 — Seed crawler.** ✅ **Local mode built & validated** (`index crawl --repos` seeds a 2-repo index in one pass, fidelity set honestly). ⏸ **GitLab mode written but not executed** — guarded behind `BOJJI_GITLAB_TOKEN`; no employer infra was touched (personal-project boundary).
- **M5.5 — Dated snapshots.** ✅ **Built.** `--as-of &lt;ref&gt;` reads the manifest + slices at a past git ref via `git show`. *Verified:* an older index commit reproduces the 2-repo answer while HEAD shows 3.

## Open questions & risks (each with a default)

1. **Nx graph in the crawler.** *Default:* accept the two-tier fidelity above; never build source centrally. Nx repos start at root fidelity and upgrade via CI emit.
2. **Slice staleness.** *Default:* the crawler stamps each slice's source commit; `manifest.json` shows last-crawled dates; stale slices are flagged in the answer, never silently trusted.
3. **CODEOWNERS individuals / PII (E8).** *Default:* store team/role tokens plainly; flag individual tokens; offer `--redact-individuals` for slices that leave the strictest boundaries. The index is on-prem, so exposure is internal.
4. **Internal-registry packages** absent from public OSV. *Default:* carry them in the graph and report them in `coverage` as "not checked," never assumed clean (same honesty as portable mode).
5. **Index scale.** *Default:* slices are KB-sized; hundreds of repos are a few MB of JSON in git. No pagination needed at realistic org sizes; revisit only if a graph query gets slow.
6. **Auth for the crawler.** *Default:* a read-only GitLab token scoped to the group; documented as read-only, no write access to source repos.

## Go/no-go for extended mode

The gate is **M5.2**, deliberately before the crawler: does the composed org-wide, product-granular, owner-routed answer clearly beat GitLab's group security dashboard on real repos? If yes, build the crawler and sell the org-wide tier. If no, extended mode isn't the wedge — and portable mode still stands on its own.
