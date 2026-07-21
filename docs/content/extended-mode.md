# Extended mode spec (M5) — org-wide exposure

> [!KEY] **The one new answer.** `bojji expose &lt;CVE&gt; --index &lt;org-index&gt;` → every exposed **product across every repo in the org**, each with its owning team, the proving path, and how fresh the slice is. Same engine as portable mode, wrapped in an emit → seed → compose loop over a thin git index. This is the paid, on-prem tier. **Not built yet — this is the plan.**

> [!NOTE] Status: spec only. Portable mode (M0–M4) is shipped and stays free and standalone. Extended mode is strictly additive.

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

## The slice format

A versioned JSON document, one per repo, structure-only:

```
{
  "sliceVersion": 1,
  "repo": "swwc/sw-web-components",
  "commit": "646fd7a75",
  "generatedAt": "2026-07-21",
  "fidelity": "nx",                     // nx | workspace | root  (attribution available)
  "graph": {
    "nodes": [ { "key": "...", "name": "nth-check", "version": "1.0.2", "purl": "pkg:npm/nth-check@1.0.2" } ],
    "edges": [ ["fromKey", "toKey"] ]
  },
  "products": [
    { "name": "swwc-core-styles", "dir": "libs/swwc-core-styles",
      "kind": "nx-lib", "imports": ["cssnano", "glob", "..."] }
  ],
  "ownership": [
    { "pattern": "/apps/storybook/", "owners": ["@vicmeljl"], "kinds": ["individual"] }
  ],
  "coverage": [ "3 internal-registry packages not in public OSV" ]
}
```

The `graph` + `products` are what M0–M3 already compute; `emit` just serializes them. `ownership` stores CODEOWNERS **patterns and tokens** (references), never resolved people.

## The index repo

A normal git repo (`&lt;org&gt;/bojji-index`), on-prem inside the org's own GitLab:

```
<org>/bojji-index/
  manifest.json            # repos indexed, last-crawled commit + date each, schema version
  slices/
    swwc__sw-web-components/latest.json
    swwc__another-repo/latest.json
```

- **No database, no service.** Composition is "read every `latest.json`, union the graphs."
- **Its git history is the dated snapshot store** (see below).
- On-prem and read-only-seeded, so it never leaves the org boundary.

## The four commands

| Command | Tier | What it does |
|---|---|---|
| `bojji index emit` | free | Print this repo's slice (structure only). Runnable in CI or by hand. |
| `bojji index publish --index &lt;path&gt;` | paid | Write/commit this repo's slice into the index repo. |
| `bojji index crawl --gitlab &lt;url&gt; --group &lt;g&gt;` | paid | Read every repo's lockfile/package.json/CODEOWNERS via the GitLab API, emit slices, seed the index in one pass. |
| `bojji expose &lt;CVE&gt; --index &lt;path&gt;` | paid | Compose all slices → org-wide exposed products + owners + paths + freshness. |

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

- **M5.0 — Slice + `index emit` (1.5 d).** Serialize the structure M0–M3 already build; round-trip it (load a slice, run `expose` against it, get the same answer as running live). *Done when:* `expose &lt;CVE&gt; --slice slice.json` matches `expose &lt;CVE&gt; --dir repo`.
- **M5.1 — `expose --index &lt;dir&gt;` compose (2 d).** Union many slices; org-wide exposed products with per-slice attribution, owners, paths, freshness, and cross-repo dedup by product. *Done when:* a directory of hand-emitted slices yields a correct org-wide answer for one CVE.
- **M5.2 — Positioning check (0.5 d, gate).** Put the M5.1 org answer beside GitLab's group security dashboard on a real set of repos. *Go/no-go:* is product-granularity + owner routing clearly more actionable? If not, stop before building the crawler.
- **M5.3 — Index repo + `publish` (1 d).** Conventions, `manifest.json`, commit a slice, refresh it.
- **M5.4 — Seed crawler (2.5 d).** Read-only over the GitLab API: enumerate a group's repos, pull each default branch's lockfile/package.json/CODEOWNERS, emit + publish slices in one pass. *Done when:* one command seeds an index for a real group and `expose --index` answers org-wide.
- **M5.5 — Dated snapshots (0.5 d).** `--as-of &lt;date|ref&gt;` reads the index at a past commit. *Done when:* a past release's exposure is reproducible.

## Open questions & risks (each with a default)

1. **Nx graph in the crawler.** *Default:* accept the two-tier fidelity above; never build source centrally. Nx repos start at root fidelity and upgrade via CI emit.
2. **Slice staleness.** *Default:* the crawler stamps each slice's source commit; `manifest.json` shows last-crawled dates; stale slices are flagged in the answer, never silently trusted.
3. **CODEOWNERS individuals / PII (E8).** *Default:* store team/role tokens plainly; flag individual tokens; offer `--redact-individuals` for slices that leave the strictest boundaries. The index is on-prem, so exposure is internal.
4. **Internal-registry packages** absent from public OSV. *Default:* carry them in the graph and report them in `coverage` as "not checked," never assumed clean (same honesty as portable mode).
5. **Index scale.** *Default:* slices are KB-sized; hundreds of repos are a few MB of JSON in git. No pagination needed at realistic org sizes; revisit only if a graph query gets slow.
6. **Auth for the crawler.** *Default:* a read-only GitLab token scoped to the group; documented as read-only, no write access to source repos.

## Go/no-go for extended mode

The gate is **M5.2**, deliberately before the crawler: does the composed org-wide, product-granular, owner-routed answer clearly beat GitLab's group security dashboard on real repos? If yes, build the crawler and sell the org-wide tier. If no, extended mode isn't the wedge — and portable mode still stands on its own.
