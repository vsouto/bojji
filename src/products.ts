import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Product } from './types.js';

/** Conventional directories that hold releasable units in a JS monorepo. */
const UNIT_DIRS = ['packages', 'libs', 'apps'];

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
}

function readPkg(file: string): PackageJson | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as PackageJson;
  } catch {
    return null;
  }
}

function declaredDepsOf(pkg: PackageJson): Set<string> {
  const out = new Set<string>();
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const) {
    const map = pkg[field];
    if (map) for (const d of Object.keys(map)) out.add(d);
  }
  return out;
}

/**
 * Discover releasable units. The root project is always one. Then we scan
 * conventional unit dirs (packages/, libs/, apps/) for package.json files.
 *
 * Note: we deliberately do NOT trust the root `workspaces` glob as the source of
 * truth. In real Nx-style monorepos it is often stale (SWWC v2 declares
 * `packages/**` while its units live under `libs/` and `apps/`). Convention scan
 * is more robust for M0; the Nx project graph is the M3 upgrade.
 */
export function discoverProducts(repoRoot: string): Product[] {
  const products: Product[] = [];

  const rootPkg = readPkg(join(repoRoot, 'package.json'));
  products.push({
    name: rootPkg?.name ?? '(root)',
    dir: '',
    isRoot: true,
    declaredDeps: rootPkg ? declaredDepsOf(rootPkg) : new Set(),
  });

  for (const unitDir of UNIT_DIRS) {
    const base = join(repoRoot, unitDir);
    if (!existsSync(base)) continue;
    let entries: string[] = [];
    try {
      entries = readdirSync(base, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
    } catch {
      continue;
    }
    for (const name of entries) {
      const pkgFile = join(base, name, 'package.json');
      if (!existsSync(pkgFile)) continue;
      const pkg = readPkg(pkgFile);
      if (!pkg) continue;
      products.push({
        name: pkg.name ?? `${unitDir}/${name}`,
        dir: `${unitDir}/${name}`,
        isRoot: false,
        declaredDeps: declaredDepsOf(pkg),
      });
    }
  }

  return products;
}
