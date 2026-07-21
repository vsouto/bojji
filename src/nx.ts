import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface NxProject {
  name: string;
  /** Repo-relative source root, e.g. "libs/swwc-angular". */
  root: string;
  /** npm package names this project imports directly (from the Nx project graph). */
  npmDeps: string[];
}

/** Nx caches the full project graph (incl. external npm edges) here. */
const CACHE_PATH = '.nx/cache/project-graph.json';

/**
 * Load the Nx project graph if the repo has one. Returns the projects with the
 * npm packages each one imports directly. We read Nx's own cached graph (or an
 * explicit file); regenerating it is `nx graph --file=<path>` — Nx's own metadata
 * pass, not a build. Returns null when the repo isn't an Nx workspace.
 */
export function loadNxGraph(repoRoot: string, explicitPath?: string): NxProject[] | null {
  const path = explicitPath ?? join(repoRoot, CACHE_PATH);
  if (!existsSync(path)) return null;
  let graph: {
    nodes?: Record<string, { data?: { root?: string } }>;
    dependencies?: Record<string, Array<{ target?: string }>>;
  };
  try {
    graph = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
  const nodes = graph.nodes ?? {};
  const deps = graph.dependencies ?? {};
  if (Object.keys(nodes).length === 0) return null;

  const projects: NxProject[] = [];
  for (const name of Object.keys(nodes)) {
    const root = nodes[name]?.data?.root ?? name;
    const npmDeps = (deps[name] ?? [])
      .map((e) => e.target)
      .filter((t): t is string => typeof t === 'string' && t.startsWith('npm:'))
      .map((t) => t.slice('npm:'.length));
    projects.push({ name, root, npmDeps });
  }
  return projects;
}
