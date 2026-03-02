#!/usr/bin/env tsx
/**
 * check-env-manifest.ts — Sovereign Configuration & Provider Cleanliness Check
 *
 * Two checks in one:
 *
 * Check 1 — Manifest Completeness:
 *   Every key declared in .env.example must be documented in
 *   docs/SOVEREIGN_ENV_MANIFEST.md (the Naming Constitution).
 *
 * Check 2 — Provider Cleanliness:
 *   No banned AI provider references (Kimi, OpenAI, Anthropic,
 *   HuggingFace, Replicate) anywhere in server/, client/src/, or .env.example.
 *
 * Usage:
 *   npm run check-env-manifest
 *   npx tsx scripts/check-env-manifest.ts
 *
 * Exit 0: sovereign and clean. Exit 1: violations found.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const RED   = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD  = '\x1b[1m';
const RESET = '\x1b[0m';

const repoRoot = join(new URL(import.meta.url).pathname, '..', '..');

// ─── Check 1: Manifest Completeness ──────────────────────────────────────────

function getEnvExampleKeys(): string[] {
  const envPath = join(repoRoot, '.env.example');
  if (!existsSync(envPath)) return [];
  const keys = new Set<string>();
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) keys.add(match[1]);
  }
  return [...keys].sort();
}

function checkManifestCompleteness(): string[] {
  const manifestPath = join(repoRoot, 'docs', 'SOVEREIGN_ENV_MANIFEST.md');
  if (!existsSync(manifestPath)) {
    return ['docs/SOVEREIGN_ENV_MANIFEST.md does not exist — create it before committing .env.example changes.'];
  }
  const manifestContent = readFileSync(manifestPath, 'utf-8');
  const keys = getEnvExampleKeys();
  const missing: string[] = [];
  for (const key of keys) {
    if (!manifestContent.includes(key)) {
      missing.push(`  Key "${key}" is in .env.example but not documented in SOVEREIGN_ENV_MANIFEST.md`);
    }
  }
  return missing;
}

// ─── Check 2: Provider Cleanliness ───────────────────────────────────────────

const BANNED: Array<{ label: string; pattern: RegExp }> = [
  { label: 'Kimi/Moonshot',  pattern: /kimi|moonshot|MOONSHOT|KIMI|kimiAudio|Qwen\/Kimi/gi },
  { label: 'OpenAI',         pattern: /OPENAI_API_KEY|openai\.OpenAI|api\.openai\.com/gi },
  { label: 'Anthropic',      pattern: /ANTHROPIC_API_KEY|api\.anthropic\.com|claude-[0-9]/gi },
  { label: 'HuggingFace',    pattern: /HUGGINGFACE_TOKEN|huggingface\.co\/models/gi },
  { label: 'Replicate',      pattern: /REPLICATE_API_TOKEN|replicate\.run\//gi },
];

const SCAN_TARGETS = ['server', 'client/src', '.env.example'];

const EXCLUDE: RegExp[] = [
  /node_modules/, /_legacy_archive/, /\.git\//, /dist\//,
  /\.cursor\/rules\//, /SOVEREIGN_ENV_MANIFEST/,
  /check-env-manifest\.ts$/, /sovereign-guard\.ts$/,
];

const SCAN_EXT = /\.(ts|tsx|js|jsx|mjs|env|example|md)$/;

function walkDir(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const stat = statSync(dir);
  if (stat.isFile()) return [dir];
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (EXCLUDE.some(ex => ex.test(full))) continue;
    if (statSync(full).isDirectory()) {
      files.push(...walkDir(full));
    } else if (SCAN_EXT.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function checkProviderCleanliness(): Array<{ file: string; line: number; label: string; match: string }> {
  const hits: Array<{ file: string; line: number; label: string; match: string }> = [];
  const allFiles: string[] = [];
  for (const target of SCAN_TARGETS) {
    allFiles.push(...walkDir(join(repoRoot, target)));
  }
  for (const file of allFiles) {
    const rel = relative(repoRoot, file);
    if (EXCLUDE.some(ex => ex.test(rel))) continue;
    let content: string;
    try { content = readFileSync(file, 'utf-8'); } catch { continue; }
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
      for (const { label, pattern } of BANNED) {
        pattern.lastIndex = 0;
        const match = pattern.exec(line);
        if (match) hits.push({ file: rel, line: i + 1, label, match: match[0] });
      }
    }
  }
  return hits;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log(`\n${BOLD}Sovereign Configuration & Provider Cleanliness Check${RESET}`);
  console.log('─'.repeat(52));

  let failed = false;

  // Check 1
  console.log(`\n${BOLD}Check 1: Manifest Completeness${RESET}`);
  const manifestErrors = checkManifestCompleteness();
  if (manifestErrors.length === 0) {
    const keys = getEnvExampleKeys();
    console.log(`${GREEN}✓ All ${keys.length} .env.example keys documented in SOVEREIGN_ENV_MANIFEST.md${RESET}`);
  } else {
    failed = true;
    console.log(`${RED}✗ ${manifestErrors.length} undocumented key(s):${RESET}`);
    manifestErrors.forEach(e => console.log(`${YELLOW}${e}${RESET}`));
    console.log(`\n  → Add each key to docs/SOVEREIGN_ENV_MANIFEST.md before committing.`);
  }

  // Check 2
  console.log(`\n${BOLD}Check 2: Provider Cleanliness${RESET}`);
  const providerHits = checkProviderCleanliness();
  if (providerHits.length === 0) {
    console.log(`${GREEN}✓ Sole provider: Google Gemini. Zero banned references detected.${RESET}`);
  } else {
    failed = true;
    console.log(`${RED}✗ ${providerHits.length} banned provider reference(s):${RESET}`);
    for (const h of providerHits) {
      console.log(`  ${RED}[${h.label}]${RESET} ${YELLOW}${h.file}:${h.line}${RESET} — "${h.match}"`);
    }
  }

  console.log('');
  if (failed) {
    console.log(`${RED}${BOLD}SOVEREIGN_CONFIGURATION_ERROR: Fix violations above and re-run.${RESET}\n`);
    process.exit(1);
  }
  console.log(`${GREEN}${BOLD}All checks passed. Sovereign manifest is clean.${RESET}\n`);
  process.exit(0);
}

main();
