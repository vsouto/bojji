# Adversarial — pre-mortem

> [!WARNING] **Archived — worked analysis, superseded.** This pre-mortem did its job: every hedge below has already been folded into the live plan. The four failure modes became the pivots **P1–P4** in **Confirmed specs → Pivots**, and their conclusions are baked into **Plan → Focus (the business plan)** (SBOM is input, product-level exposure + ownership routing, derive ownership on-read, central seed for extended mode). Kept for provenance. **The current direction lives on those two pages, not here.**

> [!NOTE] A pre-mortem run **before** implementation. The frame: *"It's 6 months later. Bojji has failed. Why?"* Reasoned through orthogonal lenses — the developer who must adopt it, the buyer who must justify it, the incumbent competitor, and the auditor who must trust it — then ranked. The top two most-probable failures for each of the two aspects.

> [!KEY] **The single biggest way Bojji dies:** the audit product is a thinner version of what the first customer's own platform already ships. SWWC v2 is on self-hosted GitLab, which already emits CycloneDX SBOMs, scans dependencies, and shows a group-wide dependency list — and npm has native `npm sbom` plus free `npm audit`. With EU CRA's SBOM mandate not binding until Dec 2027, there's no forcing function to adopt a solo-maintained tool over a vendor-supported feature already turned on. Bojji never clears the "why not just use what we have" bar, and the org-wide ontology that would have differentiated it never reaches critical mass.

## Damage at a glance

| Failure | Aspect | Damage to the product |
|---|---|---|
| P1 — Commoditised by GitLab / npm | Audit | ●●●●● 5 / 5 |
| P2 — Not actually compliance-grade | Audit | ●●●●○ 4 / 5 |
| P1 — Ownership data rots and misroutes | Ontology | ●●●●○ 4 / 5 |
| P2 — Extended mode never reaches critical mass | Ontology | ●●●○○ 3 / 5 |

## Audit aspect

### P1 — Commoditised by the platform the customer already runs

**Damage to the product: ●●●●● 5 / 5** — existential. If this happens there is no product: it's a worse copy of a feature the customer already has for free, with vendor support.

> [!WARNING] **6 months later:** The first demo to SWWC's security team gets one question — "how is this different from GitLab dependency scanning and `npm audit`?" — and there's no crisp answer, because GitLab Ultimate already produces CycloneDX SBOMs, matches CVEs, and shows a group-wide dependency list, on-prem, with vendor support. Bojji's buildless offline SBOM is strictly less than what the CI pipeline already emits, and a champion can't justify introducing an unsupported personal project to replace a feature that's already on and paid for. It stays installed only in Victor's local clone and never becomes a team decision.

- **Leading indicator:** in the first weeks, every conversation opens with "doesn't GitLab/GitHub/npm already do this?", nobody outside Victor installs it, and the SBOM output is indistinguishable from what CI already generates.

```
What GitLab / npm already give you (free, supported, on-prem):
    SBOM   ·   CVE matching   ·   repo dependency list
    └─ Bojji copying this = "me too", and strictly less   ──►   dies

The ONE thing they answer poorly   ──►   lead with ONLY this:
    "which shipped PRODUCT has this vulnerability, and who do I notify?"
    + works air-gapped, with zero infrastructure to stand up
```

> [!TIP] **Hedge (in plain terms):** Don't try to make SBOMs — GitLab and npm already do that for free. Take *their* SBOM as the input, and put all your weight on the one thing they answer poorly: **"which of our shipped products has this vulnerability, and who do I tell?"** Build only that, and test it in **week one** on the real SWWC v2 project. If it doesn't clearly beat GitLab's built-in list, stop before building anything else.

### P2 — Not actually compliance-grade: the auditor won't trust it

**Damage to the product: ●●●●○ 4 / 5** — kills the paid "compliance" wedge. The tool survives, but only as a weaker "inventory and exposure" product with no premium reason to buy.

> [!WARNING] **6 months later:** The thing that was supposed to sell was compliance, but the hard parts stayed unbuilt. The committed `.bojji/sbom.cdx.json` is dismissed as "a text file a maintainer can rewrite," the keyless signed attestation was never stood up because real air-gap needs self-hosted Fulcio and Rekor (the flagged E3 "M" work), the "as-of" answer for a past release has no dated feed behind it (E6), and internal Artifactory packages surface as "unchecked against OSV" gaps that read as holes rather than honesty. The compliance narrative collapses to "a nicer `npm audit`," which nobody buys.

- **Leading indicator:** the first time an auditor asks "prove this SBOM matches what shipped" or "what did we know at release v2.3", the answer is a roadmap item, not a command; the committed-SBOM tamper question comes up immediately.

```
Weak claim:   .bojji/sbom.cdx.json  alone
              └─►  auditor: "a maintainer could have edited this"        ✗

Trust chain:  SBOM  +  build hash  ──sign with CI identity (no stored key)──►
              anyone can verify it matches what shipped                   ✓
              ( build THIS before ever saying the word "compliance" )
```

> [!TIP] **Hedge (in plain terms):** Don't say "compliance-grade" until you can prove it on one real release. The proof is a **signed receipt** that ties the SBOM to the exact build, using the CI system's own identity so there's no password to store. Build that receipt first, and check it actually works inside Siemens' air-gapped setup. If keyless signing can't work there, sell the honest smaller claim — "inventory and exposure" — and never say "compliance."

## Ontology aspect

### P1 — Ownership data rots and misroutes, so trust collapses

**Damage to the product: ●●●●○ 4 / 5** — one wrong owner poisons trust in *every* answer, not just ownership. The differentiator becomes a liability.

> [!WARNING] **6 months later:** The ontology's whole reason to exist is making exposure actionable — "6 products, 3 teams, here's who to notify." But that data needs human input, CODEOWNERS auto-fill is stale and coarse, and because Bojji is "unnoticeable" and non-blocking, nobody is ever prompted to keep ownership current. Teams reorg, people leave, and the first time someone acts on a Bojji contact for an exposed product it routes to someone who left the company. One wrong route and the team stops trusting every answer — a confidently wrong ownership graph is worse than none.

- **Leading indicator:** in the first weeks the share of products with ownership "auto-filled but unconfirmed" or blank stays high, confirmation prompts get dismissed, and a demo answer names a stale or wrong owner.

```
OWN the data:    type owners once
                 ──► reorg / people leave ──► stale ──► wrong email ──► trust gone

DERIVE at read:  ask CODEOWNERS + GitLab groups live, each time
                 ──► always current, shows "as of ..." ──► stays trusted
```

> [!TIP] **Hedge (in plain terms):** Don't *store* owner names in Bojji — stored data goes stale the moment someone leaves or a team reorganises. Instead, look owners up **live, at the moment of the question**, from the sources the company already keeps current (CODEOWNERS, GitLab groups, the staff directory), and always show how fresh it is ("owner per CODEOWNERS, last changed 8 months ago"). Point at a **team or role, never a single person**, so a wrong answer fails softly instead of emailing someone who left.

### P2 — Extended mode never reaches critical mass: the org graph stays empty

**Damage to the product: ●●●○○ 3 / 5** — kills the org-wide differentiator and the platform vision, but the default portable-mode value survives, so the product limps on as a per-repo tool.

> [!WARNING] **6 months later:** The company-wide ontology only exists in extended mode via the shared index repo, and that's a cold-start coordination problem: the cross-repo "who's exposed org-wide plus who owns it" answer is only valuable once most repos participate, but each repo owner already gets the full default-mode value alone and has zero incentive to be first to opt in. The opt-in, unnoticeable design means nobody is ever pushed to onboard others. Six months in, the index repo holds two or three slices, the composed ontology is effectively empty, and the one genuinely differentiated feature never materialises.

- **Leading indicator:** weeks in, extended mode has been opted into by roughly zero teams beyond Victor, no one creates the conventional `‹org›/bojji-index`, and the index repo has a handful of slices at most.

```
Wait for opt-in:    repo?  repo?  repo?
                    ──► index ≈ empty ──► org-wide view worthless (nobody goes first)

Seed it centrally:  one read-only crawler reads every repo's lockfile, one pass
                    ──► index full ──► org-wide view works on day 1
```

> [!TIP] **Hedge (in plain terms):** Don't wait for teams to opt in one by one — the org-wide view is worthless until most are in, and nobody wants to be first. Instead, **fill it yourself once**: a read-only crawler reads every repo's lockfile across the company's GitLab in a single pass and populates the shared index. The org graph is then useful on day one, and you can demo the cross-repo value on the whole real SWWC repo set — with no one having to lift a finger.

## What this changes

Two hedges are strong enough to reshape the early plan, and both are cheap validations to run **before** building the rest:

- **Week-one differentiator test (P1 audit):** prove product-level reverse blast-radius + ownership routing on the real SWWC v2 lockfile, and confirm it beats GitLab's built-in dependency view. This is the go/no-go.
- **Central seed for extended mode (P2 ontology):** a read-only org crawler, not grassroots opt-in, so the differentiating org graph exists on day one.
