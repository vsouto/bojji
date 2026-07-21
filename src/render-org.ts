import type { OrgReport, RepoResult, OrgExposure } from './compose.js';
import type { PkgNode } from './types.js';

const nodeLabel = (n: PkgNode): string => (n.isRoot ? '(root)' : n.version ? `${n.name}@${n.version}` : n.name);
const pathStr = (e: OrgExposure): string => e.path.map(nodeLabel).join(' → ');

function ownerStr(e: OrgExposure, codeownersDate: string | null): string {
  const o = e.owner;
  if (o.confidence === 'none') return 'owner: none — no CODEOWNERS rule (set one to route this)';
  const asOf = codeownersDate ? `, as of ${codeownersDate}` : '';
  const flag = o.hasIndividual ? ' [names an individual — prefer a team/role]' : '';
  return `owner: ${o.owners.join(', ')}  (CODEOWNERS ${o.pattern}${asOf}) [${o.confidence}]${flag}`;
}

function advisoryHeader(r: OrgReport): string[] {
  const lines = [`  ${r.input.label}`];
  const summary = r.input.advisories.find((a) => a.summary)?.summary;
  if (summary) lines.push(`  ${summary}`);
  for (const a of r.input.advisories) {
    const src = r.input.source === 'osv' && a.id !== a.cve ? `  [${a.id}]` : '';
    lines.push(`  affected: ${a.packageName}  ${a.rangeText}${src}`);
  }
  if (r.input.advisories.length === 0) lines.push('  (no npm-affected packages for this id)');
  return lines;
}

function repoBlock(repo: RepoResult): string[] {
  const stamp =
    `[${repo.fidelity}]  slice` +
    (repo.commit ? ` @ ${repo.commit}` : '') +
    `, emitted ${repo.generatedAt}`;
  const lines = [`▸ ${repo.repo}   ${stamp}`];
  for (const e of repo.exposures) {
    const via = e.directDep ? e.directDep.name : '(direct)';
    const kind =
      e.attribution === 'nx-lib'
        ? ' (shipped library)'
        : e.attribution === 'root-tooling'
          ? ' (root / dev tooling)'
          : e.product.isRoot
            ? ' (root project)'
            : '';
    lines.push(`  ● ${e.product.name}${kind}`);
    lines.push(`      ${ownerStr(e, repo.codeownersDate)}`);
    lines.push(`      ${e.culprit.name}@${e.culprit.version}  via ${via}`);
    lines.push(`      path: ${pathStr(e)}`);
  }
  return lines;
}

export function renderOrgHuman(r: OrgReport): string {
  const lines = advisoryHeader(r);
  lines.push('');

  const exposedRepos = r.repos.filter((repo) => repo.exposures.length > 0);
  const cleanRepos = r.repos.filter((repo) => repo.exposures.length === 0);
  const productCount = exposedRepos.reduce((n, repo) => n + repo.exposures.length, 0);
  const pkgs = [...new Set(r.input.advisories.map((a) => a.packageName))].join(', ') || 'the advisory';

  if (r.input.advisories.length === 0) {
    lines.push('Nothing to check (no affected npm packages resolved).');
  } else if (exposedRepos.length === 0) {
    lines.push(`Org exposure: no vulnerable copy of ${pkgs} is reachable in any of ${r.repos.length} repo(s).`);
  } else {
    lines.push(
      `Org exposure: ${pkgs} reaches ${exposedRepos.length} of ${r.repos.length} repo(s) — ` +
        `${productCount} exposed product${productCount === 1 ? '' : 's'}.`,
    );
    lines.push('');
    for (const repo of exposedRepos) lines.push(...repoBlock(repo), '');
  }

  lines.push(`Clean repos (${cleanRepos.length}): ${cleanRepos.length ? cleanRepos.map((c) => c.repo).join(', ') : 'none'}`);

  const emitted = [...new Set(r.repos.map((repo) => repo.generatedAt))].sort();
  const asOf = r.asOf ? ` · index as of ${r.asOf}` : '';
  lines.push(
    `Freshness: ${r.repos.length} slice(s), emitted ${emitted.join(' / ')}` +
      (r.input.source === 'osv' ? ' · advisory from OSV (live)' : '') +
      ' · ownership per each slice’s CODEOWNERS at crawl' +
      asOf,
  );
  lines.push(`Scope: org-wide (extended mode), ${r.repos.length} repo(s) in index.`);
  return lines.join('\n');
}

export function renderOrgJson(r: OrgReport): string {
  return JSON.stringify(
    {
      label: r.input.label,
      source: r.input.source,
      scope: 'org',
      asOf: r.asOf,
      advisories: r.input.advisories.map((a) => ({
        id: a.id,
        queried: a.cve,
        package: a.packageName,
        range: a.rangeText,
        summary: a.summary,
      })),
      repos: r.repos.map((repo) => ({
        slug: repo.slug,
        repo: repo.repo,
        commit: repo.commit,
        generatedAt: repo.generatedAt,
        fidelity: repo.fidelity,
        exposed: repo.exposures.length > 0,
        exposures: repo.exposures.map((e) => ({
          product: e.product.name,
          dir: e.product.dir,
          attribution: e.attribution,
          culprit: `${e.culprit.name}@${e.culprit.version}`,
          directDep: e.directDep?.name ?? null,
          path: e.path.map(nodeLabel),
          owners: e.owner.owners,
          ownerPattern: e.owner.pattern,
          confidence: e.owner.confidence,
        })),
      })),
    },
    null,
    2,
  );
}
