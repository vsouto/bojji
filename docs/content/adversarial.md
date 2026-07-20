# Adversarial — pre-mortem

> [!NOTE] A pre-mortem run **before** implementation. The frame: *"It's 6 months later. Bojji has failed. Why?"* Reasoned through orthogonal lenses — the developer who must adopt it, the buyer who must justify it, the incumbent competitor, and the auditor who must trust it — then ranked. The top two most-probable failures for each of the two aspects.

> [!KEY] **The single biggest way Bojji dies:** the audit product is a thinner version of what the first customer's own platform already ships. SWWC v2 is on self-hosted GitLab, which already emits CycloneDX SBOMs, scans dependencies, and shows a group-wide dependency list — and npm has native `npm sbom` plus free `npm audit`. With EU CRA's SBOM mandate not binding until Dec 2027, there's no forcing function to adopt a solo-maintained tool over a vendor-supported feature already turned on. Bojji never clears the "why not just use what we have" bar, and the org-wide ontology that would have differentiated it never reaches critical mass.

## Audit aspect

### P1 — Commoditised by the platform the customer already runs

> [!WARNING] **6 months later:** The first demo to SWWC's security team gets one question — "how is this different from GitLab dependency scanning and `npm audit`?" — and there's no crisp answer, because GitLab Ultimate already produces CycloneDX SBOMs, matches CVEs, and shows a group-wide dependency list, on-prem, with vendor support. Bojji's buildless offline SBOM is strictly less than what the CI pipeline already emits, and a champion can't justify introducing an unsupported personal project to replace a feature that's already on and paid for. It stays installed only in Victor's local clone and never becomes a team decision.

- **Leading indicator:** in the first weeks, every conversation opens with "doesn't GitLab/GitHub/npm already do this?", nobody outside Victor installs it, and the SBOM output is indistinguishable from what CI already generates.

> [!TIP] **Hedge:** Stop competing on SBOM generation — consume the platform's SBOM and lead only with the one query GitLab's group view doesn't answer cheaply: **product-level reverse blast-radius with ownership routing** ("which releasable products are exposed, and who to notify"), portable to true air-gap with zero infra to stand up. Prove that exact query against the real SWWC v2 (workspaces plus Artifactory) lockfile in **week one** — and if it isn't visibly better than GitLab's dependency list, pivot or kill before building the rest.

### P2 — Not actually compliance-grade: the auditor won't trust it

> [!WARNING] **6 months later:** The thing that was supposed to sell was compliance, but the hard parts stayed unbuilt. The committed `.bojji/sbom.cdx.json` is dismissed as "a text file a maintainer can rewrite," the keyless signed attestation was never stood up because real air-gap needs self-hosted Fulcio and Rekor (the flagged E3 "M" work), the "as-of" answer for a past release has no dated feed behind it (E6), and internal Artifactory packages surface as "unchecked against OSV" gaps that read as holes rather than honesty. The compliance narrative collapses to "a nicer `npm audit`," which nobody buys.

- **Leading indicator:** the first time an auditor asks "prove this SBOM matches what shipped" or "what did we know at release v2.3", the answer is a roadmap item, not a command; the committed-SBOM tamper question comes up immediately.

> [!TIP] **Hedge:** Before promising "compliance-grade," ship the smallest end-to-end **trust chain** on one real release — a signed attestation binding SBOM to artifact via the CI OIDC identity (drop-in, no stored key) — and validate the SWWC air-gap constraint is actually satisfiable. Treat E3 as **gating for the compliance pitch**, not post-v1. If air-gap keyless signing can't be demonstrated, sell "inventory and exposure," never "compliance."

## Ontology aspect

### P1 — Ownership data rots and misroutes, so trust collapses

> [!WARNING] **6 months later:** The ontology's whole reason to exist is making exposure actionable — "6 products, 3 teams, here's who to notify." But that data needs human input, CODEOWNERS auto-fill is stale and coarse, and because Bojji is "unnoticeable" and non-blocking, nobody is ever prompted to keep ownership current. Teams reorg, people leave, and the first time someone acts on a Bojji contact for an exposed product it routes to someone who left the company. One wrong route and the team stops trusting every answer — a confidently wrong ownership graph is worse than none.

- **Leading indicator:** in the first weeks the share of products with ownership "auto-filled but unconfirmed" or blank stays high, confirmation prompts get dismissed, and a demo answer names a stale or wrong owner.

> [!TIP] **Hedge:** Don't **own** the ownership data — derive it read-only at read time from the org's live sources (CODEOWNERS, GitLab group membership, directory) and always render it with provenance and freshness ("owner per CODEOWNERS, last changed 8 months ago"), never a hand-groomed `bojji.yaml`. Default every contact to a team or role alias, never an individual (the E8 plan), so it degrades gracefully instead of misrouting to a departed person.

### P2 — Extended mode never reaches critical mass: the org graph stays empty

> [!WARNING] **6 months later:** The company-wide ontology only exists in extended mode via the shared index repo, and that's a cold-start coordination problem: the cross-repo "who's exposed org-wide plus who owns it" answer is only valuable once most repos participate, but each repo owner already gets the full default-mode value alone and has zero incentive to be first to opt in. The opt-in, unnoticeable design means nobody is ever pushed to onboard others. Six months in, the index repo holds two or three slices, the composed ontology is effectively empty, and the one genuinely differentiated feature never materialises.

- **Leading indicator:** weeks in, extended mode has been opted into by roughly zero teams beyond Victor, no one creates the conventional `‹org›/bojji-index`, and the index repo has a handful of slices at most.

> [!TIP] **Hedge:** Don't depend on grassroots per-repo opt-in for the org graph. **Seed extended mode centrally** with a one-time read-only crawler that harvests lockfiles across the org's existing GitLab repos and populates the index repo in a single pass (C4-style, no per-repo action required), so the org-wide view is useful on day one. Demonstrate the cross-repo routing value on the whole real SWWC repo set, bootstrapped this way, before betting the feature on organic adoption.

## What this changes

Two hedges are strong enough to reshape the early plan, and both are cheap validations to run **before** building the rest:

- **Week-one differentiator test (P1 audit):** prove product-level reverse blast-radius + ownership routing on the real SWWC v2 lockfile, and confirm it beats GitLab's built-in dependency view. This is the go/no-go.
- **Central seed for extended mode (P2 ontology):** a read-only org crawler, not grassroots opt-in, so the differentiating org graph exists on day one.
