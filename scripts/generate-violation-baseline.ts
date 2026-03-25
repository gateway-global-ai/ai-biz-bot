#!/usr/bin/env tsx
/**
 * Generate Violation Baseline
 *
 * Scans all .ts/.tsx files using the same rules as sovereign-guard.ts
 * and emits governance/violation-baseline.json.
 *
 * Run after each remediation pass to shrink the baseline:
 *   npx tsx scripts/generate-violation-baseline.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface BaselineViolation {
  line: number;
  match: string;
}

interface BaselineEntry {
  [ruleType: string]: BaselineViolation[];
}

interface Baseline {
  generated_at: string;
  baseline_commit: string;
  scan_dirs: string[];
  summary: {
    total: number;
    by_type: Record<string, number>;
    by_file_count: number;
  };
  violations: Record<string, BaselineEntry>;
}

const CONTENT_RULES: Array<{
  name: string;
  pattern: RegExp;
  fileGlob: RegExp;
}> = [
  {
    name: 'HARDCODED_MODEL_ID',
    pattern: /['"`](gemini-[\d.]+-flash[^'"`]*|gemini-[\d.]+-pro[^'"`]*)['"`]/g,
    fileGlob: /\.(ts|tsx|js|jsx|mjs)$/,
  },
  {
    name: 'UI_DESIGN_VIOLATION',
    pattern: /\bbg-white\b(?!\/)|(?<!\w)rounded-xl\b|(?<!\w)rounded-lg\b(?!\s*\/\/)|\btext-gray-\d/g,
    fileGlob: /client\/.*\.tsx$/,
  },
];

const SCAN_DIRS = ['client/src', 'server', 'shared', 'os-core'];

function getCommitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function collectFiles(dir: string): string[] {
  const absDir = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(absDir)) return [];

  const results: string[] = [];
  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        walk(full);
      } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
        results.push(path.relative(process.cwd(), full));
      }
    }
  }
  walk(absDir);
  return results;
}

function scanFile(filePath: string): BaselineEntry {
  const entry: BaselineEntry = {};
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (const rule of CONTENT_RULES) {
    if (!rule.fileGlob.test(filePath)) continue;

    const hits: BaselineViolation[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.pattern.exec(line)) !== null) {
        hits.push({
          line: i + 1,
          match: match[0].substring(0, 80),
        });
      }
    }
    if (hits.length > 0) {
      entry[rule.name] = hits;
    }
  }

  return entry;
}

function main() {
  console.log('Generating violation baseline...\n');

  const allFiles: string[] = [];
  for (const dir of SCAN_DIRS) {
    const files = collectFiles(dir);
    allFiles.push(...files);
  }
  console.log(`Scanning ${allFiles.length} files across ${SCAN_DIRS.join(', ')}...`);

  const violations: Record<string, BaselineEntry> = {};
  const typeCounts: Record<string, number> = {};
  let total = 0;

  for (const file of allFiles) {
    const entry = scanFile(file);
    if (Object.keys(entry).length > 0) {
      violations[file] = entry;
      for (const [ruleType, hits] of Object.entries(entry)) {
        typeCounts[ruleType] = (typeCounts[ruleType] || 0) + hits.length;
        total += hits.length;
      }
    }
  }

  const baseline: Baseline = {
    generated_at: new Date().toISOString(),
    baseline_commit: getCommitHash(),
    scan_dirs: SCAN_DIRS,
    summary: {
      total,
      by_type: typeCounts,
      by_file_count: Object.keys(violations).length,
    },
    violations,
  };

  const outPath = path.resolve(process.cwd(), 'governance/violation-baseline.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(baseline, null, 2) + '\n');

  console.log(`\nBaseline written to: governance/violation-baseline.json`);
  console.log(`  Total violations: ${total}`);
  console.log(`  Files affected: ${Object.keys(violations).length}`);
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log(`  ${type}: ${count}`);
  }
}

main();
