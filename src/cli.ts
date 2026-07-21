#!/usr/bin/env node
import semver from 'semver';
import { existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { loadLockfile, buildGraph } from './lockfile.js';
import { discoverProducts } from './products.js';
import { matchAdvisories, computeExposures } from './expose.js';
import { resolveAdvisories, type Advisory } from './osv.js';
import { loadCodeowners } from './codeowners.js';
import { lockfileFreshness, lastCommitDate } from './freshness.js';
import { renderHuman, renderJson, type Report } from './render.js';

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

Usage:
  bojji expose <CVE|GHSA> [options]           # resolves the package + range via OSV
  bojji expose <label> --package <n> --range <r> [options]   # offline override

Options:
  --dir <path>        Repo root to analyze (default: cwd)
  --lockfile <path>   Path to package-lock.json (default: <dir>/package-lock.json)
  --package <name>    Skip OSV; treat this package as vulnerable
  --range <semver>    Vulnerable range for --package, e.g. "<1.2.6"
  --offline           Fail instead of calling OSV (requires --package/--range)
  --json              Machine-readable output
  --help              Show this help
`;

function fail(msg: string): never {
  process.stderr.write(`bojji: ${msg}\n`);
  process.exit(1);
}

/** Build a single advisory from --package/--range (offline mode). */
function manualAdvisory(pkg: string, range: string): Advisory {
  if (!semver.validRange(range)) fail(`--range "${range}" is not a valid semver range`);
  return {
    id: 'manual',
    cve: 'manual',
    summary: '',
    packageName: pkg,
    rangeText: range,
    matches: (v) => semver.valid(v) !== null && semver.satisfies(v, range, { includePrerelease: true }),
  };
}

async function cmdExpose(args: Args): Promise<void> {
  if (args.flags.help) {
    process.stdout.write(USAGE);
    return;
  }
  const dir = resolve(String(args.flags.dir ?? process.cwd()));
  const lockfilePath = args.flags.lockfile
    ? resolve(String(args.flags.lockfile))
    : join(dir, 'package-lock.json');
  const pkg = args.flags.package;
  const range = args.flags.range;
  const id = args.positional[0];
  if (!existsSync(lockfilePath)) fail(`lockfile not found: ${lockfilePath}`);

  // Decide the advisory source: manual flags win; otherwise resolve via OSV.
  let advisories: Advisory[];
  let source: 'osv' | 'manual';
  let label: string;

  if (typeof pkg === 'string' || typeof range === 'string') {
    if (typeof pkg !== 'string' || typeof range !== 'string') {
      fail('offline mode needs both --package and --range');
    }
    advisories = [manualAdvisory(pkg, range)];
    source = 'manual';
    label = id ?? `${pkg} @ ${range}`;
  } else {
    if (typeof id !== 'string') fail('give a CVE/GHSA id, or use --package with --range');
    if (args.flags.offline) fail('--offline set but no --package/--range given');
    source = 'osv';
    label = id;
    try {
      advisories = await resolveAdvisories(id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      fail(`${msg}\n       (no network? re-run with --package <name> --range <semver>)`);
    }
    if (advisories.length === 0) {
      process.stdout.write(
        `  ${id}\n  OSV has no npm-affected packages for this id.\n` +
          `  If you know the package, re-run with --package <name> --range <semver>.\n`,
      );
      return;
    }
  }

  const lock = loadLockfile(lockfilePath);
  const graph = buildGraph(lock);
  const products = discoverProducts(dir);
  const matches = matchAdvisories(graph, advisories);
  const exposures = computeExposures(graph, matches, products);
  const freshness = lockfileFreshness(dir, relative(dir, lockfilePath) || 'package-lock.json');
  const codeowners = loadCodeowners(dir);
  const codeownersDate = codeowners ? lastCommitDate(dir, codeowners.relPath) : null;

  const report: Report = {
    label,
    source,
    advisories: advisories.map(({ matches: _m, ...info }) => info),
    repoRoot: dir,
    graph,
    products,
    exposures,
    freshness,
    codeowners,
    codeownersDate,
  };
  process.stdout.write((args.flags.json ? renderJson(report) : renderHuman(report)) + '\n');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  switch (args.cmd) {
    case 'expose':
      await cmdExpose(args);
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
