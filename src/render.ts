import type { Exposure, Graph, Product, Freshness, AdvisoryInfo } from './types.js';
import type { CodeownersFile } from './codeowners.js';
import { resolveOwner } from './ownership.js';

export interface Report {
  label: string;
  /** How the advisory was sourced: an OSV lookup or manual --package/--range. */
  source: 'osv' | 'manual';
  advisories: AdvisoryInfo[];
  repoRoot: string;
  graph: Graph;
  products: Product[];
  exposures: Exposure[];
  freshness: Freshness;
  codeowners: CodeownersFile | null;
  /** Last-commit date of the CODEOWNERS file, for the "as of" stamp. */
  codeownersDate: string | null;
}

const pathStr = (e: Exposure): string =>
  e.path.map((n) => (n.isRoot ? '(root)' : `${n.name}@${n.version}`)).join(' → ');

/** One-line owner string for a product, derived live from CODEOWNERS. */
function ownerLine(r: Report, product: Product): string {
  const res = resolveOwner(r.codeowners, product);
  if (res.confidence === 'none') {
    const where = product.isRoot ? 'repo root' : product.dir;
    return `    owner: none — no CODEOWNERS rule covers ${where} (set one to route this)`;
  }
  const asOf = r.codeownersDate ? `, as of ${r.codeownersDate}` : '';
  const flag = res.hasIndividual ? ' [names an individual — prefer a team/role]' : '';
  return `    owner: ${res.owners.join(', ')}  (CODEOWNERS ${res.pattern}${asOf}) [${res.confidence}]${flag}`;
}

function advisoryHeader(r: Report): string[] {
  const lines: string[] = [];
  lines.push(`  ${r.label}`);
  const summary = r.advisories.find((a) => a.summary)?.summary;
  if (summary) lines.push(`  ${summary}`);
  if (r.advisories.length === 0) {
    lines.push(
      r.source === 'osv'
        ? '  (OSV returned no npm-affected packages for this id)'
        : '  (no advisory)',
    );
  } else {
    for (const a of r.advisories) {
      const src = r.source === 'osv' && a.id !== a.cve ? `  [${a.id}]` : '';
      lines.push(`  affected: ${a.packageName}  ${a.rangeText}${src}`);
    }
  }
  return lines;
}

export function renderHuman(r: Report): string {
  const lines: string[] = advisoryHeader(r);
  lines.push('');
  const rootName = r.products.find((p) => p.isRoot)?.name ?? '(root)';

  if (r.advisories.length === 0) {
    lines.push(`Nothing to check.`);
  } else if (r.exposures.length === 0) {
    const names = [...new Set(r.advisories.map((a) => a.packageName))].join(', ');
    lines.push(`Not exposed: no vulnerable copy of ${names} is reachable from ${rootName}.`);
  } else {
    const copies = r.exposures.length;
    lines.push(
      `Exposed: ${rootName} is exposed (${copies} vulnerable ` +
        `cop${copies === 1 ? 'y' : 'ies'} in the tree).`,
    );
    lines.push('');
    for (const e of r.exposures) {
      const via = e.directDep ? e.directDep.name : '(direct)';
      lines.push(`● ${e.culprit.name}@${e.culprit.version}   pulled in via: ${via}`);
      lines.push(`    path: ${pathStr(e)}`);
      for (const p of e.products) {
        lines.push(`    product: ${p.isRoot ? `${p.name} (root project)` : p.name}`);
        lines.push(ownerLine(r, p));
      }
      lines.push('');
    }
  }

  const f = r.freshness;
  const fresh =
    `lockfile @ ${f.head ?? '?'}` +
    (f.lockfileCommit ? `, last touched ${f.lockfileCommit}` : '') +
    (f.lockfileDate ? ` (${f.lockfileDate})` : '');
  const coStamp = r.codeowners
    ? `, ownership from ${r.codeowners.relPath}` + (r.codeownersDate ? ` (as of ${r.codeownersDate})` : '')
    : ', no CODEOWNERS file (ownership unavailable)';
  lines.push(`Freshness: ${fresh}` + (r.source === 'osv' ? ', advisory from OSV (live)' : '') + coStamp);
  lines.push(
    `Scope: this repo only (portable mode). Products discovered: ${r.products.length} ` +
      `(root + ${r.products.length - 1} lib/app units). Attribution follows npm-workspace ` +
      `boundaries in the lockfile; where deps are declared at the root (SWWC v2's Nx setup) ` +
      `exposure lands on the root until the Nx graph lands (M3).`,
  );
  if (r.graph.unresolved > 0) {
    lines.push(
      `Coverage: ${r.graph.unresolved} declared dependency edge(s) were not in the lockfile ` +
        `(e.g. local Nx packages) and were skipped, not assumed clean.`,
    );
  }
  return lines.join('\n');
}

export function renderJson(r: Report): string {
  return JSON.stringify(
    {
      label: r.label,
      source: r.source,
      advisories: r.advisories.map((a) => ({
        id: a.id,
        queried: a.cve,
        package: a.packageName,
        range: a.rangeText,
        summary: a.summary,
      })),
      scope: 'repo',
      root: r.products.find((p) => p.isRoot)?.name ?? '(root)',
      exposed: r.exposures.length > 0,
      exposures: r.exposures.map((e) => ({
        culprit: `${e.culprit.name}@${e.culprit.version}`,
        directDep: e.directDep?.name ?? null,
        path: e.path.map((n) => (n.isRoot ? '(root)' : `${n.name}@${n.version}`)),
        products: e.products.map((p) => {
          const owner = resolveOwner(r.codeowners, p);
          return {
            name: p.name,
            dir: p.dir,
            owners: owner.owners,
            ownerPattern: owner.pattern,
            confidence: owner.confidence,
          };
        }),
      })),
      products_discovered: r.products.length,
      unresolved_edges: r.graph.unresolved,
      freshness: r.freshness,
    },
    null,
    2,
  );
}
