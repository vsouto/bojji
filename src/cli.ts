#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { matchAdvisories, computeExposures } from './expose.js';
import { analyzeRepo, buildReport, resolveAdvisoryInput, type AnalyzeOptions } from './analyze.js';
import { buildSlice, loadSlice, sliceToRepoData } from './slice.js';
import { publishSlice, loadIndex } from './index-repo.js';
import { crawlLocal, crawlGitlab } from './crawl.js';
import { composeOrg } from './compose.js';
import { renderOrgHuman, renderOrgJson } from './render-org.js';
import { renderHuman, renderJson } from './render.js';

interface Args {
  cmd: string | undefined;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): Args {
  const [cmd, ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i] as string;
    if (a.startsWith('--')) {
      const name = a.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[name] = next;
        i++;
      } else {
        flags[name] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { cmd, positional, flags };
}

const USAGE = `bojji — name the shipped products a vulnerability touches.

Portable mode (free, this repo only):
  bojji expose <CVE|GHSA> [options]                  resolve the package + range via OSV
  bojji expose <label> --package <n> --range <r>     offline override

Extended mode (org-wide, buildless git index):
  bojji expose <CVE|GHSA> --index <dir> [--as-of <ref>]   compose across all slices
  bojji expose <CVE|GHSA> --slice <file>                  run against one stored slice
  bojji index emit [--dir <path>] [--out <file>]          print this repo's CVE-agnostic slice
  bojji index publish --index <dir> [--dir <path>]        write this repo's slice into the index
  bojji index crawl --index <dir> --repos <p1,p2,...>     local: emit+publish many repos in one pass
  bojji index crawl --index <dir> --gitlab <url> --group <g>   read-only GitLab crawl (needs BOJJI_GITLAB_TOKEN)

Options:
  --dir <path>        Repo root to analyze (default: cwd)
  --lockfile <path>   Path to package-lock.json (default: <dir>/package-lock.json)
  --package <name>    Skip OSV; treat this package as vulnerable
  --range <semver>    Vulnerable range for --package, e.g. "<1.2.6"
  --offline           Fail instead of calling OSV (requires --package/--range)
  --nx-graph <path>   Use a specific Nx project-graph JSON (default: auto-detect .nx cache)
  --no-nx             Ignore the Nx graph (attribute to the root instead of libs)
  --repo <name>       Override the repo slug/name stored in a slice
  --as-of <ref>       Read the index at a past git ref (commit/tag/date)
  --json              Machine-readable output
  --help              Show this help
`;

function fail(msg: string): never {
  process.stderr.write(`bojji: ${msg}\n`);
  process.exit(1);
}

function analyzeOptions(args: Args): AnalyzeOptions {
  return {
    lockfilePath: args.flags.lockfile ? String(args.flags.lockfile) : undefined,
    nxGraph: args.flags['nx-graph'] ? String(args.flags['nx-graph']) : undefined,
    noNx: args.flags['no-nx'] === true,
  };
}

/** Resolve the advisory to match, handling errors + the empty-OSV case uniformly. */
async function resolveAdvisory(args: Args): Promise<Awaited<ReturnType<typeof resolveAdvisoryInput>>> {
  const id = args.positional[0];
  try {
    return await resolveAdvisoryInput({
      id,
      pkg: typeof args.flags.package === 'string' ? args.flags.package : undefined,
      range: typeof args.flags.range === 'string' ? args.flags.range : undefined,
      offline: args.flags.offline === true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(`${msg}\n       (no network? re-run with --package <name> --range <semver>)`);
  }
}

async function cmdExpose(args: Args): Promise<void> {
  if (args.flags.help) {
    process.stdout.write(USAGE);
    return;
  }
  const asOf = typeof args.flags['as-of'] === 'string' ? String(args.flags['as-of']) : undefined;

  // --- Org-wide compose (extended mode) ---
  if (typeof args.flags.index === 'string') {
    const indexDir = resolve(String(args.flags.index));
    const input = await resolveAdvisory(args);
    let loaded;
    try {
      loaded = loadIndex(indexDir, { asOf });
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
    }
    const org = composeOrg(loaded, input, asOf ?? null);
    process.stdout.write((args.flags.json ? renderOrgJson(org) : renderOrgHuman(org)) + '\n');
    return;
  }

  // --- Single stored slice (round-trip / offline) ---
  if (typeof args.flags.slice === 'string') {
    const input = await resolveAdvisory(args);
    const data = sliceToRepoData(loadSlice(resolve(String(args.flags.slice))));
    if (input.source === 'osv' && input.advisories.length === 0) return emptyOsv(args, input.label);
    const matches = matchAdvisories(data.graph, input.advisories);
    const exposures = computeExposures(data.graph, matches, data.products, data.nx);
    const report = buildReport(data, input, exposures);
    process.stdout.write((args.flags.json ? renderJson(report) : renderHuman(report)) + '\n');
    return;
  }

  // --- Live single repo (portable mode) ---
  const dir = resolve(String(args.flags.dir ?? process.cwd()));
  const input = await resolveAdvisory(args);
  if (input.source === 'osv' && input.advisories.length === 0) return emptyOsv(args, input.label);
  let data;
  try {
    data = analyzeRepo(dir, analyzeOptions(args));
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
  const matches = matchAdvisories(data.graph, input.advisories);
  const exposures = computeExposures(data.graph, matches, data.products, data.nx);
  const report = buildReport(data, input, exposures);
  process.stdout.write((args.flags.json ? renderJson(report) : renderHuman(report)) + '\n');
}

function emptyOsv(args: Args, id: string): void {
  process.stdout.write(
    `  ${id}\n  OSV has no npm-affected packages for this id.\n` +
      `  If you know the package, re-run with --package <name> --range <semver>.\n`,
  );
}

async function cmdIndex(args: Args): Promise<void> {
  const sub = args.positional[0];
  if (args.flags.help || sub === undefined) {
    process.stdout.write(USAGE);
    return;
  }
  const dir = resolve(String(args.flags.dir ?? process.cwd()));
  const repoName = typeof args.flags.repo === 'string' ? String(args.flags.repo) : undefined;

  switch (sub) {
    case 'emit': {
      let slice;
      try {
        slice = buildSlice(dir, { ...analyzeOptions(args), repo: repoName });
      } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
      }
      const json = JSON.stringify(slice, null, 2);
      if (typeof args.flags.out === 'string') {
        writeFileSync(resolve(String(args.flags.out)), json + '\n');
        process.stderr.write(`bojji: wrote slice for ${slice.repo} (fidelity: ${slice.fidelity}) → ${args.flags.out}\n`);
      } else {
        process.stdout.write(json + '\n');
      }
      return;
    }
    case 'publish': {
      if (typeof args.flags.index !== 'string') fail('index publish needs --index <dir>');
      let slice;
      try {
        slice = buildSlice(dir, { ...analyzeOptions(args), repo: repoName });
      } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
      }
      const { slug, path } = publishSlice(String(args.flags.index), slice);
      process.stderr.write(`bojji: published ${slice.repo} [${slice.fidelity}] as ${slug} → ${path}\n`);
      return;
    }
    case 'crawl': {
      if (typeof args.flags.index !== 'string') fail('index crawl needs --index <dir>');
      const indexDir = String(args.flags.index);
      let results;
      if (typeof args.flags.gitlab === 'string') {
        // GUARDED, unexecuted path — needs an env token, never a flag.
        try {
          results = await crawlGitlab({
            gitlabUrl: String(args.flags.gitlab),
            group: String(args.flags.group ?? ''),
            token: process.env.BOJJI_GITLAB_TOKEN,
            indexDir,
            includeSubgroups: args.flags['no-subgroups'] !== true,
          });
        } catch (err) {
          fail(err instanceof Error ? err.message : String(err));
        }
      } else if (typeof args.flags.repos === 'string') {
        const paths = String(args.flags.repos).split(',').map((s) => s.trim()).filter(Boolean);
        if (paths.length === 0) fail('--repos is empty');
        results = crawlLocal(paths, indexDir);
      } else {
        fail('index crawl needs --repos <p1,p2,...> (local) or --gitlab <url> --group <g>');
      }
      const ok = results.filter((r) => r.ok);
      const bad = results.filter((r) => !r.ok);
      for (const r of ok) process.stderr.write(`  ✓ ${r.repo} [${r.fidelity}] — ${r.products} product(s)\n`);
      for (const r of bad) process.stderr.write(`  ✗ ${r.repo} — ${r.error}\n`);
      process.stderr.write(`bojji: crawled ${ok.length}/${results.length} repo(s) into ${resolve(indexDir)}\n`);
      if (ok.length === 0) process.exit(1);
      return;
    }
    default:
      fail(`unknown index subcommand "${sub}". Try: emit | publish | crawl`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  switch (args.cmd) {
    case 'expose':
      await cmdExpose(args);
      break;
    case 'index':
      await cmdIndex(args);
      break;
    case undefined:
    case 'help':
    case '--help':
      process.stdout.write(USAGE);
      break;
    default:
      fail(`unknown command "${args.cmd}". Try: bojji expose --help`);
  }
}

main().catch((err) => {
  process.stderr.write(`bojji: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
