# Prototype build plan — `bojji expose` (portable, npm-first)

> [!KEY] The work order for the first buildable prototype: the thinnest thing that proves the one bet. Scoped by a tech-lead pass over **Plan → Focus**, **Confirmed specs**, and the archived pre-mortem. Success is the **week-one go/no-go**, nothing more.

## 1. Goal & success criteria

**The one demo.** In a single command, on the **real SWWC v2 clone's `package-lock.json`**, for **one real CVE**, `bojji expose` prints: every **shipped product** in the repo that is exposed, each with its **owning team**, the **transitive dependency path** that proves it, and a **freshness stamp** — rendered side-by-side against GitLab's dependency view.

**The go/no-go bar (this is the whole point of the prototype).** Run it beside GitLab Ultimate's built-in dependency list on the same repo and CVE. Concretely, "more actionable than GitLab" means all four, judged by a security lead:

1. **Product granularity, not repo granularity.** GitLab says "this repo depends on `axios@1.5.0` (vulnerable)" — one flat row. Bojji must say *which of the N releasable units* in the repo are actually exposed (SWWC v2 is an npm-workspaces monorepo, so this is a real, visible difference — several products, not one), and which are **not**.
2. **Routed ownership.** Each exposed product carries an **owning team/role**, derived live from CODEOWNERS, so the lead can name *who to notify from Bojji's output alone, without opening another tool*.
3. **Proof path.** Each row shows the exact `product → … → vulnerable package` chain.
4. **Freshness.** Every answer is stamped (lockfile commit, OSV fetch time, CODEOWNERS age).

> [!OK] **Measurable success:** from Bojji's output the security lead can, unaided, (a) list the exposed products at workspace granularity and (b) name the team to notify for each — neither of which GitLab's flat list gives.

> [!WARNING] **No-go** if the product/owner rows are empty, wrong, or add nothing over GitLab's single flat entry. If it can't clear that bar on the real lockfile, **stop** — nothing else gets built.

## 2. In scope / explicitly out of scope

**In scope (the thin wedge):**
- One CLI: `bojji expose CVE-…`, single-project **portable mode**, offline-capable except the one OSV fetch.
- Inputs: `package-lock.json` (v3), `package.json` (+ workspaces), `CODEOWNERS`, optional `.bojji/product.yaml`, OSV.
- Output: exposed **products** → owning **team** → **path** → **freshness**, plus honest coverage of what couldn't be checked.
- npm only. Workspaces monorepo handling (because the target *is* one).

**Explicitly out of scope — the kill-list, restated as prototype boundaries (do not build any of these):**
- **SBOM generation as a product.** We parse the lockfile buildlessly as *internal plumbing* and can *consume* a platform CycloneDX SBOM, but we never pitch or ship "Bojji makes SBOMs." (P1)
- **MCP server / "AI knowledge graph" pitch.** No MCP in the prototype. Value arrives via the CLI only.
- **Extended mode:** shared `bojji-index` repo, cross-repo composition, the org-wide crawler (P4). Prototype answers **this repo only**.
- **Any server, database, REST API, SQLite index, or web UI.** In-memory + files + stdout, nothing to keep alive.
- **Stored ownership.** Ownership is derived on-read, points at a team/role never a person, and is never persisted. (P3)
- **Signed keyless attestation** (E3) and **the word "compliance."** Prototype claim is "inventory and exposure." (P2)
- **"What breaks if I upgrade"** / code-usage analysis. Verb discipline: **exposure, never breakage.**

## 3. Architecture of the prototype

Everything is a pure function from files → an answer. No state survives the process.

**Concrete inputs**
- `package-lock.json` (**v3**, `lockfileVersion: 3`) — the buildless dependency truth (resolved versions + integrity, no `node_modules`, no registry calls).
- `package.json` (root) + its `workspaces` globs — enumerates the **releasable units** (each workspace package = a candidate product).
- `CODEOWNERS` (root / `.github` / `.gitlab`) — team/role ownership, matched by path glob.
- `.bojji/product.yaml` (optional) — overrides product identity + ownership *source reference* (never resolved names). Auto-scaffolded, never required.
- **OSV** — one online fetch: resolve the CVE/GHSA id → affected npm package(s) + version ranges.
- Git — for freshness stamps (last-commit dates of the lockfile and CODEOWNERS).

**Transforms**
1. **Parse lockfile** → nodes keyed by `name@version` (purl `pkg:npm/…`), edges from each package's declared deps resolved to the installed version (hoist-aware). Marks direct vs transitive.
2. **Enumerate products** from workspaces (root package if publishable/deployable), each with its own dependency closure.
3. **Fetch CVE from OSV** → affected package + semver ranges.
4. **Match** affected versions against graph nodes with the vetted `semver` lib.
5. **Reverse-traverse** each matched package up to the product(s) whose closure contains it; record the shortest proving path.
6. **Derive ownership on-read** — glob the product's repo path against CODEOWNERS → team/role alias, stamped with CODEOWNERS freshness.
7. **Coverage** — every package that couldn't be resolved or isn't in public OSV (e.g. internal Artifactory) is flagged, not silently dropped.
8. **Render** — human table (default) or JSON.

**Data-flow**

```
  package-lock.json ─┐
  package.json  ─────┤ parse (buildless)     ┌── CODEOWNERS ──┐ glob match
  (workspaces)       ▼                       ▼                ▼
                 dependency graph        products         owner (team/role,
                 (name@version, purl,    (releasable       derived on-read,
                  direct/transitive)      units)            + freshness)
                       │                     │                │
   CVE id ─► OSV ─► affected pkg + ranges    │                │
                       │  semver match       │                │
                       ▼                     ▼                ▼
                 matched nodes ─ reverse-traverse ─► EXPOSED PRODUCTS
                                                      + path + owner + freshness
                                                      + coverage (blind spots)
                                                             │
                                                             ▼
                                              stdout table  /  JSON
                                   (no server · no DB · this repo only)
```

**Output shape** (per exposed product): `{ product, owner{team, source, as_of}, package, path[], directness, confidence }` plus top-level `{ cve, osv_fetched_at, lockfile_ref, coverage[], scope:"repo" }`.

## 4. Tech choices

| Concern | Choice | Why |
|---|---|---|
| Language/runtime | **Node.js 20+ / TypeScript**, shipped as an npm package (`npx bojji`) | Native to the npm ecosystem and the target; zero-install via `npx`; matches SWWC v2's own stack. |
| Lockfile parse | **Hand-parse `package-lock.json` v3** (the `packages` map is plain JSON) | Smallest footprint; v3 already carries resolved versions + integrity. Avoid `@npmcli/arborist` for M0 (heavy, pulls much of the npm CLI); keep it as a fallback only if hand-resolution of hoisted edges proves unreliable. |
| Package identity | **`packageurl-js`** | Canonical purl = the join key; tiny, official CycloneDX lib. |
| SBOM consume (optional input) | **Direct JSON parse** of the components/dependencies arrays behind a thin adapter | Ingests GitLab's CycloneDX SBOM without taking the full `@cyclonedx/cyclonedx-library` dependency (heavy, avoided). |
| Vulnerability feed | **OSV.dev** `GET /v1/vulns/{id}` (accepts CVE *and* GHSA via aliases) | npm-native version ranges; aggregates GHSA; mirrorable dump for air-gap later. One fetch per command. |
| Version matching | **`semver`** (npm's own) | Vetted; never hand-roll ranges (the earlier toy comparator is retired). |
| CODEOWNERS | Hand-parser + **`minimatch`** | CODEOWNERS is line-based globs; `minimatch` is the vetted glob engine npm itself uses. |
| Graph | **Plain JS `Map` + adjacency lists**, reverse edges precomputed | KB-scale (Plan 002: 18 KB / 89 pkgs, ~1 ms). No graph DB, no SQLite. |
| Rendering | stdout (optional `picocolors`) + JSON | No UI. JSON output feeds any downstream. |

> [!WARNING] **Flagged risks:** (a) OSV coverage — some advisories carry only enumerated versions, not SEMVER ranges (handle both); (b) hoisted-tree edge reconstruction from a flat lockfile (see risk 2); (c) resist pulling `arborist` / the full CycloneDX library — both would blow the "smallest footprint that ships" budget.

## 5. Milestones (ideal days, solo)

> [!NOTE] Each milestone is independently demoable. **M0 renders a real answer** on real data — it is a walking skeleton, not scaffolding. Total ≈ **7 ideal days**.

**M0 — Walking skeleton: a real answer on a real lockfile (1.5 d).**
Scaffold the TS package + `expose` command. Hand-parse `package-lock.json` v3 → graph → reverse-traverse. Take the vulnerable package + range **as flags** (`--package axios --range "&lt;1.6.0"`), *not* OSV yet. Run on the **real SWWC v2 clone lockfile** and print the exposed product(s) + the transitive path.
*Done when:* on the real lockfile, `bojji expose` with a package/range prints at least one real product with a correct proving path. Proves the two riskiest unknowns up front (real lockfile parses; transitive path reconstructs).

> [!OK] **M0 — shipped (2026-07-20).** Built as a buildless TS CLI (`src/` → `dist/`, one runtime dep: `semver`). Runs on the **real SWWC v2 lockfile (4752 entries, v3)** and reconstructs correct transitive paths, cross-checked against npm's own resolver (`npm ls`). Validated: negative answers (no false positives), multi-copy version discipline (only `ws@7.5.10` matched the range, not the safe 8.13.0 copy), and **multiple distinct exposure routes** for one package, the "which direct dep drags it in" value GitLab's flat row can't give.

```
$ bojji expose CVE-2021-44906 --package minimist --range "<1.2.6" --dir …/sw-web-components

Exposed: sw-web-components is exposed to minimist (1 vulnerable copy in the tree).
● minimist@1.2.5   pulled in via: commitizen
    path: (root) → commitizen@4.2.4 → minimist@1.2.5
    product: sw-web-components (root project)
```

> [!WARNING] **M0 reality-checks that reshape the later milestones (real findings, not assumptions):**
> - **SWWC v2 is an Nx monorepo, and its npm `workspaces` glob is stale** (`packages/**` matches nothing; the real units live under `libs/` and `apps/`). So product discovery is convention-based (scan `libs/*`, `apps/*`, `packages/*`), **not** workspace-based. This retires risk 1's original default.
> - **Dependencies are declared at the root, not per-lib** (the root `package.json` holds ~191 deps; most libs declare `0`). The lockfile is therefore one hoisted root tree. True per-product routing needs the **Nx project graph** (which lib imports which), which is now firmly **M3** work — per-lib attribution from `package.json` deps alone would under-report.

**M1 — Wire OSV so a CVE works end-to-end (1 d).**
`bojji expose CVE-…`: fetch OSV `/v1/vulns/{id}` (CVE or GHSA), extract affected npm package + ranges, `semver`-match against the graph, reuse M0's traversal.
*Done when:* `bojji expose CVE-2023-45857` on the real lockfile returns the correct exposed product(s) with no manual flags. Single product, no owner yet.

**M2 — Ownership on-read + freshness (1.5 d).**
Parse CODEOWNERS, glob-match each product's repo path → team/role alias (never a person). Scaffold `.bojji/product.yaml` (auto-fill owner *reference*, record gaps, never block). Stamp every answer: lockfile commit date, OSV fetch time, CODEOWNERS age. Add high/medium/low confidence (owner matched vs guessed).
*Done when:* every exposed product row shows an owning team + a freshness stamp, derived live, nothing persisted.

**M3 — Workspaces → multiple products + honest coverage (2 d).** *(the real SWWC shape; the go/no-go target)*
Enumerate workspace packages as distinct products; attribute exposure **per workspace closure** so the answer distinguishes exposed vs not-exposed products in one monorepo. Emit **coverage**: flag packages unresolved or absent from public OSV (internal Artifactory pkgs) as reported-not-clean.
*Done when:* on the real SWWC v2 lockfile, one CVE yields a per-product exposed/not-exposed breakdown with owners, paths, and a coverage note.

**M4 — Demo polish + run the go/no-go (1 d).**
JSON output, tidy rendered report, run **beside GitLab's dependency view** on the real clone, capture the comparison, make the call.
*Done when:* the side-by-side exists and the go/no-go is decided against the Section-1 bar.

## 6. The `bojji expose` command

**Contract**

```
bojji expose <CVE|GHSA> [flags]

Positional:
  <CVE|GHSA>            e.g. CVE-2023-45857 or GHSA-wf5p-g6vw-rhxx (OSV aliases resolve either)

Flags:
  --dir <path>         repo root (default: cwd)
  --lockfile <path>    override package-lock.json location
  --sbom <path>        consume a platform CycloneDX SBOM instead of parsing the lockfile
  --package <name>     [M0/offline] match this package directly, skip OSV
  --range <semver>     [M0/offline] version range to treat as vulnerable
  --json               machine-readable output
  --offline            fail if OSV unreachable and no --package/--range or --sbom given
```

**Example rendered answer** (SWWC-shaped workspaces monorepo):

```
$ bojji expose CVE-2023-45857
  axios SSRF / credential leak — OSV, fetched 2026-07-20 14:32Z

Exposed: 2 of 6 products in this repo depend on axios@1.5.0 (vulnerable: <1.6.0)

● @swwc/data-grid            team: @swwc/design-systems        [high]
    path: @swwc/data-grid → @swwc/http-client@2.1.0 → axios@1.5.0
    owner: @swwc/design-systems  (CODEOWNERS, last changed 2026-05-02)

● @swwc/uploader             team: @swwc/platform-web          [high]
    path: @swwc/uploader → axios@1.5.0  (direct)
    owner: @swwc/platform-web  (CODEOWNERS, last changed 2026-05-02)

Not exposed: @swwc/core · @swwc/theme · @swwc/icons · @swwc/cli

Coverage: 1 package could not be checked against OSV —
    @swwc/internal-telemetry@0.4.2 (Artifactory, not in public OSV) — reported, not assumed clean.

Freshness: lockfile @ HEAD (committed 2026-07-18) · OSV fetched 2026-07-20 14:32Z · ownership derived live
Scope: this repo only (portable mode). Org-wide routing is out of prototype scope.
```

That output — product-granular, owner-routed, path-proven, freshness-stamped — is exactly what GitLab's flat "repo depends on vulnerable axios" row cannot produce, and it is the go/no-go artifact.

## 7. Open questions & risks (each with a default so nothing blocks)

1. **What is a "product" in a monorepo?** *Default (revised after M0):* discover units by **convention scan** of `libs/*`, `apps/*`, `packages/*`, not by the root `workspaces` glob (it was stale on the real repo). The root is always a product. **M0 found** deps are declared at the root here, so per-lib attribution is best-effort until the Nx project graph lands in M3 — Bojji is honest about that in its output rather than guessing.
2. **Transitive path from a hoisted/flat lockfile.** Hoisting flattens the tree, so edges aren't literal. *Default:* reconstruct edges by resolving each node's declared `dependencies` to the nearest satisfying installed version (nearest-ancestor `node_modules` rule), key nodes by `name@version` (multiple concurrent versions are real). **Validated in M0** on 4752 real entries, cross-checked against `npm ls` — the hand-resolver was reliable, so `@npmcli/arborist` stays unused.
3. **CVE → version-range matching.** *Default:* OSV is the source of ranges; accept CVE or GHSA (OSV aliases unify them); check with `semver`. If an advisory enumerates specific versions instead of a SEMVER range, match exact versions. Never hand-roll comparison.
4. **Consume vs. generate the SBOM.** *Default:* parse the lockfile directly (buildless plumbing, allowed) and accept a platform CycloneDX SBOM via `--sbom`. We do not pitch generation — kill-list.
5. **Ownership freshness offline.** Person-level resolution needs a live directory (out of prototype). *Default:* emit the **team/role** alias straight from in-repo CODEOWNERS (works fully offline) stamped "as of CODEOWNERS last commit."
6. **OSV in air-gap.** *Default:* prototype fetches OSV online; the mirrorable OSV dump is a documented later add, not built now. `--offline` degrades gracefully to package/range flags or a supplied SBOM.
7. **Internal Artifactory packages** won't appear in public OSV. *Default:* flag them in **coverage** as "not checked," never imply clean (E4 honesty) — this is itself a trust signal auditors reward.

## 8. First week / first commit

> [!TIP] **Day 1 gets to a real answer fastest (this is M0):**

1. `npm init` a TS package named `bojji`; add an `expose` subcommand (a 30-line arg parser, no framework).
2. Write the `package-lock.json` v3 parser: read the `packages` map → nodes `{name@version, purl, deps}`; build forward + reverse adjacency lists.
3. Implement `pathToProduct(pkgNode)` — reverse-traverse to the root/workspace package, return the shortest proving path.
4. Hardcode the axios case (`--package axios --range "&lt;1.6.0"`), point it at the **real SWWC v2 clone's `package-lock.json`**, and print the exposed product + path.
5. **Commit:** `M0: expose by package/range on a real lockfile (walking skeleton)`.

By end of day 1 there is a real, correct exposure answer on real SWWC data. Days 2–3 wire OSV (M1) so the actual CVE works; the rest builds ownership (M2) and the monorepo product breakdown (M3) up to the go/no-go run in M4.
