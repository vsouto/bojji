# Market fit — research summary

*Full report: `research/001-market-fit.md`. Method: fan-out web search with adversarial verification — 18 claims confirmed, 3 refuted, 4 later resolved by a focused re-check.*

## The one-line read

The market is **real and validated**, but "AI-queryable knowledge graph" is now **table stakes**. Bojji's edge has to be architecture + dependency depth + on-prem/compliance — not the AI.

## Competitors

The internal developer portal / software catalog category is old and entrenched — which validates that the need is real.

| Category | Players | Note |
|---|---|---|
| Portals / catalogs | Backstage (2020, open-source), Cortex, Port, OpsLevel, Atlassian Compass, Roadie | Old and entrenched — proves demand |
| Code / dependency intelligence | Sourcegraph, Moderne / OpenRewrite | Moderne is the real threat — see *Analysis* |
| Supply-chain / dependency | Snyk, Dependabot, Renovate, FOSSA, Socket, Endor Labs | Scanning, not org-wide graph queries |

## AI / MCP is already everywhere

Cortex (GA July 2025), Sourcegraph, Snyk, Moderne, Atlassian/Compass and Backstage all ship MCP servers. Harness even sells the exact "your repo is a knowledge graph, query it with AI" line. So AI access is **not** a differentiator.

## The wedge, re-verified

"Org-wide upgrade/exposure blast-radius as a graph query" is **partially open**:

- **Snyk** — scan-only, per repo. Not occupying it.
- **Harness** — a blog vision, not shipped. Not occupying it.
- **Moderne** — genuinely answers it org-wide today, but via heavyweight code ingestion. The real competitor.

## Tailwinds

- **EU Cyber Resilience Act** — a strong near-term tailwind, but read it precisely. Its "24 hours" is an *early-warning notification* for *actively-exploited* vulnerabilities (from Sept 2026, identical to NIS2) — not "fix in 24h" and not every CVE. The durable obligation a dependency tool maps to is **Article 13 SBOM + vulnerability-handling** (from Dec 2027). Bojji helps by shrinking *time-to-awareness* and *scoping* which products are affected — it does not "make you compliant."
- **On-prem / air-gapped** enterprises are underserved by SaaS incumbents. Siemens is exactly that buyer.

## Verb discipline — important

Sell **"who's exposed / what's affected"**, never **"what breaks."** A metadata graph answers exposure instantly; it cannot know what actually breaks in the code without usage analysis — which is exactly what Moderne does and we deliberately do not.
