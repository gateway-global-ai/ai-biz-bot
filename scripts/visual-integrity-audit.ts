/**
 * Visual integrity audit — inline `style={{` usage in OS/canvas-scoped paths.
 * See docs-governance/canonical/VISUAL_INTEGRITY_GOVERNANCE_V1.md
 *
 * Usage:
 *   npm run governance:visual-integrity
 *   npm run governance:visual-integrity -- --strict
 *   npm run governance:visual-integrity -- --strict --config path/to/baseline.json
 */
import {
  loadBaseline,
  checkStrictGrandfather,
  checkLegacyTotal,
  type BaselineFile,
} from './lib/visualIntegrityBaseline';

function parseArgs() {
  const argv = process.argv.slice(2);
  const strict = argv.includes('--strict');
  const ci = argv.includes('--ci');
  let config = 'docs-governance/artifacts/visual-integrity-inline-style-baseline.json';
  const cidx = argv.indexOf('--config');
  if (cidx !== -1 && argv[cidx + 1]) config = argv[cidx + 1];
  return { strict, ci, config };
}

function main() {
  const cwd = process.cwd();
  const { strict, ci, config } = parseArgs();

  console.log('Visual integrity audit — inline style={{ occurrences (canvas/OS scope)\n');
  console.log('Canonical: docs-governance/canonical/VISUAL_INTEGRITY_GOVERNANCE_V1.md\n');

  let baseline: BaselineFile;
  try {
    baseline = loadBaseline(cwd, config);
  } catch (e) {
    console.error('Failed to load baseline:', config, e);
    process.exit(1);
    return;
  }

  if (strict && baseline.version === 2) {
    const r = checkStrictGrandfather(cwd, baseline);
    const sorted = Object.entries(r.counts)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1]);
    for (const [rel, n] of sorted) {
      const cap = baseline.grandfatheredMaxStyleOpens[rel];
      const tag = cap !== undefined ? ` (cap ${cap})` : ' (NOT GRANDFATHERED)';
      console.log(`${String(n).padStart(4)}  ${rel}${tag}`);
    }
    console.log(`\nTotal: ${r.total} (strict mode)`);
    if (r.errors.length) {
      console.error('\n--- STRICT VISUAL INTEGRITY FAILED ---\n');
      for (const m of r.errors) console.error(m);
      process.exit(1);
    }
    console.log('\nStrict visual integrity: OK (no regression vs grandfather caps)');
    return;
  }

  if (strict && baseline.version === 1) {
    const r = checkLegacyTotal(cwd, baseline);
    console.log(`Total: ${r.total} / max ${baseline.maxInlineStyleOpenings} (legacy v1 baseline)`);
    if (!r.ok) {
      for (const m of r.errors) console.error(m);
      process.exit(1);
    }
    return;
  }

  // Report mode (non-strict)
  if (baseline.version === 2) {
    const r = checkStrictGrandfather(cwd, baseline);
    const sorted = Object.entries(r.counts)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1]);
    for (const [rel, n] of sorted) {
      console.log(`${String(n).padStart(4)}  ${rel}`);
    }
    console.log(`\nTotal: ${r.total} matches`);
    if (r.errors.length && ci) {
      for (const m of r.errors) console.error(m);
      process.exit(1);
    }
  } else {
    const r = checkLegacyTotal(cwd, baseline as Extract<BaselineFile, { version: 1 }>);
    console.log(`Total: ${r.total} (legacy v1 cap ${(baseline as Extract<BaselineFile, { version: 1 }>).maxInlineStyleOpenings})`);
  }

  console.log('\nRun with --strict to enforce grandfather caps (same logic as sovereign-gate-governance.ts).');
}

main();
