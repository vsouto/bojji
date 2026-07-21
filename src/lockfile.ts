import { readFileSync } from 'node:fs';
import type { Graph, PkgNode, Edge } from './types.js';

/** Dep fields we traverse for a local/root package (dev deps are part of the repo's supply chain). */
const ROOT_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'] as const;
/** Dep fields we traverse for an installed (node_modules) package. */
const DEP_FIELDS = ['dependencies', 'optionalDependencies'] as const;

export interface Lockfile {
  lockfileVersion: number;
  packages: Record<string, LockEntry>;
  name?: string;
}

interface LockEntry {
  name?: string;
  version?: string;
  link?: boolean;
  resolved?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export function loadLockfile(path: string): Lockfile {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Lockfile;
  if (raw.lockfileVersion !== 2 && raw.lockfileVersion !== 3) {
    throw new Error(
      `Unsupported lockfileVersion ${raw.lockfileVersion}. M0 supports npm lockfile v2/v3 (the "packages" map).`,
    );
  }
  if (!raw.packages) {
    throw new Error('Lockfile has no "packages" map. Regenerate with npm 7+ (lockfile v2/v3).');
  }
  return raw;
}

function nameFor(key: string, entry: LockEntry): string {
  if (entry.name) return entry.name;
  const i = key.lastIndexOf('node_modules/');
  if (i >= 0) return key.slice(i + 'node_modules/'.length);
  return key === '' ? '(root)' : key;
}

const isLocalKey = (key: string): boolean => key === '' || !key.includes('node_modules/');

/**
 * Resolve a dependency `dep` required by the package at `fromKey` to a concrete
 * lockfile key, following npm's nearest-ancestor node_modules rule. Returns the
 * resolved key (dereferencing workspace symlinks via `resolved`), or null.
 */
export function resolveDep(
  fromKey: string,
  dep: string,
  packages: Record<string, LockEntry>,
): string | null {
  let base = fromKey;
  // Walk from the deepest node_modules up to the root.
  for (;;) {
    const cand = (base ? base + '/' : '') + 'node_modules/' + dep;
    const entry = packages[cand];
    if (entry) return entry.link && entry.resolved ? entry.resolved : cand;
    const idx = base.lastIndexOf('/node_modules/');
    if (idx === -1) {
      if (base.startsWith('node_modules/')) {
        base = '';
        continue;
      }
      break;
    }
    base = base.slice(0, idx);
  }
  const rootCand = 'node_modules/' + dep;
  const rootEntry = packages[rootCand];
  if (rootEntry) return rootEntry.link && rootEntry.resolved ? rootEntry.resolved : rootCand;
  return null;
}

export function buildGraph(lock: Lockfile): Graph {
  const packages = lock.packages;
  const nodes = new Map<string, PkgNode>();
  const forward = new Map<string, Edge[]>();
  const reverse = new Map<string, Edge[]>();
  let unresolved = 0;

  for (const [key, entry] of Object.entries(packages)) {
    if (entry.link) continue; // symlink alias; its real target is a separate key
    nodes.set(key, {
      key,
      name: nameFor(key, entry),
      version: entry.version ?? '0.0.0',
      isRoot: key === '',
      isLocal: isLocalKey(key),
    });
  }

  const addEdge = (from: string, to: string, depName: string): void => {
    let f = forward.get(from);
    if (!f) forward.set(from, (f = []));
    f.push({ from, to, depName });
    let r = reverse.get(to);
    if (!r) reverse.set(to, (r = []));
    r.push({ from, to, depName });
  };

  for (const [key, entry] of Object.entries(packages)) {
    if (entry.link) continue;
    const fields = isLocalKey(key) ? ROOT_FIELDS : DEP_FIELDS;
    const deps = new Set<string>();
    for (const field of fields) {
      const map = entry[field];
      if (map) for (const d of Object.keys(map)) deps.add(d);
    }
    for (const dep of deps) {
      const targetKey = resolveDep(key, dep, packages);
      if (targetKey !== null && nodes.has(targetKey)) addEdge(key, targetKey, dep);
      else unresolved++;
    }
  }

  return { nodes, forward, reverse, unresolved };
}
