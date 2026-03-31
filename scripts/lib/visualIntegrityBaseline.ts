/**
 * Visual integrity baseline — strict regression gate for `style={{` in scoped client trees.
 * Canonical: docs-governance/canonical/VISUAL_INTEGRITY_GOVERNANCE_V1.md
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

export const STYLE_OPEN_RX = /style=\{\{/g;

export type BaselineFile =
  | {
      version: 1;
      maxInlineStyleOpenings: number;
      scopedRoots: string[];
      note?: string;
    }
  | {
      version: 2;
      scopedRoots: string[];
      /** Repo-relative paths (forward slashes). Max allowed `style={{` count per file; ratchet down over time. */
      grandfatheredMaxStyleOpens: Record<string, number>;
      /** Optional legacy cap — ignored when v2 grandfather map is used for strict check */
      maxInlineStyleOpenings?: number;
      note?: string;
    };

export function loadBaseline(cwd: string, configPath: string): BaselineFile {
  const raw = readFileSync(join(cwd, configPath), 'utf8');
  return JSON.parse(raw) as BaselineFile;
}

function walkTsx(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    const p = join(dir, name);
    try {
      if (statSync(p).isDirectory()) walkTsx(p, acc);
      else if (/\.tsx$/.test(name)) acc.push(p);
    } catch {
      /* skip */
    }
  }
  return acc;
}

export function countStyleOpens(src: string): number {
  const m = src.match(STYLE_OPEN_RX);
  return m?.length ?? 0;
}

export interface StrictCheckResult {
  ok: boolean;
  errors: string[];
  /** repo-relative -> count */
  counts: Record<string, number>;
  total: number;
}

/**
 * Strict: files with inline styles must be listed in grandfatheredMaxStyleOpens; actual <= cap.
 * Files with zero need not be listed. Unlisted file with count > 0 => fail (new inline styles).
 */
export function checkStrictGrandfather(
  cwd: string,
  baseline: Extract<BaselineFile, { version: 2 }>,
): StrictCheckResult {
  const errors: string[] = [];
  const counts: Record<string, number> = {};
  let total = 0;

  const clientRoot = join(cwd, 'client/src');
  const caps = baseline.grandfatheredMaxStyleOpens;

  for (const scope of baseline.scopedRoots) {
    const relRoot = scope.replace(/^client\/src\/?/, '');
    const dir = join(clientRoot, relRoot);
    for (const file of walkTsx(dir)) {
      const src = readFileSync(file, 'utf8');
      const n = countStyleOpens(src);
      const rel = relative(cwd, file).replace(/\\/g, '/');
      counts[rel] = n;
      total += n;

      if (n === 0) continue;

      const cap = caps[rel];
      if (cap === undefined) {
        errors.push(
          `[visual-strict] ${rel}: ${n} inline style={{ — not grandfathered. New presentation inline styles are forbidden; use tokens / Shadcn MCP (VISUAL_INTEGRITY_GOVERNANCE_V1.md).`,
        );
        continue;
      }
      if (n > cap) {
        errors.push(
          `[visual-strict] ${rel}: ${n} inline style={{ exceeds grandfathered cap ${cap}. Remove styles or bump cap with explicit governance PR.`,
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, counts, total };
}

/** v1 fallback: total count only */
export function checkLegacyTotal(
  cwd: string,
  baseline: Extract<BaselineFile, { version: 1 }>,
): { total: number; ok: boolean; errors: string[] } {
  const STYLE_RX = STYLE_OPEN_RX;
  let total = 0;
  const clientRoot = join(cwd, 'client/src');
  const scopes = baseline.scopedRoots.map((s) => s.replace(/^client\/src\/?/, ''));
  const errors: string[] = [];

  for (const scope of scopes) {
    const dir = join(clientRoot, scope);
    for (const file of walkTsx(dir)) {
      const src = readFileSync(file, 'utf8');
      const m = src.match(STYLE_RX);
      total += m?.length ?? 0;
    }
  }
  const ok = total <= baseline.maxInlineStyleOpenings;
  if (!ok) {
    errors.push(
      `[visual-legacy] total inline style={{ ${total} > max ${baseline.maxInlineStyleOpenings}`,
    );
  }
  return { total, ok, errors };
}
