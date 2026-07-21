import semver from 'semver';
import type { Graph, PkgNode, Product, Exposure } from './types.js';

/** Every graph node whose name matches `pkg` and whose version is in `range`. */
export function findMatches(graph: Graph, pkg: string, range: string): PkgNode[] {
  const out: PkgNode[] = [];
  for (const node of graph.nodes.values()) {
    if (node.name !== pkg) continue;
    if (!semver.valid(node.version)) continue;
    if (semver.satisfies(node.version, range, { includePrerelease: true })) out.push(node);
  }
  return out;
}

/**
 * Shortest path from the root project ("") down to `fromKey`, walking reverse
 * edges (dependency -> dependents) breadth-first. Returns keys in dependency
 * order [root, ..., culprit], or null if the culprit is not reachable from root.
 */
export function reversePathToRoot(graph: Graph, fromKey: string): string[] | null {
  const prev = new Map<string, string | null>([[fromKey, null]]);
  const queue: string[] = [fromKey];
  while (queue.length > 0) {
    const cur = queue.shift() as string;
    if (cur === '') {
      const path: string[] = [];
      let node: string | null = '';
      while (node !== null) {
        path.push(node);
        node = prev.get(node) ?? null;
      }
      return path; // ['', directDep, ..., culprit]
    }
    for (const edge of graph.reverse.get(cur) ?? []) {
      if (!prev.has(edge.from)) {
        prev.set(edge.from, cur);
        queue.push(edge.from);
      }
    }
  }
  return null;
}

/** Build the exposures: for each matched culprit, its proving path and attribution. */
export function computeExposures(
  graph: Graph,
  matches: PkgNode[],
  products: Product[],
): Exposure[] {
  const exposures: Exposure[] = [];
  for (const culprit of matches) {
    const keyPath = reversePathToRoot(graph, culprit.key);
    if (!keyPath) continue; // orphan in the lockfile; not reachable from root
    const path = keyPath.map((k) => graph.nodes.get(k)).filter((n): n is PkgNode => n != null);
    const directDep = path.length > 1 ? (path[1] as PkgNode) : null;
    const attributed = directDep
      ? products.filter((p) => p.declaredDeps.has(directDep.name))
      : [];
    // Fall back to the root project when no lib/app declares the direct dep.
    const products_ = attributed.length > 0 ? attributed : products.filter((p) => p.isRoot);
    exposures.push({ culprit, path, directDep, products: products_ });
  }
  return exposures;
}
