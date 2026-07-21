import type { Exposure, Graph, Product, Freshness, AdvisoryInfo } from './types.js';

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
}

const pathStr = (e: Exposure): string =>
  e.path.map((n) => (n.isRoot ? '(root)' : `${n.name}@${n.version}`)).join(' → ');

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
      const attributed = e.products
        .map((p) => (p.isRoot ? `${p.name} (root project)` : p.name))
        .join(', ');
      lines.push(`    product: ${attributed}`);
      lines.push('');
    }
  }

  const f = r.freshness;
  const fresh =
    `lockfile @ ${f.head ?? '?'}` +
    (f.lockfileCommit ? `, last touched ${f.lockfileCommit}` : '') +
    (f.lockfileDate ? ` (${f.lockfileDate})` : '');
  lines.push(`Freshness: ${fresh}` + (r.source === 'osv' ? ', advisory from OSV (live)' : ''));
  lines.push(
    `Scope: this repo only (portable mode). Products discovered: ${r.products.length} ` +
      `(root + ${r.products.length - 1} lib/app units). Per-lib attribution is best-effort in ` +
      `M0/M1 (deps are declared at the root here); true per-product routing is M3.`,
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
        products: e.products.map((p) => p.name),
      })),
      products_discovered: r.products.length,
      unresolved_edges: r.graph.unresolved,
      freshness: r.freshness,
    },
    null,
    2,
  );
}
