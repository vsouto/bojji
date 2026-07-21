import type { Product } from './types.js';
import { type CodeownersFile, ownerFor, ownerKind } from './codeowners.js';

export interface OwnerResolution {
  /** Owner tokens from the matched CODEOWNERS rule (teams and/or individuals). */
  owners: string[];
  /** The CODEOWNERS glob that matched, for provenance. */
  pattern: string | null;
  /** high = a rule of teams; medium = rule includes individuals; none = no rule. */
  confidence: 'high' | 'medium' | 'none';
  /** True when the matched rule names any individual (routing risk). */
  hasIndividual: boolean;
}

const NO_RULE: OwnerResolution = {
  owners: [],
  pattern: null,
  confidence: 'none',
  hasIndividual: false,
};

/**
 * Derive ownership for a product from CODEOWNERS, live, at read time. Nothing is
 * stored. Points at whatever the rule names (we prefer teams and flag people),
 * and returns "no rule" honestly when nothing covers the path.
 */
export function resolveOwner(co: CodeownersFile | null, product: Product): OwnerResolution {
  if (!co) return NO_RULE;
  // The root project matches only a catch-all rule; libs/apps match by their dir.
  const rule = ownerFor(co, product.dir);
  if (!rule || rule.owners.length === 0) return NO_RULE;
  const hasIndividual = rule.owners.some((o) => ownerKind(o) === 'individual');
  return {
    owners: rule.owners,
    pattern: rule.pattern,
    confidence: hasIndividual ? 'medium' : 'high',
    hasIndividual,
  };
}
