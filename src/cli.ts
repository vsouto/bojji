#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { loadLockfile, buildGraph } from './lockfile.js';
import { discoverProducts } from './products.js';
import { findMatches, computeExposures } from './expose.js';
import { lockfileFreshness } from './freshness.js';
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
  bojji expose [<CVE|label>] --package <name> --range <semver> [options]

M0 (walking skeleton): match by --package/--range against a real lockfile and
print the exposed product(s) with the transitive path that proves it. OSV
lookup (resolving a CVE to package+range automatically) arrives in M1.

Options:
  --dir <path>        Repo root to analyze (default: cwd)
  --lockfile <path>   Path to package-lock.json (default: <dir>/package-lock.json)
  --package <name>    Package name to treat as vulnerable (required in M0)
  --range <semver>    Vulnerable version range, e.g. "<1.2.6" (required in M0)
  --json              Machine-readable output
  --help              Show this help
`;

function fail(msg: string): never {
  process.stderr.write(`bojji: ${msg}\n`);
  process.exit(1);
}

function cmdExpose(args: Args): void {
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
  const label = args.positional[0] ?? '(no CVE given — M0 matches by --package/--range)';

  if (typeof pkg !== 'string') fail('--package <name> is required in M0');
  if (typeof range !== 'string') fail('--range <semver> is required in M0');
  if (!existsSync(lockfilePath)) fail(`lockfile not found: ${lockfilePath}`);

  const lock = loadLockfile(lockfilePath);
  const graph = buildGraph(lock);
  const products = discoverProducts(dir);
  const matches = findMatches(graph, pkg, range);
  const exposures = computeExposures(graph, matches, products);
  const freshness = lockfileFreshness(dir, relative(dir, lockfilePath) || 'package-lock.json');

  const report: Report = { label, pkg, range, repoRoot: dir, graph, products, exposures, freshness };
  process.stdout.write((args.flags.json ? renderJson(report) : renderHuman(report)) + '\n');
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  switch (args.cmd) {
    case 'expose':
      cmdExpose(args);
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

main();
