import type { Graph, PkgNode, Product, Exposure } from './types.js';
import type { Advisory } from './osv.js';
import type { NxProject } from './nx.js';

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

/**
 * Forward path from any of `startKeys` to `targetKey` through dependency edges,
 * or null. Used to test whether an Nx project's direct npm imports reach a culprit.
 */
export function forwardPathTo(graph: Graph, startKeys: string[], targetKey: string): string[] | null {
  const prev = new Map<string, string | null>();
  const queue: string[] = [];
  for (const s of startKeys) {
    if (graph.nodes.has(s) && !prev.has(s)) {
      prev.set(s, null);
      queue.push(s);
    }
  }
  while (queue.length > 0) {
    const cur = queue.shift() as string;
    if (cur === targetKey) {
      const path: string[] = [];
      let k: string | null = cur;
      while (k !== null) {
        path.push(k);
        k = prev.get(k) ?? null;
      }
      return path.reverse(); // [start, ..., target]
    }
    for (const edge of graph.forward.get(cur) ?? []) {
      if (!prev.has(edge.to)) {
        prev.set(edge.to, cur);
        queue.push(edge.to);
      }
    }
  }
  return null;
}

/** A synthetic graph node standing in for an Nx project (not a lockfile package). */
function projectNode(proj: NxProject): PkgNode {
  return { key: proj.root, name: proj.name, version: '', isRoot: false, isLocal: true };
}

/** A Product view of an Nx project so ownership resolves by its source root. */
function projectProduct(proj: NxProject): Product {
  return { name: proj.name, dir: proj.root, isRoot: false, declaredDeps: new Set() };
}

/**
 * Refine a root-attributed culprit using the Nx project graph: which shipped libs
 * import an npm package whose transitive closure reaches the culprit. Returns one
 * exposure per hit lib, or null when no shipped lib reaches it (root/dev tooling only).
 */
function refineWithNx(graph: Graph, culprit: PkgNode, nx: NxProject[]): Exposure[] | null {
  const hits: Exposure[] = [];
  for (const proj of nx) {
    const starts = proj.npmDeps.map((n) => 'node_modules/' + n);
    const fwd = forwardPathTo(graph, starts, culprit.key);
    if (!fwd) continue;
    const nodes = fwd.map((k) => graph.nodes.get(k)).filter((n): n is PkgNode => n != null);
    const path = [projectNode(proj), ...nodes];
    const directDep = path.length > 2 ? (path[1] as PkgNode) : null;
    hits.push({ culprit, path, directDep, products: [projectProduct(proj)], attribution: 'nx-lib' });
  }
  return hits.length > 0 ? hits : null;
}

/** Build the exposures: for each matched culprit, its proving path and the product it lands in. */
export function computeExposures(
  graph: Graph,
  matches: PkgNode[],
  products: Product[],
  nx: NxProject[] | null = null,
): Exposure[] {
  const rootProduct = products.find((p) => p.isRoot) ?? null;
  const byDir = new Map(products.map((p) => [p.dir, p]));
  const exposures: Exposure[] = [];
  for (const culprit of matches) {
    const keyPath = reversePathToProduct(graph, culprit.key);
    if (!keyPath) continue; // orphan in the lockfile; not reachable from any product
    const path = keyPath.map((k) => graph.nodes.get(k)).filter((n): n is PkgNode => n != null);
    const productNode = path[0];

    // Nx repos declare deps at the root, so a root hit can be refined to the
    // actual shipped library (or shown as root/dev tooling when no lib imports it).
    if (nx && productNode && productNode.isRoot) {
      const refined = refineWithNx(graph, culprit, nx);
      if (refined) {
        exposures.push(...refined);
      } else {
        const directDep = path.length > 2 ? (path[1] as PkgNode) : null;
        const product = rootProduct ? [rootProduct] : [];
        exposures.push({ culprit, path, directDep, products: product, attribution: 'root-tooling' });
      }
      continue;
    }

    const directDep = path.length > 2 ? (path[1] as PkgNode) : null;
    const product = (productNode && byDir.get(productNode.key)) || rootProduct;
    exposures.push({
      culprit,
      path,
      directDep,
      products: product ? [product] : [],
      attribution: 'workspace',
    });
  }
  return exposures;
}
