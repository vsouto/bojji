import type { Graph, PkgNode, Product, Exposure } from './types.js';
import type { Advisory } from './osv.js';

/** Every graph node an advisory flags as vulnerable (matched by name + version). */
export function matchAdvisories(graph: Graph, advisories: Advisory[]): PkgNode[] {
  const out: PkgNode[] = [];
  for (const node of graph.nodes.values()) {
    for (const adv of advisories) {
      if (node.name === adv.packageName && adv.matches(node.version)) {
        out.push(node);
        break;
      }
    }
  }
  return out;
}

/**
 * Shortest path from the nearest local/workspace package down to `fromKey`,
 * walking reverse edges (dependency -> dependents) breadth-first. The endpoint is
 * the closest node with `isLocal` (a workspace package, or the root ""), so
 * exposure is attributed to the real releasable unit that pulls the culprit in.
 * Returns keys in dependency order [product, ..., culprit], or null if unreachable.
 */
export function reversePathToProduct(graph: Graph, fromKey: string): string[] | null {
  const prev = new Map<string, string | null>([[fromKey, null]]);
  const queue: string[] = [fromKey];
  while (queue.length > 0) {
    const cur = queue.shift() as string;
    const node = graph.nodes.get(cur);
    if (node && node.isLocal && cur !== fromKey) {
      const path: string[] = [];
      let k: string | null = cur;
      while (k !== null) {
        path.push(k);
        k = prev.get(k) ?? null;
      }
      return path; // [product, ..., culprit]
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

/** Build the exposures: for each matched culprit, its proving path and the product it lands in. */
export function computeExposures(
  graph: Graph,
  matches: PkgNode[],
  products: Product[],
): Exposure[] {
  const rootProduct = products.find((p) => p.isRoot) ?? null;
  const byDir = new Map(products.map((p) => [p.dir, p]));
  const exposures: Exposure[] = [];
  for (const culprit of matches) {
    const keyPath = reversePathToProduct(graph, culprit.key);
    if (!keyPath) continue; // orphan in the lockfile; not reachable from any product
    const path = keyPath.map((k) => graph.nodes.get(k)).filter((n): n is PkgNode => n != null);
    const productNode = path[0];
    // A direct dependency only when there's an intermediate hop between product and culprit.
    const directDep = path.length > 2 ? (path[1] as PkgNode) : null;
    const product = (productNode && byDir.get(productNode.key)) || rootProduct;
    exposures.push({ culprit, path, directDep, products: product ? [product] : [] });
  }
  return exposures;
}
