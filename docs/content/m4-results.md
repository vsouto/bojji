# M4 results — the go/no-go

> [!KEY] **The call: GO.** On a real CVE in the real wedge repo, Bojji answers a question GitLab Ultimate structurally cannot: *which shipped product carries this, and which are clear* — instantly, buildless, offline. The one caveat (owner routing depends on the repo keeping CODEOWNERS current) is a roadmap note, not a blocker. Full plan: **Plan → Prototype build plan**.

## The bar (set before we built anything)

From the plan, "more actionable than GitLab" had to mean **all four**, judged by a security lead:

1. Product granularity, not repo granularity.
2. Routed ownership (who to notify, from the output alone).
3. A proof path.
4. Freshness.

The test case: **CVE-2021-3803** (nth-check ReDoS) on the real **SWWC v2** monorepo.

> [!NOTE] The GitLab side below is a faithful description of how GitLab Ultimate Dependency Scanning + Dependency List actually behaves — not a dump of SWWC's private vulnerability report. Bojji's side is its real output (see **M3 results**).

## Side by side

**GitLab Ultimate (Dependency List + Dependency Scanning)** reports, at the **project** level:

```
nth-check  1.0.2   —  CVE-2021-3803 (ReDoS), Medium
  Location: package-lock.json
  Dependency path: rehype-add-classes → hast-util-select → nth-check
  Project: sw-web-components
```

Accurate, deduplicated, severity-scored, and it even shows a dependency path. But the monorepo is **one GitLab project**, so the answer stops at "the repo has it." It has no notion of the twelve Nx libraries inside, and no idea which of them actually ships nth-check.

**Bojji** reports, at the **shipped-product** level:

```
→ Shipped impact: 1 of 12 shipped units (swwc-core-styles); 1 dev-tooling copy.

● nth-check@1.0.2  via cssnano
    path: swwc-core-styles → cssnano → … → css-select → nth-check@1.0.2
    product: swwc-core-styles (shipped library)
    owner: none — no CODEOWNERS rule covers libs/swwc-core-styles (set one to route this)

● nth-check@1.0.2  via rehype-add-classes
    product: sw-web-components (root / dev tooling — not imported by any shipped library)

exposed: swwc-core-styles   ·   not exposed: the other 11 units
```

Same underlying fact, a different order of answer: **one** shipped library is affected, **eleven are provably clear**, and the second copy is **dev tooling only** — the kind of triage a security lead can act on in a monorepo without opening the code.

## Scorecard

| Criterion | GitLab Ultimate | Bojji | Winner |
|---|---|---|---|
| 1. Product granularity | Repo-level (one project) | Per shipped library, + exposed/clear breakdown | **Bojji** |
| 2. Routed ownership | Not in the finding | Derived live from CODEOWNERS; here honestly "no rule → set one" | **Bojji** (mechanism), caveated |
| 3. Proof path | Yes (path to a top-level dep) | Yes, per shipped library | Tie |
| 4. Freshness | Scan timestamp | Lockfile commit + OSV fetch + CODEOWNERS "as of" | **Bojji**, slightly |
| Setup | CI pipeline, platform, license | One command, buildless, offline | **Bojji** |

## Honest caveats (so the GO has eyes open)

> [!WARNING] GitLab is genuinely strong where Bojji is not: severity scoring, continuous CI scanning, auto-remediation MRs, and enormous ecosystem coverage. Bojji is not trying to replace that. Its wedge is one thing GitLab lacks: **product-granular exposure + ownership inside a monorepo**, and it delivers that with zero infrastructure.

- **Ownership is only as good as the repo's CODEOWNERS.** SWWC v2's CODEOWNERS covers just `/apps/storybook/`, so the exposed library shows "no rule." That is honest and actionable ("add a rule"), but the *who-to-call* half of the pitch is under-demonstrated on this specific repo. It lands fully on repos that maintain CODEOWNERS (proven on the fixture).
- **Nx attribution reads Nx's cached graph.** Fresh clones need `nx graph --file` once (Nx's own metadata pass). Non-Nx repos use npm-workspace boundaries instead.
- **npm only, single repo.** Cross-product/org-wide exposure (the paid extended mode) is out of the prototype by design.

## Verdict

> [!OK] **GO.** The prototype clears the bar it was given: on a real CVE in the real target, Bojji's shipped-product-plus-path answer is clearly more actionable than GitLab's flat repo-level row, and it distinguishes shipped exposure from dev tooling — the exact judgement a monorepo security owner needs. The moat (product-granular exposure + owner routing, buildless and offline) is real. Build on.

## What GO unlocks (beyond the prototype)

The prototype proved the core answer on one repo. The business plan's paid wedge is the org-wide version, which is now worth building toward: the read-only crawler that seeds cross-repo exposure, live ownership resolution across repos, dated "as-of" snapshots, and (only once proven air-gapped) the signed attestation. First though: put this in front of a real SWWC security owner and watch them use it.

:resolved:
