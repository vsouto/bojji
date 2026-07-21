import semver from 'semver';
import { join, relative, resolve } from 'node:path';
import { loadLockfile, buildGraph } from './lockfile.js';
import { discoverProducts } from './products.js';
import { loadNxGraph, type NxProject } from './nx.js';
import { loadCodeowners, type CodeownersFile } from './codeowners.js';
import { lockfileFreshness, lastCommitDate } from './freshness.js';
import { resolveAdvisories, type Advisory } from './osv.js';
import type { Graph, Product, Freshness } from './types.js';
import type { Report } from './render.js';

/**
 * The CVE-agnostic per-repo structure the engine matches against. Everything a
 * Report needs *except* the advisory. `analyzeRepo` builds it live from a repo;
 * `sliceToRepoData` (slice.ts) reconstructs it from a stored slice. Both feed the
 * SAME matchAdvisories / computeExposures / ownership logic.
 */
export interface RepoData {
  /** Repo root path (live) or repo slug/name (from a slice) — display only. */
  repoRoot: string;
  graph: Graph;
  products: Product[];
  nx: NxProject[] | null;
  codeowners: CodeownersFile | null;
  codeownersDate: string | null;
  freshness: Freshness;
}

export interface AnalyzeOptions {
  lockfilePath?: string;
  /** Explicit Nx project-graph path. */
  nxGraph?: string;
  /** Ignore any Nx graph and attribute to the root/workspace instead. */
  noNx?: boolean;
}

/** Build the CVE-agnostic structure for one repo, live from disk + git. */
export function analyzeRepo(dir: string, opts: AnalyzeOptions = {}): RepoData {
  const root = resolve(dir);
  const lockfilePath = opts.lockfilePath ? resolve(opts.lockfilePath) : join(root, 'package-lock.json');
  const lock = loadLockfile(lockfilePath);
  const graph = buildGraph(lock);
  const products = discoverProducts(root);
  const nx = opts.noNx
    ? null
    : opts.nxGraph
      ? loadNxGraph(root, resolve(opts.nxGraph))
      : loadNxGraph(root);
  const freshness = lockfileFreshness(root, relative(root, lockfilePath) || 'package-lock.json');
  const codeowners = loadCodeowners(root);
  const codeownersDate = codeowners ? lastCommitDate(root, codeowners.relPath) : null;
  return { repoRoot: root, graph, products, nx, codeowners, codeownersDate, freshness };
}

/** The resolved advisory input for a query: from OSV, or offline --package/--range. */
export interface AdvisoryInput {
  advisories: Advisory[];
  source: 'osv' | 'manual';
  label: string;
}

/** Build one advisory from --package/--range (offline mode). */
export function manualAdvisory(pkg: string, range: string): Advisory {
  if (!semver.validRange(range)) throw new Error(`--range "${range}" is not a valid semver range`);
  return {
    id: 'manual',
    cve: 'manual',
    summary: '',
    packageName: pkg,
    rangeText: range,
    matches: (v) => semver.valid(v) !== null && semver.satisfies(v, range, { includePrerelease: true }),
  };
}

/**
 * Resolve the advisory to match against, shared by expose (--dir/--slice/--index).
 * Manual --package/--range wins; otherwise the id is looked up in OSV. CVE-agnostic
 * by construction: this is the ONLY place a CVE enters, at query time, never a slice.
 */
export async function resolveAdvisoryInput(opts: {
  id?: string;
  pkg?: string;
  range?: string;
  offline?: boolean;
}): Promise<AdvisoryInput> {
  const { id, pkg, range, offline } = opts;
  if (typeof pkg === 'string' || typeof range === 'string') {
    if (typeof pkg !== 'string' || typeof range !== 'string') {
      throw new Error('offline mode needs both --package and --range');
    }
    return { advisories: [manualAdvisory(pkg, range)], source: 'manual', label: id ?? `${pkg} @ ${range}` };
  }
  if (typeof id !== 'string') throw new Error('give a CVE/GHSA id, or use --package with --range');
  if (offline) throw new Error('--offline set but no --package/--range given');
  const advisories = await resolveAdvisories(id);
  return { advisories, source: 'osv', label: id };
}

/** Assemble a Report from a repo's structure + a resolved advisory (render-ready). */
export function buildReport(data: RepoData, input: AdvisoryInput, exposures: Report['exposures']): Report {
  return {
    label: input.label,
    source: input.source,
    advisories: input.advisories.map(({ matches: _m, ...info }) => info),
    repoRoot: data.repoRoot,
    graph: data.graph,
    products: data.products,
    exposures,
    freshness: data.freshness,
    codeowners: data.codeowners,
    codeownersDate: data.codeownersDate,
    nx: data.nx,
  };
}
