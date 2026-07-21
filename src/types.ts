/** A node in the resolved dependency graph, keyed by its lockfile path. */
export interface PkgNode {
  /** The package-lock `packages` map key, e.g. "" (root) or "node_modules/foo". */
  key: string;
  name: string;
  version: string;
  /** The repo root project. */
  isRoot: boolean;
  /** A workspace / local package (not under node_modules). */
  isLocal: boolean;
}

export interface Edge {
  /** Dependent package key. */
  from: string;
  /** Dependency package key. */
  to: string;
  /** The dependency name as declared by `from` (before resolution). */
  depName: string;
}

export interface Graph {
  nodes: Map<string, PkgNode>;
  /** key -> its dependencies. */
  forward: Map<string, Edge[]>;
  /** key -> the packages that depend on it. */
  reverse: Map<string, Edge[]>;
  /** Declared deps that could not be resolved in the lockfile (e.g. local/Nx packages). */
  unresolved: number;
}

/** A discovered releasable unit (the root, or a lib/app package). */
export interface Product {
  name: string;
  /** Repo-relative directory, "" for the root. */
  dir: string;
  isRoot: boolean;
  /** Direct dependency names this product declares in its own package.json. */
  declaredDeps: Set<string>;
}

/** Display info for a resolved advisory (one affected npm package). */
export interface AdvisoryInfo {
  /** The OSV/GHSA record id that carried the data. */
  id: string;
  /** The id the user queried (CVE or GHSA). */
  cve: string;
  summary: string;
  packageName: string;
  /** Human-readable affected range, e.g. ">=1.0.0 <1.2.6". */
  rangeText: string;
}

/** How an exposure was attributed to its product. */
export type Attribution = 'workspace' | 'nx-lib' | 'root-tooling';

/** One proof that a product is exposed to the vulnerable package. */
export interface Exposure {
  culprit: PkgNode;
  /** product ... culprit, in dependency order. */
  path: PkgNode[];
  /** The direct dependency at the head of the path (path[1]) when there's a hop, else null. */
  directDep: PkgNode | null;
  /** The releasable unit(s) this exposure lands on. */
  products: Product[];
  /**
   * workspace = a real npm-workspace package pulls it in;
   * nx-lib = an Nx library imports it (root-hoisted deps, resolved via the Nx graph);
   * root-tooling = only the root / dev tooling pulls it in, no shipped unit.
   */
  attribution: Attribution;
}

export interface Freshness {
  lockfileCommit: string | null;
  lockfileDate: string | null;
  head: string | null;
}
