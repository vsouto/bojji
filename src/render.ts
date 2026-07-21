import type { Exposure, Graph, Product, Freshness } from './types.js';

export interface Report {
  label: string;
  pkg: string;
  range: string;
  repoRoot: string;
  graph: Graph;
  products: Product[];
  exposures: Exposure[];
  freshness: Freshness;
}

const pathStr = (e: Exposure): string =>
  e.path.map((n) => (n.isRoot ? '(root)' : `${n.name}@${n.version}`)).join(' → ');

export function renderHuman(r: Report): string {
  const lines: string[] = [];
  const rootProduct = r.products.find((p) => p.isRoot);
  const rootName = rootProduct?.name ?? '(root)';

  lines.push(`  ${r.label}`);
  lines.push(`  matching ${r.pkg} in range "${r.range}"`);
  lines.push('');

  if (r.exposures.length === 0) {
    lines.push(`Not exposed: no package matching ${r.pkg}@"${r.range}" is reachable from ${rootName}.`);
  } else {
    // Group exposures by attributed product name (M0: usually the root project).
    const exposedNames = new Set<string>();
    for (const e of r.exposures) for (const p of e.products) exposedNames.add(p.name);
    lines.push(
      `Exposed: ${rootName} is exposed to ${r.pkg} (${r.exposures.length} vulnerable ` +
        `cop${r.exposures.length === 1 ? 'y' : 'ies'} in the tree).`,
    );
    lines.push('');
    for (const e of r.exposures) {
      const via = e.directDep ? e.directDep.name : '(direct)';
      lines.push(`● ${e.culprit.name}@${e.culprit.version}   pulled in via: ${via}`);
      lines.push(`    path: ${pathStr(e)}`);
      const attributed = e.products.map((p) => (p.isRoot ? `${p.name} (root project)` : p.name)).join(', ');
      lines.push(`    product: ${attributed}`);
      lines.push('');
    }
  }

  const f = r.freshness;
  const fresh =
    `lockfile @ ${f.head ?? '?'}` +
    (f.lockfileCommit ? `, last touched ${f.lockfileCommit}` : '') +
    (f.lockfileDate ? ` (${f.lockfileDate})` : '');
  lines.push(`Freshness: ${fresh}`);
  lines.push(
    `Scope: this repo only (portable mode). Products discovered: ${r.products.length} ` +
      `(root + ${r.products.length - 1} lib/app units). Per-lib attribution is best-effort in ` +
      `M0 (deps are declared at the root here); true per-product routing is M3.`,
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
      package: r.pkg,
      range: r.range,
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
