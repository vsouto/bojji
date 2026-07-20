# Heavy vs. Light — and the dry-run results

Moderne and Bojji answer a similar question from opposite ends. Moderne works at the **code** level; Bojji at the **dependency-metadata** level. Almost every weight difference follows from that one choice — and the Plan 002 prototype dry-run confirmed most of them on real data.

## The comparison — with what we've confirmed

| Characteristic | Moderne — heavy | Bojji — light | Confirmed by the dry-run? |
|---|---|---|---|
| What it works on | Full source, compiled into type-attributed trees (LSTs) | Only the dependency list from the lockfile | ✅ Yes — used lockfiles only |
| How the data is built | Must build / compile every repo | Reads an existing text file — no build | ✅ Yes — resolved an 89-package tree, no build |
| Compute to ingest | Heavy CPU and memory per repo | Trivial lockfile parse | ✅ Yes — about 1 ms |
| Storage | Large tree artifacts for the whole codebase | A few KB of metadata per repo | ✅ Yes — 18 KB for 89 packages |
| Keeping it fresh | Re-build and re-ingest on change | Re-read the lockfile at release | 🟡 Partly — inherent, not stress-tested |
| How impact is answered | A computation (recipe dry-run) over code | An instant graph traversal | ✅ Yes — instant reverse + CVE queries |
| Onboarding a repo | Get its build working first | Works even if the repo doesn't build | ✅ Yes — no build needed |
| Infrastructure | Ingestion pipeline plus a platform | No central database; a rebuildable index | 🟡 Partly — design choice, the MVP will show |

> [!KEY] **The honest trade:** because Moderne holds the code and types, it can tell you what *actually breaks*. Bojji holds only metadata, so it tells you who is *exposed* — not what breaks. That is the deliberate trade, and "who's exposed" is exactly what compliance needs.

## Dry-run results — Plan 002

A throwaway prototype read lockfiles, built a cross-repo graph, and answered exposure queries plus a CVE overlay. It ran on a controlled fake set **and** on a real 89-package tree resolved straight from the npm registry. **Verdict: GO.**

| # | Assumption | Result |
|---|---|---|
| A1 | Buildless extraction | ✅ PASS |
| A2 | Graph self-assembles across repos | ✅ PASS |
| A3 | Exposure is an instant traversal | ✅ PASS |
| A4 | CVE overlay (axios < 1.6.0) | ✅ PASS — flagged exactly the exposed repos |
| A5 | Light footprint | ✅ PASS — 18 KB for 89 packages |
| A6 | Cheap and fast ingest | ✅ PASS — about 1 ms |
| A8 | Monorepos / workspaces parse | ✅ PASS |
| A7 | Honest limit | ✅ Confirmed — it knows "exposed", not "breaks" |

> [!NOTE] No official SWWC repositories were touched — the dry-run used fake repos plus a real public dependency tree. Full write-up: `plans/002-prototype-results.md`.

## What "cheaper" still needs

> [!WARNING] Lightness is validated. **"Cheaper"** is only *directionally* supported so far (ingest time and footprint both point the right way); the full cost comparison versus Moderne or a self-hosted Backstage at scale is a later exercise.
