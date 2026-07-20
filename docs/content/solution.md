# The solution (current plan)

> [!NOTE] The decided shape of Bojji, as of 2026-07-20. Full depth lives in `plans/004-final-solution-spec.md` (shape) and `plans/003-mvp.md` (MVP scope). This page is the living summary.

## Two modes

Bojji has two modes, and the simple one is the default.

### Default — portable package (individual project)
The initial and default mode is **just a package you add to one project**. It generates that project's own audit report and ontology slice **offline** — no host, no shared repo, nothing to provision or keep alive. This alone is useful: a single project can answer "am I exposed to CVE-X, and who owns the affected parts?" on its own.

### Extended — shared index repo (optional, opt-in)
If you want the **company-wide** view (the ontology composing itself across many projects), you opt into **extended mode** by giving Bojji a shared index repo. Bojji sets it up with the smooth flow we designed: on install it tries to **auto-detect** the conventional `‹org›/bojji-index`, and if it's missing, **offers to create it** using the developer's already-authenticated git CLI (no stored secret). If the person lacks clearance to create org repos, it falls back to local-only and hands an admin a one-liner. It never blocks.

> [!KEY] Extended mode is a layer on top, not a requirement. Most of the value is available in the default portable mode; the index is there when cross-project composition is wanted.

## The three pillars

1. **Portable first (how).** A package in each project. Works alone, offline, no server, no database.
2. **Audit & ontology focused (what — primary).** Compliance-grade audit and exposure answers, plus the org ontology: who owns what, who depends on what, who to contact.
3. **MCP for engineers & agents (secondary).** Querying is secondary, and in extended mode it's served from the **same** index repo — no new setup.

## Architecture

```
DEFAULT (portable):
  one repo → .bojji/ (sbom + product.yaml + cached neighbourhood) → offline audit / exposure report

EXTENDED (optional):
  repo A / B / C  → each pins its .bojji/ slice
        ↓
  shared index repo  ← passive git, no server/DB; ontology composes via shared keys (package · product · team)
        ↓ read (local, no backend)
  audit reports · web UI / CLI (people) · MCP (agents — secondary)
```

No service in the middle in either mode — just files.

## The portable piece (per project, in `.bojji/`)

- `sbom.cdx.json` — dependency truth, generated buildless from the lockfile (CycloneDX).
- `product.yaml` — product, owning team, contacts (auto-filled from CODEOWNERS, human-confirmed).
- a **cached neighbourhood** — only the related bits it needs (extended mode), never the whole company → no bloat.

## Security & compliance

> [!KEY] **Persist structure + ownership; compute exposure on-read** (confirmed). If the index leaks, it reveals the dependency map (mostly derivable anyway), **not** a ready-made list of exploitable holes.

In extended mode the index is a private repo governed by the org's existing SSO / RBAC / branch protection; **git history is the audit trail**. It lives in your own (on-prem / self-hosted) git, so it inherits your compliance posture — nothing leaves the perimeter.

## Confirmed technical defaults

| Decision | Choice |
|---|---|
| First ecosystem | **npm** (matches the first test target; validated by the Plan 002 prototype) |
| SBOM format | CycloneDX only (purl identity, VEX first-class) |
| Vulnerability feed | OSV (consume; mirrorable for air-gap) |
| "Product" | A releasable / deployable versioned unit (CRA "product placed on market"), declared in `product.yaml` |
| v1 ontology | Product, Package (`name@version` / purl), Repository, Team, Person + relations (produced_from, depends_on [direct/transitive], owned_by, contact) |
| Index model | Persist structure + ownership; compute exposure on-read |
| Git host (extended mode) | Self-hosted GitLab first (dogfood + on-prem wedge); GitHub as fast-follow. Not MVP-gating. |

## What's next (engineering)

The architecture and the build-gating decisions are settled. The remaining open items (git host specifics, index write model, cross-org freshness at scale, cost proof) all live in **extended mode** or are post-v1, so they don't block the start.

> [!TIP] **M0 — the thinnest slice (host-agnostic, portable mode):** `lockfile → sbom.cdx.json → .bojji/` in one repo. Then M1 adds the offline exposure report (`bojji expose <CVE>` → affected products + owners/contacts/path/confidence).
