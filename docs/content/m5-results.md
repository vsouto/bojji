# M5 results — extended mode (core shipped)

> [!OK] **Core built & validated locally (2026-07-21).** The org-wide engine works end to end on local fixtures: emit a CVE-agnostic slice, seed an index, and compose one CVE across many repos with owners and paths. Spec: **Plan → Extended mode spec**.

> [!WARNING] **Not fully done.** The live GitLab crawl is written but deliberately **unexecuted** (guarded by a token env var; no employer infra touched), and the **M5.2 positioning gate** (beat GitLab's group security dashboard on real repos) is a human call still pending. No "Resolved" badge until those close.

## What a tech-lead review changed

The spec survived, but the review caught real issues and the build reflects the fixes:

- **The slice schema was too thin.** It dropped the fields the engine actually reads (`isRoot`/`isLocal`, the Nx project data, freshness + CODEOWNERS date, the `unresolved` count) and carried a decorative `purl`. Fixed: the slice now stores exactly what round-trips, and derives `isRoot`/`isLocal` from the key on load.
- **"Union the graphs" was the wrong mechanism.** Separate repos share no graph keys, so a merged graph buys nothing and risks key collisions. Compose is now a union of per-repo **results**, each produced by the unchanged engine.
- **Ownership `kinds` shouldn't be stored** — classifying team-vs-individual is derived on read, keeping the "store references, derive on read" rule intact.
- A latent **freshness bug** (empty git output stamped as a blank commit instead of "unknown") was fixed along the way.

## How it's built (reuses the portable engine)

A new `analyze.ts` seam refactors the repo → report pipeline so **every mode feeds the same** `matchAdvisories` / `computeExposures` / ownership logic — portable, single-slice, and org-wide all share one engine. New modules: `slice.ts` (the CVE-agnostic slice), `index-repo.ts` (manifest + `slices/&lt;slug&gt;/latest.json`, `--as-of` via `git show`), `compose.ts` (org union), `render-org.ts`, `crawl.ts` (local + guarded GitLab).

## Command surface

```
bojji index emit [--out <file>]                 print this repo's CVE-agnostic slice   (free)
bojji index publish --index <dir>               write the slice into the index          (paid)
bojji index crawl --index <dir> --repos a,b,c    local: seed many repos in one pass      (paid)
bojji index crawl --index <dir> --gitlab <url> --group <g>   read-only GitLab (needs BOJJI_GITLAB_TOKEN)
bojji expose <CVE> --index <dir> [--as-of <ref>]  compose across all slices             (paid)
bojji expose <CVE> --slice <file>                 run against one stored slice
```

## Validation (independently re-run)

| Check | Result |
|---|---|
| `tsc` strict, dep footprint | clean; still one runtime dep (`semver`) |
| Round-trip (M5.0) | `expose --slice` is **byte-identical** to `expose --dir` (human + JSON) |
| Slice is CVE-agnostic | no CVE / OSV / range strings in the slice — a new CVE needs no re-emit |
| Org-wide compose (M5.1) | one CVE across 2 fixture repos → 2 exposed products, each routed to its team with a path |
| Crawl local (M5.4) | one command seeds the index across both fixtures, correct manifest |
| `--as-of` (M5.5) | reading the index at a past commit reproduces the earlier org answer |
| Portable mode | M0–M4 answers unchanged (SWWC nth-check still routes to `swwc-core-styles`) |

```
$ bojji expose CVE-2021-44906 --index <org-index>

Org exposure: minimist reaches 2 of 2 repo(s) — 2 exposed products.

▸ demo-monorepo   [workspace]
  ● @acme/web       owner: @acme/frontend-team [high]   path: @acme/web → minimist@1.2.5
▸ demo-service    [workspace]
  ● @svc/gateway    owner: @svc/gateway-team [high]      path: @svc/gateway → mkdirp@0.5.1 → minimist@0.0.8
```

## Deferred (by design)

- **Live GitLab crawl** — coded and guarded, never run (personal project; no employer infra).
- **M5.2 positioning gate** — the human comparison vs GitLab's group security dashboard, still to do on real repos before the crawler is worth shipping.
- **Nx root-hoisted refinement in compose** — the M3 branch is engine-covered and round-trips; the fixtures declare deps at the workspace level, so it isn't exercised by fixture data (it is on real SWWC, see M3 results).
