# M1 results — CVE via OSV

> [!OK] **Shipped 2026-07-20.** `bojji expose &lt;CVE&gt;` now works with **no manual flags** — it resolves the affected npm package(s) and version ranges from [OSV](https://osv.dev) live, then reuses M0's graph + path reconstruction. Full plan: **Plan → Prototype build plan**.

## What changed since M0

M0 took the vulnerable package and range as flags to isolate the graph risk. M1 removes that: give it a **CVE or GHSA id** and OSV supplies the package and ranges.

- New `osv.ts`: fetch `GET /v1/vulns/{id}`, extract npm-affected packages, convert OSV SEMVER events (`introduced` / `fixed` / `last_affected`) into a version matcher, with enumerated `versions[]` as a fallback.
- The matcher and traversal from M0 are unchanged — M1 just feeds them a resolved advisory instead of a flag.
- `--package` / `--range` remain as an **offline override**; `--offline` refuses to call the network.

## The OSV finding (baked into M1)

> [!NOTE] A CVE record on OSV is often **ecosystem-agnostic** (`package: null`, sourced from NVD). The npm ranges live in its **GHSA alias**. So M1 follows aliases: if the CVE's own record carries no npm data, it fetches the `GHSA-…` alias and reads the ranges there. A bare CVE id resolves either way.

## Validated end-to-end on the real SWWC v2 lockfile

| CVE | OSV resolved | Result | Why it's a good test |
|---|---|---|---|
| CVE-2021-44906 | minimist, two ranges | Exposed: `minimist@1.2.5` via `commitizen` | CVE record had no npm data; resolved through its GHSA alias. |
| CVE-2024-37890 | ws, four ranges | Exposed: `ws@8.13.0` via `puppeteer` | Four disjoint SEMVER intervals across major lines; matcher flagged the 8.x copy and **excluded** the fixed `7.5.10` copies. |
| CVE-2023-26136 | tough-cookie, one range | **Not exposed** | Repo ships the patched `4.1.4`; correct negative, no false positive. |

```
$ bojji expose CVE-2024-37890 --dir …/sw-web-components

  CVE-2024-37890
  ws affected by a DoS when handling a request with many HTTP headers
  affected: ws  >=8.0.0 <8.17.1  [GHSA-3h5v-q93c-6h6q]

Exposed: sw-web-components is exposed (1 vulnerable copy in the tree).
● ws@8.13.0   pulled in via: puppeteer
    path: (root) → puppeteer@20.7.3 → puppeteer-core@20.7.3 → ws@8.13.0

Freshness: lockfile @ 646fd7a75, last touched 25951800a (2026-07-07), advisory from OSV (live)
```

Also verified: GHSA ids resolve directly, `--json` output is well-formed, the `--package/--range` offline override still works, and `--offline` without flags fails cleanly.

## Next

**M2** — ownership on-read: parse CODEOWNERS, glob-match each product's path to a team/role (never a person), stamp freshness. **M3** — the Nx project graph for true per-lib attribution, then the go/no-go beside GitLab's dependency view.

:resolved:
