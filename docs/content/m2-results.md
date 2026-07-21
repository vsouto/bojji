# M2 results — ownership on-read

> [!OK] **Shipped 2026-07-20.** Every exposed product now carries an **owner derived live from CODEOWNERS** — never stored, pointing at a team/role, flagged when it's an individual, and honest ("no rule") when nothing covers the path. Full plan: **Plan → Prototype build plan**.

## What changed since M1

M1 named the exposed product. M2 answers *who to call* — the other half of the one thing.

- New `codeowners.ts`: locate CODEOWNERS (root, `.github/`, `.gitlab/`, `docs/`), parse rules (skipping GitLab section headers), and match a product path with gitignore-style globs where the **last matching rule wins**.
- New `ownership.ts`: resolve a product to owners **at read time**, classify each token (a `@group/team` is a team; a bare `@handle` or email is an individual), and set confidence.
- Attribution now terminates at the nearest **local/workspace unit** in the lockfile, so exposure lands on the real releasable unit rather than always the root.
- Nothing is persisted: ownership is looked up live and stamped "as of" the CODEOWNERS commit date.

## The rule (P3, enforced live)

> [!KEY] Stored owners rot the moment someone leaves. So Bojji never stores them — it derives on-read, **prefers a team/role, flags an individual, and refuses to guess**. A confidently wrong owner is worse than none.

| Situation | What Bojji says | Confidence |
|---|---|---|
| Rule names a team (`@acme/frontend-team`) | routes to the team | high |
| Rule names a person (`@alice`) | routes but flags "prefer a team/role" | medium |
| No rule covers the path | "no CODEOWNERS rule — set one to route this" | none |

## Happy path (workspaces fixture)

On `fixtures/demo-monorepo` (a real npm-workspaces repo with team CODEOWNERS), exposure routes per workspace to the right team:

```
$ bojji expose CVE-2021-44906 --dir fixtures/demo-monorepo

Exposed: demo-monorepo is exposed (1 vulnerable copy in the tree).
● minimist@1.2.5   pulled in via: (direct)
    path: @acme/web@1.0.0 → minimist@1.2.5
    product: @acme/web
    owner: @acme/frontend-team  (CODEOWNERS /packages/web/) [high]
```

Forcing the other workspace shows independent routing — `@acme/api` → `@acme/backend-team` — and a bare `@alice` rule renders as `[medium] [names an individual — prefer a team/role]`.

## Honest coverage (real SWWC v2)

SWWC v2's CODEOWNERS scopes only `/apps/storybook/`, so the exposed root gets no guessed owner — it gets the truth:

```
● minimist@1.2.5   pulled in via: commitizen
    path: (root) → commitizen@4.2.4 → minimist@1.2.5
    product: sw-web-components (root project)
    owner: none — no CODEOWNERS rule covers repo root (set one to route this)
```

That "no rule" line is a feature: it's the actionable gap ("add a CODEOWNERS rule") instead of a misroute to whoever a heuristic guessed.

## Next

**M3** — the Nx project graph, so SWWC-style repos (deps at the root, units under `libs/`) attribute exposure to the actual lib and its owner. Then the **go/no-go**: run `bojji expose` beside GitLab's dependency view on the real repo and make the call.

:resolved:
