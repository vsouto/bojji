# Rejected & superseded

> [!NOTE] Assumptions and specs we have explicitly moved off. Kept for provenance — **none of these are current**. The live direction is **Plan → Focus (the business plan)**.

## Rejected product bets / positioning

- **"Bojji generates SBOMs" as the product.** Rejected — GitLab and `npm sbom` ship SBOMs free and supported. Bojji consumes them; the buildless generator survives only as an air-gap fallback.
- **"AI knowledge graph" as the pitch.** Rejected — table stakes now (Cortex, Sourcegraph, Snyk, Backstage, Harness all ship MCP / AI query). MCP stays an optional, secondary surface.
- **The general org-catalog ambition.** Rejected — Backstage, Cortex, and Port own "software catalog," and it does not sell on its own. The org ontology rides along only because it makes exposure answers routable.
- **"What breaks if I upgrade."** Rejected — that needs code-usage analysis (Moderne's heavy game); a metadata graph literally cannot answer it. Verb discipline: exposure, never breakage.
- **Leading with "compliance-grade."** Rejected until the signed keyless attestation is proven on a real air-gapped release. Until then the claim is "inventory and exposure."

## Reversed decisions

- **Persist ownership** → reversed to **derive ownership on-read**. Stored owners rot and misroute; a confidently wrong owner is worse than none. See **Confirmed specs → Pivots**.

## Superseded architecture / strategy

- **Central service / server-backed platform** — the v0.1 stack (Neo4j + Postgres + Redis + BullMQ). Superseded by Plan 004: portable-first, git-only, no server, nothing to keep alive.
- **Strategy "a" — "AI Knowledge Graph for Engineering Organizations"** (the original ChatGPT-drafted pitch). Superseded by strategy "b" (on-prem exposure inventory), then sharpened by the business plan into product-level exposure + ownership routing.

## Where the old material lives

- Repo `archive/`: `spec_v0.1.md` (the original direction-"a" spec), `spec_graph.md.txt`, `analyze_cosmos_export.py`.
- Worked reasoning that led here (kept under **Analysis**): Heavy vs Light, Audit & compliance, Adversarial (the pre-mortem).
