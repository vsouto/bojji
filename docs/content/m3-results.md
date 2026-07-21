# M3 results — per-library attribution (Nx)

> [!OK] **Shipped 2026-07-20.** On the real SWWC v2 monorepo, a root-level vulnerability is now routed to the **shipped library** that actually imports it — or flagged as **root/dev tooling** when no library does — with an exposed / not-exposed breakdown across every unit. This is the go/no-go capability. Full plan: **Plan → Prototype build plan**.

## The problem M3 solves

SWWC v2 is an Nx monorepo: dependencies are declared at the **root**, and the libraries under `libs/` share one hoisted `node_modules`. So M0–M2 could only attribute a root-level vulnerability to the root. GitLab has the same limit — it says "the repo depends on vulnerable X," one flat row, and stops there.

The missing link is *which library imports X*. Nx already computes that (it has to, in order to build): its project graph records, per library, the npm packages that library imports.

## How it works

- New `nx.ts`: read Nx's own cached project graph (`.nx/cache/project-graph.json`, or `--nx-graph &lt;file&gt;`). For each shipped unit it yields the npm packages that unit imports directly.
- Compose with the lockfile: a library is exposed to vulnerability **V** when V is in the transitive closure (from the lockfile) of a package that library imports. The proving path is `library → imported dep → … → V`.
- If **no** shipped library reaches V, the exposure is labelled **root / dev tooling** — real, but not shipped.
- `--no-nx` falls back to root attribution; non-Nx repos are unaffected (npm-workspaces attribution from M2 still applies).

> [!NOTE] This uses only dependency metadata (Nx's graph + the lockfile). It is **not** code-usage analysis — Bojji says a library *ships* a vulnerable package on a real dependency path, never that a specific line "breaks." Exposure, not breakage.

## Proven on a real CVE (CVE-2021-3803, nth-check)

`nth-check@1.0.2` (ReDoS, affected `&gt;=0 &lt;2.0.1`) appears twice in SWWC v2 — and M3 tells the two apart:

```
$ bojji expose CVE-2021-3803 --dir …/sw-web-components

Exposed: sw-web-components is exposed (2 vulnerable copies in the tree).

● nth-check@1.0.2   pulled in via: rehype-add-classes
    path: (root) → rehype-add-classes@1.0.0 → hast-util-select@1.0.1 → nth-check@1.0.2
    product: sw-web-components (root / dev tooling — not imported by any shipped library)

● nth-check@1.0.2   pulled in via: cssnano
    path: swwc-core-styles → cssnano@4.1.11 → … → css-select@2.1.0 → nth-check@1.0.2
    product: swwc-core-styles (shipped library)
    owner: none — no CODEOWNERS rule covers libs/swwc-core-styles (set one to route this)

Shipped units (12 via Nx graph):
    exposed: swwc-core-styles
    not exposed: sample-angular, sample-lit, sample-native, sample-react, sample-vue,
                 storybook, swwc, swwc-angular, swwc-core-js, swwc-react, swwc-vue
```

One vulnerable package, two very different answers: a **dev-tooling** copy the team can de-prioritise, and a **shipped-library** copy in `swwc-core-styles` that genuinely reaches customers. That distinction is the whole product.

## Contrast: a pure-tooling vuln

`bojji expose CVE-2021-44906` (minimist, via `commitizen`) lands entirely in root/dev tooling — **all 12 shipped units clear**. GitLab would still just say "repo depends on vulnerable minimist."

## Next

**M4 — the go/no-go.** Run `bojji expose` beside GitLab Ultimate's dependency view on the real SWWC v2 repo and make the call: does the shipped-library-plus-path answer read as clearly more actionable than the flat list? If yes, the wedge is real.

:resolved:
