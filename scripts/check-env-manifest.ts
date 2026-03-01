#!/usr/bin/env tsx
/**
 * check-env-manifest.ts — Sovereign Provider Cleanliness Scanner
 *
 * Scans server/, client/src/, and .env.example for any banned AI provider
 * references. Gemini is the sole authorized provider on this platform.
 *
 * Usage:
 *   npm run check-env-manifest
 *   npx tsx scripts/check-env-manifest.ts
 *
 * Exit 0: clean. Exit 1: violations found.
 */

import * as fs from 'fs';
import * as path from 'path';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ─── Banned patterns ─────────────────────────────────────────────────────────

const BANNED: Array<{ label: string; pattern: RegExp }> = [
  { label: 'Kimi/Moonshot',   pattern: /kimi|moonshot|MOONSHOT|KIMI|kimiAudio|Qwen\/Kimi/gi },
  { label: 'OpenAI',          pattern: /OPENAI_API_KEY|openai\.OpenAI|api\.openai\.com/gi },
  { label: 'Anthropic',       pattern: /ANTHROPIC_API_KEY|api\.anthropic\.com|claude-[0-9]/gi },
  { label: 'HuggingFace',     pattern: /HUGGINGFACE_TOKEN|huggingface\.co\/models/gi },
  { label: 'Replicate',       pattern: /REPLICATE_API_TOKEN|replicate\.run\//gi },
];

// ─── Directories and files to scan ───────────────────────────────────────────

const SCAN_TARGETS = [
  'server',
  'client/src',
  '.env.example',
];

// Exclude these paths
const EXCLUDE: RegExp[] = [
  /node_modules/,
  /_legacy_archive/,
  /\.git\//,
  /dist\//,
  /\.cursor\/rules\//,   // rules may reference provider names for documentation
  /SOVEREIGN_ENV_MANIFEST/, // manifest intentionally lists decommissioned providers
  /check-env-manifest\.ts$/, // this file itself lists the patterns
  /sovereign-guard\.ts$/,    // guard file lists banned patterns
];

// File extensions to scan
const SCAN_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|env|example|md)$/;

// ─── Walk directory ───────────────────────────────────────────────────────────

function walkDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const stat = fs.statSync(dir);
  if (stat.isFile()) return [dir];

  const files: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (EXCLUDE.some(ex => ex.test(full))) continue;
    const s = fs.statSync(full);
    if (s.isDirectory()) {
      files.push(...walkDir(full));
    } else if (SCAN_EXTENSIONS.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const root = process.cwd();
  console.log(`\n${BOLD}Sovereign Env Manifest — Provider Cleanliness Check${RESET}`);
  console.log('─'.repeat(52));
  console.log(`Scanning from: ${root}\n`);

  const allFiles: string[] = [];
  for (const target of SCAN_TARGETS) {
    allFiles.push(...walkDir(path.join(root, target)));
  }

  const hits: Array<{ file: string; line: number; label: string; match: string }> = [];

  for (const file of allFiles) {
    const rel = path.relative(root, file);
    if (EXCLUDE.some(ex => ex.test(rel))) continue;

    let content: string;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

      for (const { label, pattern } of BANNED) {
        pattern.lastIndex = 0;
        const match = pattern.exec(line);
        if (match) {
          hits.push({ file: rel, line: i + 1, label, match: match[0] });
        }
      }
    }
  }

  if (hits.length === 0) {
    console.log(`${GREEN}${BOLD}Sovereign manifest clean.${RESET}`);
    console.log(`${GREEN}Sole provider: Google Gemini.${RESET}`);
    console.log(`${GREEN}Zero banned provider references detected across ${allFiles.length} files.${RESET}\n`);
    process.exit(0);
  }

  console.log(`${RED}${BOLD}MANIFEST VIOLATION — ${hits.length} banned reference(s) found${RESET}\n`);
  for (const h of hits) {
    console.log(`${RED}✗ [${h.label}]${RESET} ${YELLOW}${h.file}:${h.line}${RESET} — "${h.match}"`);
  }
  console.log(`\n${BOLD}Remove all banned provider references and re-run.${RESET}\n`);
  process.exit(1);
}

main();
