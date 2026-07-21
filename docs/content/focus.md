# Focus — the business plan

> [!KEY] **The one thing.** `bojji expose <CVE>` → the shipped products a vulnerability actually touches, each with its owning team, the path that proves it, and how fresh the answer is. The SBOM is fuel; the graph is the engine; **the exposed-product-plus-owner answer is the product.**

Full deck: **`docs/business-plan.html`** (open it in a browser). This page is the living summary; it is the authoritative statement of what Bojji is and what we build.

## The bet — the ontology that builds itself

The whole field can build an ontology; nobody can keep one alive. Construction is manual and expensive, and maintenance is unsolved ("no complete automated ontology-evolution system exists"). Bojji's graph builds and refreshes itself from code — buildless, from lockfiles and CODEOWNERS — which is exactly that gap. It slips between **Palantir** (hand-built, top-down, expensive) and **GitHub / npm** (free, flat, commoditized).

## Build one thing

`bojji expose <CVE>` → exposed products, owning team, dependency path, freshness stamp. Everything Bojji does must make that one answer faster, truer, or fresher.

## Kill everything else

- **Generating SBOMs** — GitLab and `npm sbom` already do it free. Consume theirs; the buildless generator is an air-gap fallback only.
- **"AI knowledge graph" as the pitch** — table stakes. MCP stays optional and secondary, never the headline.
- **The general org-catalog ambition** — Backstage, Cortex, Port own it, and it doesn't sell alone.
- **"What breaks if I upgrade"** — needs code-usage analysis (Moderne's game); metadata can't answer it. Verb discipline: exposure, never breakage.
- **Stored ownership** — derive live, stamp freshness, point at a team or role, never a person.
- **The word "compliance"** — until the signed attestation is proven air-gapped. Until then: "inventory and exposure."

## Who pays

- **Buyer:** the security or platform lead at an on-prem, air-gapped, regulated org (Siemens-shaped) — the buyer SaaS structurally cannot serve.
- **Wedge customer:** SWWC v2, on self-hosted GitLab. Zero sales cycle, and the perfect adversary (GitLab Ultimate is already on).
- **First demo:** on a real CVE, beat GitLab's flat dependency view with a routed product-plus-owner answer.

## Business model

Open-core. The **free portable package** (single project, offline) is the funnel and must be great alone. The **money** is the org-wide answer: enterprise, **on-prem, per-repo license** — cross-product exposure, the central crawler that seeds it, live ownership resolution, dated "as-of" snapshots, and the attestation that unlocks "compliance."

## Moat

Self-building where Palantir is hand-built; product-and-owner-routed where GitHub and Backstage are flat; instant and no-ingestion where Moderne is heavy. It compounds via a data network effect inside a single customer, and on the one thing the field hasn't cracked — self-maintaining freshness.

## First move (Monday)

Run the **week-one go/no-go**: `bojji expose <CVE>` on the real SWWC v2 lockfile, beside GitLab's view. If a security lead can't instantly call Bojji's the more actionable answer, stop. Everything else is earned after that.
