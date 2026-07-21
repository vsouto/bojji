import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import type { Graph, PkgNode, Edge, Product, Freshness } from './types.js';
import type { NxProject } from './nx.js';
import type { CodeownersFile } from './codeowners.js';
import { analyzeRepo, type AnalyzeOptions, type RepoData } from './analyze.js';

export const SLICE_VERSION = 1;

/** Attribution capability captured for a repo. */
export type Fidelity = 'nx' | 'workspace' | 'root';

interface SliceNode {
  key: string;
  name: string;
  version: string;
}

/** A serialized, CVE-agnostic snapshot of one repo's structure. No OSV/CVE data. */
export interface Slice {
  sliceVersion: number;
  /** Repo slug/name (a stable identity for the index). */
  repo: string;
  /** Source commit the slice was emitted from (lockfile's last commit, or HEAD). */
  commit: string | null;
  /** Emit timestamp (ISO date). */
  generatedAt: string;
  fidelity: Fidelity;
  freshness: Freshness;
  graph: {
    nodes: SliceNode[];
    /** [from, to, depName] — depName kept for provenance; not required to match. */
    edges: Array<[string, string, string]>;
    /** Declared dep edges that were absent from the lockfile (reported, not clean). */
    unresolved: number;
  };
  products: Array<{ name: string; dir: string; isRoot: boolean }>;
  /** Nx projects when fidelity === "nx", else null. */
  nx: Array<{ name: string; root: string; npmDeps: string[] }> | null;
  /** CODEOWNERS references (patterns + tokens), never resolved people. */
  ownership: { relPath: string; rules: Array<{ pattern: string; owners: string[]; line: number }> } | null;
  /** Last-commit date of the CODEOWNERS file, for the "as of" stamp. */
  codeownersDate: string | null;
  /** Human coverage notes surfaced in the org view. */
  coverage: string[];
}

const isLocalKey = (key: string): boolean => key === '' || !key.includes('node_modules/');

/** slug a repo name/path into an index-safe directory name. */
export function repoSlug(name: string): string {
  return name
    .replace(/\.git$/, '')
    .replace(/[/\\]+/g, '__')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^_+|_+$/g, '') || 'repo';
}

/** Determine attribution fidelity for a repo. */
function computeFidelity(dir: string, nx: NxProject[] | null): Fidelity {
  if (nx && nx.length > 0) return 'nx';
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { workspaces?: unknown };
    const ws = pkg.workspaces;
    const hasWs = Array.isArray(ws) ? ws.length > 0 : ws != null;
    if (hasWs) return 'workspace';
  } catch {
    /* no root package.json */
  }
  return 'root';
}

/**
 * Serialize a repo's live structure into a CVE-agnostic slice. Reuses analyzeRepo,
 * so the slice is exactly what the engine already computed — nothing new is derived.
 */
export function buildSlice(dir: string, opts: AnalyzeOptions & { repo?: string } = {}): Slice {
  const root = resolve(dir);
  const data = analyzeRepo(root, opts);
  const fidelity = computeFidelity(root, data.nx);

  const nodes: SliceNode[] = [];
  for (const n of data.graph.nodes.values()) nodes.push({ key: n.key, name: n.name, version: n.version });
  const edges: Array<[string, string, string]> = [];
  for (const list of data.graph.forward.values()) {
    for (const e of list) edges.push([e.from, e.to, e.depName]);
  }

  const coverage: string[] = [];
  if (data.graph.unresolved > 0) {
    coverage.push(
      `${data.graph.unresolved} declared dependency edge(s) not in the lockfile (e.g. local packages) — reported, not assumed clean.`,
    );
  }

  return {
    sliceVersion: SLICE_VERSION,
    repo: opts.repo ?? basename(root),
    commit: data.freshness.lockfileCommit ?? data.freshness.head,
    generatedAt: new Date().toISOString().slice(0, 10),
    fidelity,
    freshness: data.freshness,
    graph: { nodes, edges, unresolved: data.graph.unresolved },
    products: data.products.map((p) => ({ name: p.name, dir: p.dir, isRoot: p.isRoot })),
    nx: data.nx ? data.nx.map((p) => ({ name: p.name, root: p.root, npmDeps: p.npmDeps })) : null,
    ownership: data.codeowners
      ? { relPath: data.codeowners.relPath, rules: data.codeowners.rules }
      : null,
    codeownersDate: data.codeownersDate,
    coverage,
  };
}

/** Parse + validate a slice from JSON text. */
export function parseSlice(text: string, srcLabel = 'slice'): Slice {
  const raw = JSON.parse(text) as Slice;
  if (raw.sliceVersion !== SLICE_VERSION) {
    throw new Error(
      `${srcLabel}: sliceVersion ${raw.sliceVersion} unsupported (this build reads v${SLICE_VERSION}). Re-emit with 'bojji index emit'.`,
    );
  }
  if (!raw.graph || !Array.isArray(raw.graph.nodes)) throw new Error(`${srcLabel}: malformed slice (no graph).`);
  return raw;
}

/** Load a slice from a file path. */
export function loadSlice(path: string): Slice {
  if (!existsSync(path)) throw new Error(`slice not found: ${path}`);
  return parseSlice(readFileSync(path, 'utf8'), path);
}

/**
 * Reconstruct the engine's RepoData from a stored slice. isRoot/isLocal are derived
 * from each node's key (the same rule buildGraph uses), so no structure is lost.
 */
export function sliceToRepoData(slice: Slice): RepoData {
  const nodes = new Map<string, PkgNode>();
  for (const n of slice.graph.nodes) {
    nodes.set(n.key, {
      key: n.key,
      name: n.name,
      version: n.version,
      isRoot: n.key === '',
      isLocal: isLocalKey(n.key),
    });
  }
  const forward = new Map<string, Edge[]>();
  const reverse = new Map<string, Edge[]>();
  for (const [from, to, depName] of slice.graph.edges) {
    const edge: Edge = { from, to, depName };
    let f = forward.get(from);
    if (!f) forward.set(from, (f = []));
    f.push(edge);
    let r = reverse.get(to);
    if (!r) reverse.set(to, (r = []));
    r.push(edge);
  }
  const graph: Graph = { nodes, forward, reverse, unresolved: slice.graph.unresolved };

  const products: Product[] = slice.products.map((p) => ({
    name: p.name,
    dir: p.dir,
    isRoot: p.isRoot,
    declaredDeps: new Set<string>(),
  }));

  const nx: NxProject[] | null = slice.nx
    ? slice.nx.map((p) => ({ name: p.name, root: p.root, npmDeps: p.npmDeps }))
    : null;

  const codeowners: CodeownersFile | null = slice.ownership
    ? { relPath: slice.ownership.relPath, rules: slice.ownership.rules }
    : null;

  return {
    repoRoot: slice.repo,
    graph,
    products,
    nx,
    codeowners,
    codeownersDate: slice.codeownersDate,
    freshness: slice.freshness,
  };
}
