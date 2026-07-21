import semver from 'semver';
import type { AdvisoryInfo } from './types.js';

const OSV_BASE = 'https://api.osv.dev/v1/vulns/';

/** A resolved advisory: display info plus a version predicate for one npm package. */
export interface Advisory extends AdvisoryInfo {
  matches: (version: string) => boolean;
}

interface OsvRange {
  type: string;
  events: Array<Record<string, string>>;
}
interface OsvAffected {
  package?: { ecosystem?: string; name?: string };
  ranges?: OsvRange[];
  versions?: string[];
}
interface OsvRecord {
  id: string;
  summary?: string;
  details?: string;
  aliases?: string[];
  affected?: OsvAffected[];
}

async function fetchRecord(id: string): Promise<OsvRecord | null> {
  const res = await fetch(OSV_BASE + encodeURIComponent(id));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`OSV lookup for ${id} failed: HTTP ${res.status}`);
  return (await res.json()) as OsvRecord;
}

const normIntroduced = (v: string): string => (v === '0' ? '0.0.0' : v);

interface Interval {
  introduced: string;
  fixed?: string;
  last?: string;
}

function intervalsOf(affected: OsvAffected): Interval[] {
  const intervals: Interval[] = [];
  for (const range of affected.ranges ?? []) {
    if (range.type !== 'SEMVER') continue;
    let cur: Interval | null = null;
    for (const ev of range.events) {
      if (ev.introduced !== undefined) {
        cur = { introduced: normIntroduced(ev.introduced) };
        intervals.push(cur);
      } else if (ev.fixed !== undefined && cur) {
        cur.fixed = ev.fixed;
      } else if (ev.last_affected !== undefined && cur) {
        cur.last = ev.last_affected;
      }
    }
  }
  return intervals;
}

function buildMatcher(affected: OsvAffected): ((v: string) => boolean) | null {
  const intervals = intervalsOf(affected);
  const versions = new Set(affected.versions ?? []);
  if (intervals.length === 0 && versions.size === 0) return null;
  return (v: string): boolean => {
    if (versions.has(v)) return true;
    if (!semver.valid(v)) return false;
    for (const iv of intervals) {
      if (!semver.gte(v, iv.introduced)) continue;
      if (iv.fixed !== undefined) {
        if (semver.lt(v, iv.fixed)) return true;
      } else if (iv.last !== undefined) {
        if (semver.lte(v, iv.last)) return true;
      } else {
        return true; // introduced with no upper bound: all later versions
      }
    }
    return false;
  };
}

function rangeText(affected: OsvAffected): string {
  const parts: string[] = [];
  for (const range of affected.ranges ?? []) {
    if (range.type !== 'SEMVER') continue;
    let intro = '0';
    for (const ev of range.events) {
      if (ev.introduced !== undefined) intro = ev.introduced;
      else if (ev.fixed !== undefined) parts.push(`>=${intro} <${ev.fixed}`);
      else if (ev.last_affected !== undefined) parts.push(`>=${intro} <=${ev.last_affected}`);
    }
  }
  const nVersions = affected.versions?.length ?? 0;
  if (parts.length === 0 && nVersions > 0) return `${nVersions} affected version(s)`;
  return parts.join(' || ') || 'all versions';
}

function collectNpm(rec: OsvRecord, cve: string): Advisory[] {
  const out: Advisory[] = [];
  for (const a of rec.affected ?? []) {
    if (a.package?.ecosystem !== 'npm' || !a.package.name) continue;
    const matcher = buildMatcher(a);
    if (!matcher) continue;
    out.push({
      id: rec.id,
      cve,
      summary: rec.summary ?? rec.details?.split('\n')[0] ?? '',
      packageName: a.package.name,
      rangeText: rangeText(a),
      matches: matcher,
    });
  }
  return out;
}

/**
 * Resolve a CVE/GHSA id to npm advisories. OSV's CVE records are often
 * ecosystem-agnostic (package: null); the npm ranges live in the GHSA alias, so
 * we follow aliases when the primary record carries no npm data.
 */
export async function resolveAdvisories(id: string): Promise<Advisory[]> {
  const primary = await fetchRecord(id);
  if (!primary) throw new Error(`OSV has no record for ${id}.`);
  let advisories = collectNpm(primary, id);
  if (advisories.length === 0) {
    for (const alias of primary.aliases ?? []) {
      if (!/^GHSA-/i.test(alias)) continue;
      const rec = await fetchRecord(alias);
      if (rec) advisories = collectNpm(rec, id);
      if (advisories.length > 0) break;
    }
  }
  return advisories;
}
