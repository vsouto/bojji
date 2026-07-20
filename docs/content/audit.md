# Audit & compliance

> [!NOTE] Open spec questions about how Bojji serves audits and how it earns its place in enterprise projects (like SWWC v2, which is already live). Some answers are decided; the ones still being weighed are flagged.

---

## Q1 — What is the audit artifact in each repo?

First, the split that governs everything (from the confirmed **"persist structure + ownership, compute exposure on-read"** decision):

- **Persisted, git-versioned in `.bojji/` (the truth):** `sbom.cdx.json` (CycloneDX, generated buildless from the lockfile) and `product.yaml` (product + owning team + contacts).
- **Derived, never stored:** the exposure/vulnerability report — computed on read from `SBOM + current OSV feed + VEX`. Not stored because (a) it goes stale the moment a new CVE lands, and (b) a stored list of holes is exactly what we refuse to keep.

So the durable artifact is the **SBOM**. The remaining question is *how it is emitted at release*, and there are two options:

- **Option A — commit the SBOM into the repo** (`.bojji/sbom.cdx.json`, versioned; git history is the audit trail).
- **Option B — emit a signed release attestation** (the SBOM bound to the built artifact, cryptographically signed via keyless/OIDC; not committed).

> [!DECISION] **B (signed release attestation) is confirmed.** A (commit the SBOM into the repo) is still being weighed — see the matrix and the note below.

### Tradeoff matrix — A vs B

| Dimension | A — commit SBOM in repo | B — signed release attestation |
|---|---|---|
| What it proves | What the repo *declares* it depends on, at this commit (intent) | What *actually shipped* in a release, bound to the built artifact (fact) |
| Tamper-evidence | Git history (a maintainer can rewrite it) | Cryptographic signature — strong |
| PR-review value | High — dependency changes appear as an SBOM diff during review | None — produced after the build |
| Present between releases | Yes — exists on every commit | Only at release time |
| CI friction | Higher — a bot commits back to a protected branch | Lower — attach + sign as a release step, no commit |
| Air-gap / offline | Fine | Fine (sign and verify offline) |
| Audit trail | `git log` | Release assets, optionally a transparency log |
| Enterprise / EU CRA fit | Nice-to-have (governance) | **What auditors actually ask for** |
| Decision | value TBD | **Confirmed** |

### So, is A worth it (on top of B)?

A's *unique* value is two things: (1) dependency changes get **reviewed at PR time** as a readable SBOM diff, and (2) an SBOM is **always present**, even for a repo that rarely cuts releases. For a live library like SWWC v2, where every dependency bump matters, that is real value. For a project that only needs proof of what shipped, A is redundant with B.

> [!TIP] **Proposed middle path (pending your call):** keep A but make it *cheap* — generate `.bojji/sbom.cdx.json` via a local command / pre-commit hook rather than a CI bot-commit, so we get PR-time visibility without the protected-branch friction. B stays the authoritative release proof.

---

## Q2 — What the index repo stores & extends (extended mode)

The index composes the **company-wide graph** from each project's slice, joining on shared keys (**purl / package, product, team**). It stores only structure + ownership:

- **Structure:** products, packages (`name@version` / purl), repositories, and dependency edges (`produced_from`, `depends_on` direct/transitive).
- **Ownership:** teams, people, contacts, `owned_by` / `contact` edges.
- **Join keys** so slices snap together, plus (optionally) a rebuildable composed index (e.g. a SQLite artifact) for fast whole-org queries.
- **Not stored:** computed exposure (on-read), and live/volatile data (incidents, open PRs, deployments — fetched on demand).

**What it extends** (answers no single repo can give), served via MCP: whole-org reverse blast-radius ("who depends on `X@version`" / "who is exposed to CVE-Y"), ownership routing ("who to contact"), cross-repo transitive traversal, and org inventory / version drift.

### The MCP server (we need one — status: concept only)

Plan 004 specifies MCP at the concept level: *"a local MCP server that reads the same index repo — no separate backend."* That is deliberate (no central service), but the server itself is **not yet specd as a component**. The intended design:

- **One server, shipped with Bojji** (e.g. `bojji mcp`), a **local process** — not a hosted service.
- **Two data sources by mode:** in **default** mode it reads the local `.bojji/` slice (single project); in **extended** mode it reads the **index repo** (whole org). Same tools, different source.
- Reads the git index directly (clone/pull + in-memory graph); no database to run.

> [!WARNING] **Open item — write the MCP server spec:** its tool set (`expose <CVE>`, `find_dependents`, `find_owner`, `impact_analysis`), transport, how it loads/caches the git index, and the default-vs-extended source switch.

---

## Q3 — What audits require for enterprise use

Many of these are already Bojji's strengths; a few are gaps to close. The ✅ items are decided; the ⚠️ items are explained below the table so they're easy to digest.

| Requirement | Why auditors care | Status |
|---|---|---|
| On-prem / air-gap / no phone-home | Data can't leave the perimeter; must run offline | ✅ Confirmed (the wedge); OSV mirrorable |
| Standards conformance (CycloneDX + VEX, EU CRA elements) | A valid, recognised format their tools accept | ✅ format chosen · ⚠️ CRA element mapping |
| Provenance / signed attestation | Proof the SBOM matches what actually shipped | ⚠️ Gap |
| Completeness & honest coverage | Full tree; blind spots declared, not hidden | ⚠️ To build |
| Reproducibility / determinism | Same input → same graph; rebuildable | ✅ deterministic merge, no ML score |
| Audit trail & "as-of" | What did we know at release vs now | ✅ git history · ⚠️ as-of queries |
| Access control & no secrets | SSO/RBAC; least privilege; keyless | ✅ private repo + org SSO/RBAC, OIDC |
| Data minimisation / PII | Store the minimum; handle contact PII | ✅ structure-only · ⚠️ PII note |
| VEX / false-positive control | Not drowning auditors in un-triaged findings | ✅ VEX first-class · ⚠️ authoring flow |
| Machine-readable exports | Feed their GRC / scanner tooling | ⚠️ Gap |
| Non-blocking adoption | Can't break a live CI/release pipeline | ✅ never blocks; buildless |
| Monorepo + internal registries | SWWC v2 = npm workspaces + Artifactory | ⚠️ Confirm |

### The pending items, explained

**1. Provenance / signed attestation.**
A committed SBOM says *"here is what we think we depend on."* An attestation is a signed receipt that says *"this exact list belongs to this exact released build, and here is cryptographic proof it wasn't altered."* Auditors don't just want the list — they want proof the list matches what shipped.

```
build ──▶ produces: artifact  +  SBOM
                         │
                         ▼
              sign( hash(artifact) + SBOM )   ← keyless / OIDC, no stored key
                         │
                         ▼
              attestation attached to the release
                         │
   auditor / CI ─────────┴────▶ verify signature → "trusted, and it's the real build"
```

**2. Completeness & honest coverage.**
An SBOM that *silently* omits something is worse than one that says "I couldn't resolve X." Trust comes from declaring blind spots. Bojji must list what it scanned and explicitly flag what it couldn't (a private registry it couldn't reach, a lockfile it couldn't parse) — never drop quietly.

**3. Audit trail & "as-of" (time-travel).**
There are two different audit questions, and we must answer both:

```
"Are we exposed today?"            → today's SBOM  +  today's CVE feed
"What did we know when we shipped  → the SBOM as it was at release v2.3
 v2.3 last quarter?"                  +  the CVE feed as it was then (or now)
```

Because exposure is computed live, "as-of" means pairing a **past SBOM** (git history already gives us this) with a **dated feed**. This is what lets us reconstruct "what we knew then," which auditors ask for after an incident.

**4. Machine-readable exports.**
Auditors and their GRC/scanner tools ingest specific formats. Bojji should export a defined set — **CycloneDX** (the SBOM), **VEX** (exploitability decisions), **SARIF** (findings for security tooling), and a **CRA-style report**. The open decision is confirming exactly which formats to support first.

**5. Monorepo + internal registries.**
SWWC v2 is an npm **workspaces monorepo** that also pulls **internal** packages from Artifactory. Bojji must resolve workspace-local packages correctly and give internal packages stable purls so they join the graph like any other node. Confirm this works before the first real run.

**6. PII handling for contacts.**
`product.yaml` holds contact people (names, emails) — that is PII under GDPR. Keep it minimal, document handling/retention, and note that it lives in-perimeter, which already helps.

### The three concrete gaps

Stripping the table down, the enterprise work clusters into three adds — none of which block M0: **signed attestations** (Q1 option B, being built), **as-of / time-travel queries**, and an agreed **export-format set**.
