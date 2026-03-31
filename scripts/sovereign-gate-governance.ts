#!/usr/bin/env npx tsx
/**
 * Sovereign Gate — Governance artifact checks (single-lane plan).
 *
 * Phase 1: INTEGRATION_GOVERNANCE_INVENTORY_V1.md must not contain placeholder TBD
 *          when PR touches server/routes/ or scripts/ trees.
 * Phase 2: Visual baseline — inline style={{ count in scoped client trees ≤ baseline.
 * Option C: sendCloudbedsGraphqlDiscoveryOnboardingSms.ts must retain fail-closed actor check.
 * Changed-file anti-artboard: changed client .tsx files must not use banned patterns.
 *
 * CI: invoked with --file-list <path> (newline-separated paths), same as sovereign-guard.ts
 *
 * See: docs-governance/canonical/VISUAL_INTEGRITY_GOVERNANCE_V1.md
 *      docs-governance/artifacts/INTEGRATION_GOVERNANCE_INVENTORY_V1.md
 */
import { readFileSync } from 'fs';
import { join, relative } from 'path';
import { loadBaseline, checkStrictGrandfather, checkLegacyTotal } from './lib/visualIntegrityBaseline';

const INVENTORY_PATH = join(process.cwd(), 'docs-governance/artifacts/INTEGRATION_GOVERNANCE_INVENTORY_V1.md');
const BASELINE_REL = 'docs-governance/artifacts/visual-integrity-inline-style-baseline.json';
const SMS_SERVICE = join(process.cwd(), 'server/services/sendCloudbedsGraphqlDiscoveryOnboardingSms.ts');

/** Banned in changed client TSX (artboard bypass — literal hex in class strings). Token `bg-[${CANVAS.bg}]` does not match. */
const BANNED_IN_CHANGED_CLIENT: Array<{ name: string; rx: RegExp }> = [
  { name: 'ARBITRARY_HEX_BG_CLASS', rx: /bg-\[#[0-9a-fA-F]{3,8}\]/ },
  { name: 'INLINE_COLOR_HEX_IN_STYLE', rx: /color:\s*['"]#/ },
];

function readChangedFiles(): string[] {
  const idx = process.argv.indexOf('--file-list');
  if (idx !== -1 && process.argv[idx + 1]) {
    return readFileSync(process.argv[idx + 1], 'utf8').split('\n').filter(Boolean);
  }
  return [];
}

function inventoryHasTbdPlaceholder(md: string): boolean {
  // Word-boundary TBD / to be determined — not substrings inside other words
  return /\bTBD\b/i.test(md) || /\bTO\s+BE\s+DETERMINED\b/i.test(md);
}

function assertOptionC(sms: string): void {
  if (!sms.includes('code: "MISSING_ACTOR_CONTEXT"')) {
    throw new Error('Option C: return branch with code: "MISSING_ACTOR_CONTEXT" must exist');
  }
  if (!sms.includes('!dryRun && !actorTrimmed')) {
    throw new Error('Option C: fail-closed guard !dryRun && !actorTrimmed must exist');
  }
  if (!sms.includes('actorAdminUserId')) {
    throw new Error('Option C: actorAdminUserId must appear in SMS service');
  }
}

function main() {
  const errors: string[] = [];
  const changed = readChangedFiles();

  const touchesRoutesOrScripts = changed.some(
    (p) => p.startsWith('server/routes/') || p.startsWith('scripts/'),
  );

  // ── Phase 1 inventory gate ─────────────────────────────────────────────
  if (touchesRoutesOrScripts) {
    const inv = readFileSync(INVENTORY_PATH, 'utf8');
    if (inventoryHasTbdPlaceholder(inv)) {
      errors.push(
        `[Phase 1 gate] ${relative(process.cwd(), INVENTORY_PATH)} must not contain placeholder TBD (or update inventory in same PR). Touches: server/routes or scripts/`,
      );
    }
  }

  // ── Visual strict baseline (v2 grandfather) or v1 legacy total ────────
  let visualTotal = 0;
  let visualLabel = '';
  try {
    const baseline = loadBaseline(process.cwd(), BASELINE_REL);
    if (baseline.version === 2) {
      const r = checkStrictGrandfather(process.cwd(), baseline);
      visualTotal = r.total;
      visualLabel = `strict caps (${Object.keys(baseline.grandfatheredMaxStyleOpens).length} grandfathered files)`;
      errors.push(...r.errors);
    } else {
      const r = checkLegacyTotal(process.cwd(), baseline);
      visualTotal = r.total;
      visualLabel = `legacy max ${baseline.maxInlineStyleOpenings}`;
      errors.push(...r.errors);
    }
  } catch (e: unknown) {
    errors.push(
      `[Visual gate] ${relative(process.cwd(), join(process.cwd(), BASELINE_REL))}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // ── Option C static check (always) ─────────────────────────────────────
  try {
    assertOptionC(readFileSync(SMS_SERVICE, 'utf8'));
  } catch (e: unknown) {
    errors.push(`[Option C] ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── Changed-file anti-artboard (client only) ───────────────────────────
  for (const rel of changed) {
    if (!rel.startsWith('client/') || !rel.endsWith('.tsx')) continue;
    const abs = join(process.cwd(), rel);
    let src: string;
    try {
      src = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    for (const { name, rx } of BANNED_IN_CHANGED_CLIENT) {
      rx.lastIndex = 0;
      if (rx.test(src)) {
        errors.push(`[Anti-artboard] ${rel}: banned pattern (${name}) — use tokens / Shadcn MCP path per VISUAL_INTEGRITY_GOVERNANCE_V1.md`);
      }
    }
  }

  console.log(`Sovereign governance gate: inline-style total=${visualTotal} (${visualLabel})`);
  if (touchesRoutesOrScripts) {
    console.log('Phase 1 inventory gate: active (routes/scripts touched)');
  }

  if (errors.length) {
    console.error('\n--- SOVEREIGN GOVERNANCE GATE FAILED ---\n');
    for (const m of errors) console.error(m);
    process.exit(1);
  }
  console.log('Sovereign governance gate: OK');
}

main();
