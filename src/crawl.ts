import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { buildSlice, type Slice } from './slice.js';
import { publishSlice } from './index-repo.js';

export interface CrawlResult {
  repo: string;
  slug: string;
  fidelity: string;
  products: number;
  ok: boolean;
  error?: string;
}

/**
 * LOCAL crawl: emit + publish a slice for each repo path in one pass. Fidelity is
 * whatever buildSlice honestly finds per repo (nx cache present → nx, npm-workspaces
 * → workspace, else root). This is the validated path.
 */
export function crawlLocal(repoPaths: string[], indexDir: string): CrawlResult[] {
  const results: CrawlResult[] = [];
  for (const p of repoPaths) {
    const root = resolve(p);
    try {
      if (!existsSync(join(root, 'package-lock.json'))) {
        throw new Error('no package-lock.json');
      }
      const slice = buildSlice(root);
      const { slug } = publishSlice(indexDir, slice);
      results.push({ repo: slice.repo, slug, fidelity: slice.fidelity, products: slice.products.length, ok: true });
    } catch (err) {
      results.push({
        repo: root,
        slug: '',
        fidelity: '-',
        products: 0,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// GitLab crawl (read-only). WRITTEN BUT NOT EXECUTED/VALIDATED here.
// Guarded: refuses to run without an explicit token env var. It reads each repo's
// lockfile / package.json / CODEOWNERS over the GitLab API (no clone, no build),
// materializes them to a temp dir, and reuses the SAME buildSlice as local mode.
// Because it never builds source, Nx repos degrade to workspace/root fidelity —
// the honest two-tier behavior. Per-lib Nx fidelity comes from a repo's own CI emit.
// ---------------------------------------------------------------------------

export interface GitlabCrawlOptions {
  gitlabUrl: string;
  group: string;
  /** Read-only token; MUST come from the environment, never a flag. */
  token: string | undefined;
  indexDir: string;
  /** Files to try per repo (first CODEOWNERS location that exists wins). */
  includeSubgroups?: boolean;
}

interface GitlabProject {
  id: number;
  path_with_namespace: string;
  default_branch: string | null;
}

const CODEOWNERS_LOCATIONS = ['CODEOWNERS', '.github/CODEOWNERS', '.gitlab/CODEOWNERS', 'docs/CODEOWNERS'];

async function gitlabGet(base: string, token: string, path: string): Promise<Response> {
  return fetch(`${base}/api/v4/${path}`, { headers: { 'PRIVATE-TOKEN': token } });
}

async function listGroupProjects(base: string, token: string, group: string, subgroups: boolean): Promise<GitlabProject[]> {
  const projects: GitlabProject[] = [];
  for (let page = 1; ; page++) {
    const res = await gitlabGet(
      base,
      token,
      `groups/${encodeURIComponent(group)}/projects?per_page=100&page=${page}&include_subgroups=${subgroups ? 'true' : 'false'}&archived=false`,
    );
    if (!res.ok) throw new Error(`GitLab group listing failed: HTTP ${res.status}`);
    const batch = (await res.json()) as GitlabProject[];
    projects.push(...batch);
    if (batch.length < 100) break;
  }
  return projects;
}

async function fetchRawFile(base: string, token: string, projectId: number, ref: string, filePath: string): Promise<string | null> {
  const res = await gitlabGet(
    base,
    token,
    `projects/${projectId}/repository/files/${encodeURIComponent(filePath)}/raw?ref=${encodeURIComponent(ref)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitLab file fetch ${filePath} failed: HTTP ${res.status}`);
  return res.text();
}

/**
 * Read-only GitLab crawl. GUARDED: throws unless a token is supplied via env.
 * Not executed in this build's validation (personal project keeps employer data out).
 */
export async function crawlGitlab(opts: GitlabCrawlOptions): Promise<CrawlResult[]> {
  if (!opts.token) {
    throw new Error(
      'GitLab crawl refused: no token. Set a read-only token in the environment (BOJJI_GITLAB_TOKEN) — ' +
        'the crawler never accepts a token as a flag and never writes to source repos.',
    );
  }
  const base = opts.gitlabUrl.replace(/\/+$/, '');
  const token = opts.token;
  const results: CrawlResult[] = [];
  const projects = await listGroupProjects(base, token, opts.group, opts.includeSubgroups ?? true);

  for (const proj of projects) {
    const repo = proj.path_with_namespace;
    const ref = proj.default_branch;
    if (!ref) {
      results.push({ repo, slug: '', fidelity: '-', products: 0, ok: false, error: 'no default branch' });
      continue;
    }
    let work: string | null = null;
    try {
      const lockText = await fetchRawFile(base, token, proj.id, ref, 'package-lock.json');
      if (lockText === null) {
        results.push({ repo, slug: '', fidelity: '-', products: 0, ok: false, error: 'no package-lock.json (not npm)' });
        continue;
      }
      work = mkdtempSync(join(tmpdir(), 'bojji-crawl-'));
      writeFileSync(join(work, 'package-lock.json'), lockText);

      const rootPkg = await fetchRawFile(base, token, proj.id, ref, 'package.json');
      if (rootPkg) writeFileSync(join(work, 'package.json'), rootPkg);

      // Materialize each workspace package.json so discoverProducts sees the units.
      // Workspace dirs are the local (non-node_modules) keys in the lockfile itself.
      const lock = JSON.parse(lockText) as { packages?: Record<string, unknown> };
      for (const key of Object.keys(lock.packages ?? {})) {
        if (key === '' || key.includes('node_modules/')) continue;
        const wsPkg = await fetchRawFile(base, token, proj.id, ref, `${key}/package.json`);
        if (wsPkg) {
          mkdirSync(join(work, dirname(`${key}/package.json`)), { recursive: true });
          writeFileSync(join(work, key, 'package.json'), wsPkg);
        }
      }

      for (const loc of CODEOWNERS_LOCATIONS) {
        const co = await fetchRawFile(base, token, proj.id, ref, loc);
        if (co !== null) {
          mkdirSync(join(work, dirname(loc)), { recursive: true });
          writeFileSync(join(work, loc), co);
          break;
        }
      }

      const slice: Slice = buildSlice(work, { repo });
      // Stamp provenance from the API (temp dir has no git history).
      slice.commit = ref;
      slice.freshness = { lockfileCommit: null, lockfileDate: null, head: ref };
      const { slug } = publishSlice(opts.indexDir, slice);
      results.push({ repo, slug, fidelity: slice.fidelity, products: slice.products.length, ok: true });
    } catch (err) {
      results.push({ repo, slug: '', fidelity: '-', products: 0, ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      if (work) rmSync(work, { recursive: true, force: true });
    }
  }
  return results;
}
