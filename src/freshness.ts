import { execFileSync } from 'node:child_process';
import type { Freshness } from './types.js';

function git(repoRoot: string, args: string[]): string | null {
  try {
    const out = execFileSync('git', ['-C', repoRoot, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    // An untracked/uncommitted path yields empty output; treat that as "unknown".
    return out === '' ? null : out;
  } catch {
    return null;
  }
}

/** Git provenance for the lockfile: last commit that touched it, and current HEAD. */
export function lockfileFreshness(repoRoot: string, lockfileRelPath: string): Freshness {
  const lockfileCommit = git(repoRoot, ['log', '-1', '--format=%h', '--', lockfileRelPath]);
  const lockfileDate = git(repoRoot, ['log', '-1', '--format=%cs', '--', lockfileRelPath]);
  const head = git(repoRoot, ['rev-parse', '--short', 'HEAD']);
  return { lockfileCommit, lockfileDate, head };
}

/** Last-commit date (YYYY-MM-DD) for any repo-relative file, or null. */
export function lastCommitDate(repoRoot: string, relPath: string): string | null {
  return git(repoRoot, ['log', '-1', '--format=%cs', '--', relPath]);
}
