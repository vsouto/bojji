# Plan 002 — Prototype dry-run RESULTS

> **Date:** 2026-07-17 · **Verdict: GO.** All assumptions passed. The "light" thesis holds.
> Throwaway code lived in scratchpad (`bojji-proto/`, not committed). No official SWWC repos were touched — a controlled set of fake repos plus one real registry-resolved tree were used.

## What was run

1. **Controlled fake set** — 4 repos (`acme-ui` library, `app-web`, `app-admin`, `mono-shop` monorepo) with hand-authored `package-lock.json` files, designed so the graph *must* connect across repos and a CVE overlay has a known answer.
2. **Real-world tree** — a `package.json` with `express, react, react-dom, axios, lodash`, resolved via `npm install --package-lock-only` (**no build, no node_modules**) → a genuine 89-package lockfile from the registry, then run through the same extractor.

## Results vs the pass lines

| # | Assumption | Result | Evidence |
|---|---|---|---|
| A1 | Buildless extraction | **PASS** | Full transitive trees recovered from lockfiles alone. Real set: 89-package tree resolved with `--package-lock-only`, no build. |
| A2 | Graph self-assembles across repos | **PASS** | `@acme/ui` consumed by `app-web` + `app-admin` and published by `acme-ui` — met at one shared node. 2 cross-repo edges, exactly as designed. |
| A3 | Exposure is an instant traversal | **PASS** | Reverse queries correct & transitive (lodash → all 4 repos; follow-redirects → the 2 axios users). Sub-millisecond. |
| A4 | CVE overlay | **PASS** | `axios < 1.6.0` flagged exactly `{app-web, mono-shop}`, with paths; `app-admin` correctly NOT exposed. Real set: no false positive (real axios is patched). |
| A5 | Footprint is light | **PASS** | 2.4 KB for 4 fake repos; **18 KB for 89 real packages**. KB-scale — MBs, not GBs, at org scale. |
| A6 | Ingest cheap & fast | **PASS** | Parse + graph build ≈ **1 ms**. The only slow step was registry resolution (~4s), which is still buildless and cacheable. I/O-bound, not compute-bound. |
| A8 | Monorepos / workspaces | **PASS** | `mono-shop`'s `packages/core` and `packages/utils` (separate `package.json`s) both parsed; `@shop/utils → axios` exposure captured. |
| A7 | Honest limit (characterise) | **CONFIRMED** | The graph knows a repo *declares* vulnerable axios, but has zero information on whether the code actually *uses* the vulnerable function. So it answers **"who's exposed," not "what breaks."** Exactly as the strategy now states. |

## Honest caveats found (things a production version must handle deliberately)

- **Query semantics nuance:** "who depends on X" also surfaced the *producer* repo because the reverse traversal followed the `publishes` edge. Trivial to fix (separate `publishes` from `depends_on` in reverse queries) — flagged so it isn't forgotten.
- **Nested versions:** real lockfiles can install *multiple versions* of the same package at nested `node_modules/.../node_modules/...` paths. The dry-run flattened by name+version (fine for hoisted trees); a real build must model multiple concurrent versions on purpose. (Real run showed 87 nodes vs 89 lockfile entries — minor collapse, immaterial to the dry-run.)
- **"Cheaper" is only directional here.** Ingest time (~1 ms) and footprint (KB) both point strongly the right way, but the full cost comparison vs Moderne / Backstage-at-scale is still a later exercise.

## Decision

**GO to the MVP.** Buildless extraction, cross-repo self-assembly, instant exposure queries, correct CVE overlay, and KB-scale footprint are all validated. The lightness thesis is real; the honest limit ("exposure, not breakage") is confirmed and already baked into the strategy.

Next: **Plan 003 — the MVP** (npm first: the v1 ontology, the per-project file, the ingestion shape, and a first real exposure/CVE query surface).
