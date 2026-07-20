# Confirmed specs

> [!NOTE] These are the decisions locked into the Bojji spec. Everything else is still open — see the **Home** dashboard for what's pending.

## Strategy — direction "b"

Bojji is the **on-prem, compliance-grade, ontology-backed dependency inventory** for engineering organisations. It auto-populates itself, and its first, paid use case is dependency **exposure / blast-radius**. We do **not** lead with "AI knowledge graph" — the research showed that is table stakes now.

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
- **Index model:** persist structure + ownership, **compute exposure on-read** (a leak reveals the dependency map, not a list of exploitable holes).
- **Defaults:** SBOM = CycloneDX, vulnerability feed = OSV, "product" = a releasable/deployable versioned unit, v1 ontology = Product · Package · Repository · Team · Person.
- **Git host** only matters in extended mode: self-hosted GitLab first, GitHub as fast-follow. Not MVP-gating.
