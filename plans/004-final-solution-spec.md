# Plan 004 — Final solution spec (v1)

> The decided shape of Bojji. Supersedes the "central service" assumption in Plan 003's architecture section (the MVP feature scope in 003 still holds).

## In one line

**Bojji lives inside your projects, focuses on audit and ontology, and needs no central service to run.** Each project is autonomous (produces its own audit report + ontology slice, offline). The pieces meet in one passive **shared index repo**, where the company-wide ontology composes itself. Engineers and agents read that same repo through MCP.

## The three pillars

1. **Portable first (how).** A package in each project. Works alone, offline, no server, no database — nothing to provision or keep alive.
2. **Audit & ontology focused (what — primary).** Compliance-grade audit & exposure answers, plus the org ontology: who owns what, who depends on what, who to contact.
3. **MCP for engineers & agents (secondary).** Querying the knowledge is secondary, and it's served from the **same** index repo — no new setup or infrastructure.

## Architecture

```
repo A / B / C   → each holds a slice (SBOM + product.yaml) in .bojji/
       ↓ pin slice · pull back its neighbourhood
Shared index repo   ← passive git, no server; ontology composes via shared keys (package · product · team)
       ↓ read (local, no backend)
Audit reports  ·  Web UI / CLI (people)  ·  MCP (agents — secondary)
```

No service in the middle — just files in a repo that everything reads.

## The portable piece (per project, in `.bojji/`)

- `sbom.cdx.json` — dependency truth, generated buildless from the lockfile (CycloneDX).
- `product.yaml` — product, owning team, contacts (auto-filled from CODEOWNERS, human-confirmed).
- a **cached neighbourhood** — only the related bits it needs (its deps' owners; who consumes what it publishes), pulled from the shared repo. Not the whole company → no bloat.

With just this, a project generates its own audit / exposure report **offline** — fully autonomous.

## The shared index repo (the rendezvous)

- One git repo, no server, no DB. Each project pins its slice; slices that mention the same package/product/team **snap together** → the company ontology composes itself.
- **Bootstrap on first install (mostly automatic):**
  1. Auto-detect the conventional repo (e.g. `‹org›/bojji-index`) → if it exists, point to it.
  2. If missing → offer to create it using the developer's already-authenticated git CLI (no stored secret).
  3. The git host enforces "clearance" — if the person can't create org repos, the attempt is refused and Bojji falls back to **local-only** + gives an admin a one-liner. Never blocks.
  4. Only the first installer bootstraps; everyone after auto-detects.

## Security & compliance (lock down + minimise, don't "hide")

- **Key choice: persist structure + ownership; compute exposure on-read.** If the index leaks, it reveals the dependency map (mostly derivable anyway) — **not** a ready-made list of exploitable holes. Data minimisation auditors reward.
- Private repo governed by the org's existing SSO / RBAC / branch protection. **Git history = the audit trail.** TLS in transit; encrypt sensitive fields at rest if wanted.
- Lives in your own (on-prem / self-hosted) git → inherit your existing security & compliance posture; nothing leaves the perimeter.

## MCP (secondary, same repo)

Engineers and agents query the ontology through a **local MCP server that reads the same index repo** — no separate backend, no new store, no extra onboarding. Serving it from the same repo is deliberate: avoiding another setup is what protects adoption.

## Gaps & pending items (impact index)

| Item | Impact | Note |
|---|---|---|
| Git host — GitHub / self-hosted GitLab / both | **High** | Decides bootstrap auth + RBAC flow. Needed to build. |
| First ecosystem = npm | **High** | Assumed (matches SWWC); confirm before the first parser. |
| Index model: persist structure+ownership, compute exposure on-read | **High** | Defines what the index *is* and the whole security posture. Needs sign-off. |
| Index write model — per-project push vs PR vs collector | Med | Who holds write; affects trust & noise. |
| Continuous monitoring / alerting (R1) | Med | Not in portable v1; needs a scheduled reader (cron over the index), later. |
| Cross-org freshness at scale | Med | Raw-slice reads fine small; pre-build a static index artifact for scale. |
| Ownership / contact data quality | Med | CODEOWNERS guess + human confirm; perennial gap. |
| "Cheaper" cost proof vs Moderne / Backstage | Med | Still only directional. |
| Defaults: SBOM = CycloneDX, feed = OSV, "product" = releasable unit | Low | Safe recommendations; need a nod. |
| Multi-ecosystem & cross-company federation | Low | Explicitly future; out of scope for v1. |
