# Plan 002 — Prototype "dry-run" to validate the lightness thesis

> **Status:** plan only — nothing is built until Victor approves.
> **Purpose:** cheaply falsify or confirm the assumptions behind "Bojji is light" (and that exposure is answerable from metadata) **before** investing in an MVP.

---

## The thesis under test

> From **lockfiles alone (no build)**, can we assemble a **connected, cross-repo dependency graph** and answer **org-wide exposure queries** instantly and cheaply?

If yes → the lightness thesis holds → proceed to the MVP.
If no → we learn it now, for a weekend's effort, not after building the product.

## What the prototype IS

A throwaway script (Node/TypeScript, npm ecosystem) that:
1. Reads each repo's lockfile → emits a normalised dependency graph (JSON).
2. Loads it into an in-memory graph (or a single SQLite file).
3. Runs a few exposure queries + a CVE overlay.
4. Prints metrics.

## What the prototype is NOT

No product architecture, no distributed storage, no `/ingest` service, no MCP server, no UI, no cloud, no ownership plane, no multi-ecosystem support, and **no "what breaks" (API-level) analysis**. This is a falsification experiment, not a foundation — the code is expected to be thrown away.

## The assumptions under test

| # | Assumption | Quick test | Passes if |
|---|---|---|---|
| A1 | Buildless extraction works | Parse the sample repos' lockfiles; compare to `npm ls` (the package manager's own resolved tree) as ground truth | Full transitive deps + exact versions recovered, with **zero builds** |
| A2 | The graph self-assembles across repos | Ingest all sample repos into one graph; check nodes merge on package identity | A package used by several repos is **one node with many dependents**; a package published by one sample repo links to its consumers |
| A3 | Exposure is an instant traversal | Run reverse-dependency queries ("who depends on X@version", direct + transitive) | Correct dependents returned, **sub-second** on the sample |
| A4 | CVE overlay works | Take 1–2 real advisories for common packages in the sample; overlay affected version ranges | Correctly flags the exposed repos **and the dependency path** |
| A5 | Footprint is light | Measure serialised size per repo and for the whole index | **KB-scale** per repo; whole-sample index in **MBs, not GBs** |
| A6 | Ingest is cheap & fast | Time end-to-end extraction + graph build | **Seconds** for the sample; time dominated by I/O, not compute |
| A8 | Monorepos/workspaces parse | Run on a workspace repo (multiple `package.json`) | Workspaces resolved into the graph; gaps documented |

**A7 — characterise the honest limit (not pass/fail):** attempt to answer "does bumping X break repo Y's *code*?" from metadata alone. Expected result: **we can't** — which confirms we must sell "who's exposed," not "what breaks." Document it explicitly.

## Dataset (respecting the confirmed guardrails)

- **Primary — public open-source npm repos** (safe, no employer data). Pick a handful with **overlapping dependencies** so cross-repo assembly is testable, including at least one that **publishes** a package another **consumes**.
- **Secondary — SWWC v2, run LOCALLY only.** Per confirmed guardrail: everything stays on the machine, **nothing pushed to any personal cloud**. Used to test real-world / monorepo behaviour.

## What we measure

Extraction success rate · tree completeness vs `npm ls` · cross-repo edge count · query correctness + latency · per-repo and total footprint · ingest time.

## Go / no-go

**Proceed to MVP if:** buildless extraction is complete & accurate, cross-repo assembly works, exposure queries are correct & instant, and footprint is KB/MB-scale.

**Stop and rethink if:** lockfiles don't yield reliable transitive data without a build; the graph doesn't connect meaningfully across repos; answering exposure turns out to need the code anyway; or the footprint balloons.

## Sequence (weekend-scale)

1. Choose the sample repos (public set + SWWC local).
2. Write the lockfile → graph extractor (npm).
3. Load the graph; run exposure queries + the CVE overlay.
4. Record the metrics; write a one-page verdict against the pass criteria above.

## Scope notes

- Ecosystem: **npm only** (matches SWWC and the likely first-ecosystem call).
- This validates **"lighter"** and **"exposure is answerable from metadata."** It gives only *directional* evidence on **"cheaper"** (via ingest time + footprint); the full cost comparison vs Moderne/Backstage-at-scale is a later exercise.
