import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { type Slice, parseSlice, repoSlug, SLICE_VERSION } from './slice.js';

/** One repo's entry in the index manifest. */
export interface ManifestEntry {
  slug: string;
  repo: string;
  commit: string | null;
  generatedAt: string;
  fidelity: string;
  /** ISO date this slice was last written into the index. */
  lastPublished: string;
}

export interface Manifest {
  schemaVersion: number;
  sliceVersion: number;
  generatedAt: string;
  repos: ManifestEntry[];
}

const MANIFEST = 'manifest.json';
const SLICES_DIR = 'slices';

const slicePath = (slug: string): string => `${SLICES_DIR}/${slug}/latest.json`;

function emptyManifest(): Manifest {
  return { schemaVersion: 1, sliceVersion: SLICE_VERSION, generatedAt: new Date().toISOString().slice(0, 10), repos: [] };
}

function readManifest(indexDir: string): Manifest {
  const p = join(indexDir, MANIFEST);
  if (!existsSync(p)) return emptyManifest();
  return JSON.parse(readFileSync(p, 'utf8')) as Manifest;
}

/**
 * Write a slice into the index directory and update the manifest. Layout:
 *   <index>/manifest.json
 *   <index>/slices/<slug>/latest.json
 * Committing to git is left to the user (identity reasons).
 */
export function publishSlice(indexDir: string, slice: Slice): { slug: string; path: string } {
  const dir = resolve(indexDir);
  const slug = repoSlug(slice.repo);
  const relPath = slicePath(slug);
  const absPath = join(dir, relPath);
  mkdirSync(join(dir, SLICES_DIR, slug), { recursive: true });
  writeFileSync(absPath, JSON.stringify(slice, null, 2) + '\n');

  const manifest = readManifest(dir);
  const entry: ManifestEntry = {
    slug,
    repo: slice.repo,
    commit: slice.commit,
    generatedAt: slice.generatedAt,
    fidelity: slice.fidelity,
    lastPublished: new Date().toISOString().slice(0, 10),
  };
  const others = manifest.repos.filter((r) => r.slug !== slug);
  manifest.repos = [...others, entry].sort((a, b) => a.slug.localeCompare(b.slug));
  manifest.sliceVersion = SLICE_VERSION;
  manifest.generatedAt = new Date().toISOString().slice(0, 10);
  writeFileSync(join(dir, MANIFEST), JSON.stringify(manifest, null, 2) + '\n');
  return { slug, path: absPath };
}

/** A loaded slice tagged with its index slug. */
export interface LoadedSlice {
  slug: string;
  slice: Slice;
}

/** Load every slice in an index directory from the working tree (current state). */
function loadFromWorktree(indexDir: string): LoadedSlice[] {
  const dir = resolve(indexDir);
  const slicesRoot = join(dir, SLICES_DIR);
  if (!existsSync(slicesRoot)) throw new Error(`no ${SLICES_DIR}/ directory in index: ${dir}`);
  const out: LoadedSlice[] = [];
  for (const slug of readdirSync(slicesRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)) {
    const p = join(slicesRoot, slug, 'latest.json');
    if (!existsSync(p)) continue;
    out.push({ slug, slice: parseSlice(readFileSync(p, 'utf8'), p) });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

function gitShow(indexDir: string, ref: string, relPath: string): string | null {
  try {
    return execFileSync('git', ['-C', resolve(indexDir), 'show', `${ref}:${relPath}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

/**
 * Load every slice as it existed at a past git ref (commit sha, tag, or date via
 * `<branch>@{<date>}`). The index repo's git history IS the time machine: we read
 * the manifest at <ref>, then each slice blob at <ref>. No extra machinery.
 */
function loadAsOf(indexDir: string, ref: string): LoadedSlice[] {
  const manifestText = gitShow(indexDir, ref, MANIFEST);
  if (manifestText === null) {
    throw new Error(`could not read ${MANIFEST} at "${ref}" (is <index> a git repo, and is the ref valid?)`);
  }
  const manifest = JSON.parse(manifestText) as Manifest;
  const out: LoadedSlice[] = [];
  for (const entry of manifest.repos) {
    const text = gitShow(indexDir, ref, slicePath(entry.slug));
    if (text === null) continue; // slice absent at that ref
    out.push({ slug: entry.slug, slice: parseSlice(text, `${entry.slug}@${ref}`) });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

export interface LoadIndexOptions {
  /** Read the index at a past git ref (commit/tag/date) instead of the working tree. */
  asOf?: string;
}

/** Load all slices from an index directory (current tree, or as of a past ref). */
export function loadIndex(indexDir: string, opts: LoadIndexOptions = {}): LoadedSlice[] {
  const slices = opts.asOf ? loadAsOf(indexDir, opts.asOf) : loadFromWorktree(indexDir);
  if (slices.length === 0) throw new Error(`index has no slices${opts.asOf ? ` at "${opts.asOf}"` : ''}: ${resolve(indexDir)}`);
  return slices;
}
