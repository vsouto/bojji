# Bojji — Market-Fit Research 001

> **Date:** 2026-07-17 · **Method:** deep-research harness (6 search angles → 24 sources fetched → 111 claims → 25 adversarially verified: 18 confirmed, 3 refuted, 4 unverified due to infra errors).

---

## Executive summary

Bojji enters a market that is **real and well-validated but rapidly consolidating around its exact positioning.** The internal developer portal / software catalog category is old and entrenched — Backstage (Spotify, open-sourced March 2020) plus a commercial cohort (Cortex, Port, OpsLevel, Atlassian Compass, Roadie) prove enterprises genuinely need a queryable model of teams, services, ownership and dependencies.

**The "AI/MCP whitespace" thesis is largely false.** Cortex, Snyk, Sourcegraph, Moderne, Atlassian (Compass), Backstage and Harness all ship MCP servers that answer ownership/dependents/impact queries for AI agents — several with the literal "what depends on X?" / "blast radius" framing Bojji claims as its wedge. Harness is publicly pitching the identical "your repo is a knowledge graph; agents query a context engine via MCP, not files" thesis while shipping real components.

**Bojji's defensible differentiation is therefore NOT "AI-queryable" (commoditized)** but its specific architecture — distributed, auto-populated-from-manifests/lockfiles at CI/release with a rebuildable index and no central DB — plus cross-org dependency-inventory and upgrade-impact depth that current MCP tools only partially cover. That upgrade-impact wedge is **provisional** (see unverified claims).

---

## Update — 2026-07-17: upgrade/exposure wedge, re-verified (focused pass)

The previously-unverified wedge ("do Snyk / Moderne / Harness answer 'what breaks if I upgrade X' as a real org-wide graph query?") was re-checked against primary sources (product docs + public MCP tool schemas on GitHub). **Verdict: PARTIALLY OPEN.**

- **Snyk — scan-only.** Its MCP tools (`snyk_sca_scan`, etc.) run per-repo on checked-out code and often need the build. It keeps a current-state vulnerability inventory and generates per-repo fix PRs, but there is no org-wide "simulate upgrading X and traverse the impact" query. Not occupying the wedge.
- **Harness — vision-only.** The shipped MCP server + "Software Delivery Knowledge Graph" model the delivery lifecycle (pipelines, deployments, services). The "blast radius if I change this interface" line is explicitly framed in Harness's own blog as something a context engine *should eventually* support — not built. Not occupying the wedge.
- **Moderne — the real threat (partially occupying it).** Moderne genuinely answers "what's affected / what breaks if I upgrade X" org-wide *today* — but via heavyweight Lossless-Semantic-Tree ingestion of every repo plus a recipe computation over that code, not a lightweight metadata graph.

**Bojji's defensible slice (narrow but real):** instant, no-ingestion, lightweight, cheaper, self-serve — the opposite of Moderne's heavy enterprise LST platform.

**Verb discipline (credibility trap):** "who's exposed / what's affected" (which repos/products declare X directly or transitively) is answerable instantly and cheaply by a lockfile metadata graph — and it is exactly what CRA compliance needs. "What actually breaks" (removed API, changed signature, behaviour) requires code-usage analysis (Moderne's LST) that a metadata graph cannot do. **Bojji must sell exposure, not "what breaks."**

**Local-testing note:** the SaaS products require accounts to run, so live blast-radius testing is not locally reproducible; the decisive evidence was the public GitHub MCP tool schemas (Harness, Snyk), read directly. No local test was needed to reach this verdict — the useful local test is Bojji-side (prototype whether a lockfile-derived graph gives useful exposure answers) and belongs in Plan 002.

Sources: github.com/harness/mcp-server · github.com/snyk/studio-mcp & snyk.io/articles/snyk-mcp-cheat-sheet · docs.openrewrite.org (DependencyInsight / UpgradeDependencyVersion) & moderne.ai.

---

## 1. Competitors (oldest-first) — the market is entrenched ✅

**Confidence: high.** The maturity of this category validates real demand — the "plus" we were looking for.

- **Backstage** (Spotify) — open-sourced **16 March 2020**, plugin architecture, later donated to CNCF. Open-source, self-hosted. The anchor of the category.
- **Cortex, Port, OpsLevel, Atlassian Compass** — proprietary SaaS catalogs.
- **Roadie** — managed Backstage.
- Named but not independently verified here: Harness IDP, Configure8, Spotify Portal, Google Cloud offerings.
- **Adjacent — code & dependency intelligence:** Sourcegraph (+ Cody), Moderne / OpenRewrite, GitHub dependency graph.
- **Adjacent — dependency/supply-chain:** Snyk, Dependabot, Renovate, FOSSA, Socket, Endor Labs, StepSecurity, Chainguard (most named in brief; not all independently verified).
- **Emerging OSS "code-as-knowledge-graph":** CodeGraph (embedded SQLite graph), GitNexus (zero-server) — closest to Bojji's architectural idea, appearing fast.

**Enterprise-scale proof point:** Cloudflare self-hosts Backstage cataloging **2,055 services, 167 libraries, 122 packages, 228 APIs, 375 teams, 6,389 users, 1,302 databases** — directly relevant to a Siemens-scale first deployment.

## 2. AI / MCP compatibility — the whitespace is mostly closed ⚠️

**Confidence: high.** This is Bojji's biggest de-differentiation risk, not its opportunity.

| Competitor | AI / MCP status | Notes |
|---|---|---|
| **Cortex** | MCP server **GA since July 2025** | Catalog entities, scorecards, initiatives; natural-language IDE queries. |
| **Sourcegraph** | MCP **GA** | read_file, keyword_search, go_to_definition, find_references, commit_search; OAuth 2.0; works with Claude Code, Cursor, etc. |
| **Snyk** | MCP server in the CLI | SCA/code/SBOM scan, package-health tools. Triggers *scans* rather than pure graph queries. |
| **Moderne** | MCP server | Trigrep/Prethink/Recipes/Changelog for coding agents; impact via local CLI on checked-out repos. |
| **Atlassian / Compass** | Official cloud MCP (GA per source) | Docs use the exact query *"What depends on the api-gateway service?"* |
| **Backstage** | Official plugin `@backstage/plugin-mcp-actions-backend` | First-party MCP capability; Cloudflare also built an in-house 13-tool Backstage MCP. |
| **Harness** | Real MCP server + "Software Delivery Knowledge Graph" | **Pitches Bojji's exact thesis** (see §3). |
| **Port** | "Agentic-SDLC Platform" + AI Builder | Auto-populated "Context Lake" (vs Backstage manual YAML); $100M raise to become an "agentic AI hub". |

**Refuted framing assumptions:** the claims that "incumbents lack AI features/MCP" and that "engineers won't delegate org-context tasks to agents" were both refuted 0-3 by the evidence.

## 3. The direct positioning collision — Harness

**Confidence: high.** Harness's blog literally states *"A repository is a knowledge graph"* and *"The context engine exposes itself through a Model Context Protocol (MCP) server or REST API, so any agent can query the context engine directly… agents never read files. They query the context engine."* It frames *"What is the blast radius if I change this interface?"* as a core use case.

**Caveats that keep a gap open:** Harness's repo-context engine is partly aspirational, and its knowledge graph is delivery-lifecycle-centric (builds/deployments/incidents/spend) and code-level (functions/classes) — **not** Bojji's org-level dependency inventory (teams/projects/repos/libraries/releases).

## 4. Where Bojji is genuinely differentiated (narrow but real)

**Confidence: medium.** No confirmed source shows an incumbent shipping Bojji's **exact architecture**: distributed data living in projects + a rebuildable index, zero central DB, auto-populated from manifests/lockfiles at release time.

The **dependency-upgrade-impact wedge** ("what breaks if I upgrade X") is only *partially* occupied: Snyk's MCP invokes scans rather than answering graph queries; Moderne offers dry-run/impact preview but as a local CLI subprocess, not a hosted org-wide graph; Harness's blast-radius is code-level and partly aspirational.

**Not differentiated:** "AI-queryable", "MCP server", "auto-populated catalog", "ownership/dependents queries" — all shipped by incumbents.

## 5. Threats

**Confidence: high.**
- **MCP commoditization** — protocol support confers no moat; everyone ships it.
- **Incumbents bolting MCP onto mature catalogs** — already happening (Cortex, Port, Harness, in-house Backstage).
- **Build-vs-buy at enterprise scale** — self-hosted Backstage + in-house MCP is the free, entrenched alternative, proven at Cloudflare scale. Serious threat at Siemens.
- **Cold-start data** — mitigated by manifest/lockfile auto-population, but must prove it reaches and stays current at scale.

## 6. Tailwinds & the possible wedge

- **Platform engineering is near-ubiquitous** — Gartner: 80% of (large) software orgs will have platform teams by 2026, up from 45% in 2022. (Tailwind that also lifts incumbents.)
- **EU Cyber Resilience Act** — Article 13 mandates machine-readable SBOMs + vulnerability-handling (applies **Dec 2027**); Article 14 *reporting* begins **11 Sept 2026**, where the "24 hours" is an **early-warning notification** for *actively-exploited* vulnerabilities (identical to NIS2) — **not** "fix in 24h" and **not** every CVE. Honest read (clarified 2026-07-18): a real tailwind — Bojji cuts time-to-awareness and scopes which products are affected — **not** a literal 24-hour mandate. SaaS-first incumbents serve **on-prem / air-gapped** enterprises poorly — the wedge that fits the Siemens-first context.

---

## Refuted claims (killed 0-3)

- "Engineers keep org-context tasks for themselves rather than delegating to AI agents." *(Source: Anthropic 2026 Agentic Coding Trends Report.)*
- "None of Backstage/Port/Cortex/OpsLevel/Humanitec ship AI/LLM/MCP features." *(Source: encore.dev.)*
- "Port offers LLM steps but no dedicated AI assistant or MCP server." *(Source: cortex.io.)*

## Unverified (infra errors — treat as provisional; these are load-bearing for the wedge)

> **Now resolved:** the upgrade-impact item below was re-verified on 2026-07-17 — see the "Update" section near the top of this file. Verdict: wedge PARTIALLY OPEN (Moderne occupies it via heavy ingestion; Snyk scan-only; Harness vision-only).

- Whether Snyk's MCP **lacks** upgrade-"breakability" analysis.
- Whether Moderne's dry-run impact analysis overlaps Bojji's wedge.
- Whether Atlassian's Compass MCP is GA.
- The full tool surface of Sourcegraph's MCP.

## Open questions to resolve before betting

1. Does any incumbent MCP (Snyk, Moderne, Harness) actually answer *"what breaks if I upgrade X"* as a **graph query** vs. triggering a scan? (Is the wedge genuinely open?)
2. At Siemens/Cloudflare scale, does Bojji's distributed/no-central-DB/rebuildable-index architecture measurably beat self-hosted Backstage + in-house MCP on cost, freshness, latency?
3. How defensible is manifest/lockfile auto-population vs. Port's API-driven "Context Lake" — and does it degrade for polyglot/monorepo/vendored estates?
4. Which enterprise procurement realities (on-prem/air-gapped, SBOM/CRA compliance) can Bojji turn into a wedge that SaaS-first incumbents serve poorly?

## Caveats on this research

The space moves month-to-month (most sources 2025-2026); any "incumbent lacks AI" read decays within weeks. Founding/scale facts and MCP shipments are backed by primary sources (vendor docs, GitHub, Cloudflare's engineering blog) and unanimous votes; positioning/trend findings lean on vendor thought-leadership blogs (Harness's repo-context engine is partly aspirational). The Gartner stat drops its "large organizations" qualifier. Competitor list is non-exhaustive.

## Key sources

- Backstage founding / scale: engineering.atspotify.com; blog.cloudflare.com/internal-ai-engineering-stack
- MCP shipments: cortex.io/post/mcp-server; sourcegraph.com/mcp; github.com/snyk/studio-mcp; moderne.ai/openrewrite; github.com/atlassian/atlassian-mcp-server; nitin15j.medium.com (Backstage MCP)
- Positioning: harness.io/blog/your-repo-is-a-knowledge-graph-you-just-dont-query-it-yet; port.io
- Trends/regulation: signisys.com (Gartner); keysight.com & anchore.com (EU CRA)
- Skeptical: medium.com "Backstage Backlash"; port.io/blog/what-are-the-technical-disadvantages-of-backstage
