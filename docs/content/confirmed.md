# Confirmed specs

> [!NOTE] These are the decisions locked into the Bojji spec. Everything else is still open — see the **Home** dashboard for what's pending.

## Strategy — direction "b"

Bojji is the **on-prem, ontology-backed dependency exposure inventory** for engineering organisations. It auto-populates itself, and its first, paid use case is **product-level exposure / blast-radius with ownership routing**. It is sold as "inventory and exposure" until the signed attestation makes the "compliance-grade" claim provable (see **Pivots**). We do **not** lead with "AI knowledge graph" — the research showed that is table stakes now.

## The specs

### C1 — The contract
Bojji owns one canonical model (the ontology): the entities and how they relate. Every data source is an adapter that maps into it, so the product stays independent of any company's tools and is portable across companies.

### C2 — The flow
All incoming data passes through a single **Ingestion Service** into one knowledge graph, served to people (REST API + UI) and to AI agents (MCP). Left of the Ingestion Service is swappable per company; right of it is Bojji everywhere.

### C3 — Adopt: scan & gather
Bojji is a package you add to any project. On adoption it auto-scans the project's dependencies and gathers everything else it needs in the same step — auto-filling what it can (for example, ownership from CODEOWNERS) and asking a person only to confirm the gaps. If the install is non-interactive it records what's missing and asks later. It never blocks a build.

### C4 — Report at release
When a project builds a release in CI, it sends its details and full dependency list to Bojji's company cloud. The project holds **no** Bojji credentials — its CI identity is trusted directly (keyless), or Bojji collects the data with its own read-only access.

### C5 — Ownership
Bojji is Victor's personal project, his alone. Hosted on his own GitHub, and first tested by installing into a **clone** of SWWC v2 — locally, with employer data kept in-house.

## Validated

The **lightness thesis** was validated by the Plan 002 prototype dry-run — see *Analysis → Heavy vs Light & dry-run*.

## Solution shape & recent confirmations (2026-07-20)

> [!DECISION] The final solution shape (Plan 004) and the build-gating decisions are settled. Full picture in **Plan → Solution shape (current)**.

The essentials:

- **Two modes.** The **default** is a portable package for a single project (offline audit + ontology slice — no host, no server). A **shared index repo** that composes the company-wide ontology is an **optional extended mode**, opted into via the auto-detect-or-create flow (C3-style). Extended mode is a layer on top, not a requirement.
- **npm** is confirmed as the first ecosystem.
- **Index model:** persist **structure only**; **derive ownership on-read** (amended 2026-07-20 by the pre-mortem — see Pivots); **compute exposure on-read** (a leak reveals the dependency map, not a list of exploitable holes).
- **Defaults:** SBOM = CycloneDX, vulnerability feed = OSV, "product" = a releasable/deployable versioned unit, v1 ontology = Product · Package · Repository · Team · Person.
- **Git host** only matters in extended mode: self-hosted GitLab first, GitHub as fast-follow. Not MVP-gating.

## Audit & compliance (confirmed 2026-07-20)

Worked out on the **Analysis → Audit & compliance** page; the decisions:

- **Audit artifact = the SBOM, in two low-friction forms (both kept).** A = a committed `.bojji/sbom.cdx.json`, auto-regenerated and re-staged by a Bojji-installed pre-commit hook (no CI bot-commit). B = a signed release attestation via keyless OIDC in the existing CI job (no secrets). Exposure findings are never stored — they are computed on read.
- **Design principle: Bojji is unnoticeable.** Near-zero setup (zero where possible) and near-zero developer friction; artifacts are produced automatically by the normal flow. Nobody should have to "run Bojji."
- **MCP is optional.** In default mode the value arrives via the CLI, the generated files, and CI output — with zero MCP. MCP is the secondary, opt-in agent surface. Its detailed component spec is still to be written.
- **Enterprise readiness (E1–E12).** The requirements auditors need are catalogued, each with a solution. Most are small; the three with real effort are E3 (keyless signing under true air-gap), E6 (dated feed snapshots for "as-of" answers), and E12 (modelling a workspaces monorepo as multiple products). None block M0.

## Pivots from the pre-mortem (2026-07-20)

The pre-mortem (**Adversarial** section) produced four accepted hedges; a tech-lead pass turned them into spec adjustments. Three sharpen existing decisions; one reverses a previously-locked line (ownership).

- **P1 · The SBOM is input, not the product.** Bojji does not compete on SBOM generation — that is table stakes the platform already ships (GitLab CycloneDX, `npm sbom`). Bojji **consumes** an existing SBOM via a C1 adapter, and keeps its buildless generator only as an air-gap / portability fallback. **The product is product-level reverse blast-radius plus ownership routing:** "which shipped product is exposed to this CVE, and who do I notify." A **week-one test** on the real SWWC v2 lockfile — it must beat GitLab's built-in dependency view — is the go/no-go before building the rest.
- **P2 · Attestation gates the word "compliance".** The signed keyless attestation (E3) is now **gating for the compliance pitch**, not post-v1. Bojji is sold as "inventory and exposure" until the trust chain (SBOM plus build hash, signed with the CI identity, verifiable offline and working in a true air-gap) is proven on one real release. This changes the claim discipline and pulls air-gap signing earlier; it does not change what M0 ships.
- **P3 · Derive ownership on-read; do not persist it.** *(Reverses the earlier "persist ownership" line.)* The index persists **structure only**; ownership is resolved **at read time** from live sources (CODEOWNERS, GitLab groups, directory), stamped with provenance and freshness, and defaulted to team or role aliases (never individuals). `product.yaml` stores product identity plus a *reference* to the ownership source, not resolved names or emails. This kills the "stale owner misroute" failure and dissolves most of the E8 PII / erasure problem. Note: alias-to-person resolution needs the live source, so it is an online / extended-mode capability; team or role derivation from in-repo CODEOWNERS still works offline.
- **P4 · Seed extended mode centrally.** A one-time **read-only org crawler** (reads every repo's lockfile in a single pass and writes slices into the index repo — no server, C4-style access) is the **primary** way to reach critical mass. The grassroots auto-detect-or-create flow stays as the per-repo on-ramp, but the org-wide graph no longer depends on opt-in — it is useful on day one.

> [!KEY] **Positioning (sharpened):** Bojji takes the SBOM your platform already emits and answers the one thing those tools answer poorly — *which shipped product is exposed to this vulnerability, and which team do I notify* — with ownership derived live and exposure computed on-read, no server, portable into an air-gap. "Inventory and exposure" today; "compliance-grade" the moment the signed keyless attestation is proven on a real air-gapped release.
