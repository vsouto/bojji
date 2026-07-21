# M0 results — walking skeleton

> [!OK] **Shipped 2026-07-20** (commit `0ca79f9`). The first milestone runs on the real SWWC v2 lockfile and reconstructs correct exposure paths. Both riskiest unknowns cleared: **the real lockfile parses** and **the transitive path reconstructs**. Full plan: **Plan → Prototype build plan**.

## What it does

`bojji expose` takes a **package name + vulnerable version range** and answers, for a real repo: *which product is exposed, and through what dependency path*. It parses an npm `package-lock.json` (v2/v3), builds the resolved dependency graph, and reverse-traverses from each matched vulnerable copy up to the product that pulls it in.

CVE → package/range resolution (so the bare `bojji expose &lt;CVE&gt;` works) is **M1** — M0 takes the package and range as flags on purpose, to isolate the graph-and-path risk first.

## How it's built

A buildless TypeScript CLI, one runtime dependency (`semver`). `src/*.ts` compiles to `dist/` with `tsc`; nothing to keep alive.

| Module | Job |
|---|---|
| `lockfile.ts` | Parse npm lock v2/v3; build the resolved graph with nearest-ancestor `node_modules` resolution; forward + reverse edges. |
| `expose.ts` | `semver` match; BFS reverse-path from a vulnerable copy to the root; best-effort product attribution. |
| `products.ts` | Discover releasable units by convention scan of `libs/*`, `apps/*`, `packages/*` (plus the root). |
| `freshness.ts` | Git provenance for the lockfile (last-touched commit + HEAD). |
| `render.ts` / `cli.ts` | Human + `--json` output; arg parsing. |

```
npm install && npm run build
node dist/cli.js expose CVE-2021-44906 --package minimist --range "<1.2.6" --dir /path/to/repo
```

## The result on the real wedge repo

Run against the actual **SWWC v2** lockfile (**4,752 packages**, lockfile v3):

```
$ bojji expose CVE-2021-44906 --package minimist --range "<1.2.6" --dir …/sw-web-components

  CVE-2021-44906
  matching minimist in range "<1.2.6"

Exposed: sw-web-components is exposed to minimist (1 vulnerable copy in the tree).

● minimist@1.2.5   pulled in via: commitizen
    path: (root) → commitizen@4.2.4 → minimist@1.2.5
    product: sw-web-components (root project)

Freshness: lockfile @ 646fd7a75, last touched 25951800a (2026-07-07)
Scope: this repo only (portable mode). Products discovered: 9 (root + 8 lib/app units).
```

## Validation (beyond the "done when" bar)

| Check | Result |
|---|---|
| Path correctness | Cross-checked against npm's own resolver (`npm ls`): `minimist@1.2.5` sits under `commitizen`, every other copy is the safe `1.2.8`. Bojji's path matches. |
| No false positives | `tough-cookie &lt;4.1.3` (installed `4.1.4`) → correctly reported **not exposed**. |
| Version discipline | `ws &lt;8.0.0` → only the three `7.5.10` copies matched; the safe `8.13.0` copy was excluded. |
| Multiple routes | The same `ws` ran through **three distinct direct-dep paths** (`@web/dev-server`, `jest-environment-jsdom`, `@vue/cli-service`) — the "which dep drags it in" answer GitLab's flat row can't give. |

## What M0 taught us (real findings, not assumptions)

> [!WARNING] These reshape the later milestones, and are already folded into the plan and specs.

- **The wedge repo's npm `workspaces` glob is stale.** SWWC v2 is an **Nx monorepo**; its root declares `workspaces: ["packages/**"]`, which matches nothing — the real units live under `libs/*` and `apps/*`. Product discovery must be convention/Nx-based, never workspace-glob-based.
- **Dependencies are declared at the root, not per-lib** (~191 root deps; most libs declare `0`). The lockfile is one hoisted root tree. So honest per-product routing needs the **Nx project graph** (which lib imports which) — that is **M3** work. M0 says so in its own output rather than guessing.

## Next

**M1** — wire OSV `/v1/vulns/{id}` so a bare `bojji expose &lt;CVE&gt;` resolves the affected package and ranges automatically. Then **M2** (ownership-on-read from CODEOWNERS + freshness) and **M3** (Nx project graph → true per-lib attribution, and the go/no-go run beside GitLab's dependency view).
