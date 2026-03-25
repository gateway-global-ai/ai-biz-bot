#!/usr/bin/env tsx
/**
 * Sovereign Guard — Pre-commit Rule Enforcement
 *
 * Scans staged files for violations of the Sovereign Lockdown Rules.
 * Runs as a pre-commit hook. Exit 1 blocks the commit.
 *
 * To bypass in a genuine emergency: git commit --no-verify
 * WARNING: Bypasses are logged. You will be asked to explain.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

interface Violation {
  file: string;
  line: number;
  rule: string;
  match: string;
  remedy: string;
}

// ─── Rule Definitions ───────────────────────────────────────────────────────

const RULES: Array<{
  name: string;
  pattern: RegExp;
  fileGlob: RegExp;
  remedy: string;
}> = [
  // Rule 1: No hardcoded AI model strings
  {
    name: 'HARDCODED_MODEL_ID',
    pattern: /['"`](gemini-[\d.]+-flash[^'"`]*|gemini-[\d.]+-pro[^'"`]*)['"`]/g,
    fileGlob: /\.(ts|tsx|js|jsx|mjs)$/,
    remedy: 'Use process.env.GEMINI_MODEL_ID from Doppler. Never hardcode model strings.',
  },
  // Rule 2: No banned AI providers
  {
    name: 'BANNED_PROVIDER',
    pattern: /moonshot\.ai|api\.anthropic\.com|api\.openai\.com|MOONSHOT_API_KEY|ANTHROPIC_API_KEY|OPENAI_API_KEY|kimi-k2|moonshot-v1/gi,
    fileGlob: /server\/.*\.(ts|js)$/,
    remedy: 'Gemini is the sole AI provider. Remove all references to other providers.',
  },
  // Rule 3: No hardcoded Twilio credentials
  {
    name: 'HARDCODED_TWILIO_CREDENTIAL',
    pattern: /AC[a-f0-9]{32}|SK[a-f0-9]{32}|['"`]MG[a-f0-9]{32}['"`]/g,
    fileGlob: /\.(ts|tsx|js|jsx)$/,
    remedy: 'Twilio SIDs must come from Doppler env vars. Never hardcode.',
  },
  // Rule 4: No hardcoded phone numbers in server code
  {
    name: 'HARDCODED_PHONE_NUMBER',
    pattern: /['"`]\+1[2-9]\d{9}['"`]/g,
    fileGlob: /server\/.*\.(ts|js)$/,
    remedy: 'Phone numbers must come from Doppler (TWILIO_PHONE_NUMBER). Never hardcode.',
  },
  // Rule 5: No API secrets in client code
  {
    name: 'SECRET_IN_CLIENT',
    pattern: /GEMINI_API_KEY|TWILIO_AUTH_TOKEN|STRIPE_SECRET_KEY|GOOGLE_PLACES_API_KEY|DATABASE_URL/g,
    fileGlob: /client\/.*\.(ts|tsx|js|jsx)$/,
    remedy: 'Secrets must never appear in client code. Use server proxy endpoints.',
  },
  // Rule 6: No direct Twilio message creation outside the SMS router
  {
    name: 'SMS_ROUTER_BYPASS',
    pattern: /client\.messages\.create|twilio\.messages\.create/g,
    fileGlob: /server\/(?!services\/smsRouter|routes\/twilioWebhooks).*\.(ts|js)$/,
    remedy: 'All SMS must go through the Sovereign SMS Router (smsRouter.ts). No direct creates.',
  },
  // Rule 7: UI — no prohibited Tailwind classes
  {
    name: 'UI_DESIGN_VIOLATION',
    pattern: /\bbg-white\b(?!\/)|(?<!\w)rounded-xl\b|(?<!\w)rounded-lg\b(?!\s*\/\/)|\btext-gray-\d/g,
    fileGlob: /client\/.*\.tsx$/,
    remedy: 'Jason Standard: use bg-slate-*, rounded-sui, text-slate-*. Read sovereign-ui-lockdown.mdc.',
  },
  // Rule 8: No modifications to protected voice files (check if they are staged)
  {
    name: 'VOICE_PIPELINE_MODIFICATION',
    pattern: /.*/,
    fileGlob: /server\/(geminiVoice|voiceStream|voiceGemini|voiceSession|audioCodec)\.ts$|server\/config\/geminiLiveProtocol\.ts$/,
    remedy: 'Voice pipeline is in LOCKDOWN. Modifications require explicit CTO approval. See sovereign-voice-lockdown.mdc.',
  },
  // Rule 9: No modifications to Twilio webhook validation
  {
    name: 'TWILIO_WEBHOOK_MODIFICATION',
    pattern: /.*/,
    fileGlob: /server\/routes\/twilioWebhooks\.ts$|server\/services\/smsRouter\.ts$/,
    remedy: 'Twilio compliance infrastructure is LOCKED. See sovereign-twilio-lockdown.mdc.',
  },
];

// ─── Get staged files ────────────────────────────────────────────────────────

function getStagedFiles(): string[] {
  // CI mode: accept external file list via --file-list flag
  const fileListArg = process.argv.indexOf("--file-list");
  if (fileListArg !== -1 && process.argv[fileListArg + 1]) {
    const listPath = process.argv[fileListArg + 1];
    return fs.readFileSync(listPath, "utf8").split("\n").filter(Boolean);
  }
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf8',
    });
    return output.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

// ─── Check a single file ─────────────────────────────────────────────────────

function checkFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const fullPath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) return violations;
  if (fs.statSync(fullPath).isDirectory()) return violations;

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  for (const rule of RULES) {
    if (!rule.fileGlob.test(filePath)) continue;

    // For lockdown rules that flag ANY modification to protected files
    if (rule.name === 'VOICE_PIPELINE_MODIFICATION' || rule.name === 'TWILIO_WEBHOOK_MODIFICATION') {
      if (rule.fileGlob.test(filePath)) {
        violations.push({
          file: filePath,
          line: 0,
          rule: rule.name,
          match: filePath,
          remedy: rule.remedy,
        });
      }
      continue;
    }

    // Content pattern checks
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.pattern.exec(line)) !== null) {
        violations.push({
          file: filePath,
          line: i + 1,
          rule: rule.name,
          match: match[0].substring(0, 60),
          remedy: rule.remedy,
        });
      }
    }
  }

  return violations;
}

// ─── Baseline Comparison ──────────────────────────────────────────────────────

interface BaselineData {
  violations: Record<string, Record<string, Array<{ line: number; match: string }>>>;
}

function loadBaseline(): BaselineData | null {
  const baselinePath = path.resolve(process.cwd(), 'governance/violation-baseline.json');
  if (!fs.existsSync(baselinePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as BaselineData;
  } catch {
    return null;
  }
}

function isBaselineViolation(baseline: BaselineData, v: Violation): boolean {
  const fileEntry = baseline.violations[v.file];
  if (!fileEntry) return false;
  const ruleHits = fileEntry[v.rule];
  if (!ruleHits) return false;
  return ruleHits.some(b => b.match === v.match);
}

// ─── Archive Leakage Detection ───────────────────────────────────────────────

function checkArchiveLeakage(filePath: string): Violation[] {
  const violations: Violation[] = [];
  if (!/\.(mdc|md)$/.test(filePath)) return violations;
  if (filePath.startsWith('docs-governance/archive/')) return violations;

  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return violations;

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  const archiveRef = /docs-governance\/archive\/[A-Z][A-Z_]+\.md/g;

  for (let i = 0; i < lines.length; i++) {
    archiveRef.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = archiveRef.exec(lines[i])) !== null) {
      if (lines[i].includes('(archived') || lines[i].includes('reference only')) continue;
      violations.push({
        file: filePath,
        line: i + 1,
        rule: 'ARCHIVE_LEAKAGE',
        match: match[0],
        remedy: 'Archived docs must not be cited as authority. Promote to canonical/ or mark as "(archived — reference only)".',
      });
    }
  }
  return violations;
}

// ─── Governance Creation Gate ────────────────────────────────────────────────

function checkGovernanceCreation(filePath: string, baseline: BaselineData | null): Violation[] {
  if (!filePath.startsWith('docs-governance/') || !filePath.endsWith('.md')) return [];
  if (filePath.startsWith('docs-governance/canonical/') || filePath.startsWith('docs-governance/archive/')) return [];

  return [{
    file: filePath,
    line: 0,
    rule: 'GOVERNANCE_CREATION_BLOCKED',
    match: filePath,
    remedy: 'New governance docs must go in canonical/ (with frontmatter) or archive/. Root-level docs-governance/ is frozen.',
  }];
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const strict = process.argv.includes('--strict');
  console.log(`\n${BOLD}Sovereign Guard — Rule Enforcement${RESET}`);
  console.log('─'.repeat(50));

  const staged = getStagedFiles();
  if (staged.length === 0) {
    console.log(`${GREEN}No staged files. Nothing to check.${RESET}\n`);
    process.exit(0);
  }

  const baseline = loadBaseline();
  const newViolations: Violation[] = [];
  const knownDebt: Violation[] = [];
  const allViolations: Violation[] = [];

  for (const file of staged) {
    const violations = checkFile(file);
    const archiveLeaks = checkArchiveLeakage(file);
    const govCreation = checkGovernanceCreation(file, baseline);
    allViolations.push(...violations, ...archiveLeaks, ...govCreation);
  }

  if (baseline && !strict) {
    for (const v of allViolations) {
      if (isBaselineViolation(baseline, v)) {
        knownDebt.push(v);
      } else {
        newViolations.push(v);
      }
    }
  } else {
    newViolations.push(...allViolations);
  }

  if (newViolations.length === 0 && knownDebt.length === 0) {
    console.log(`${GREEN}All ${staged.length} staged files passed Sovereign Guard.${RESET}\n`);
    process.exit(0);
  }

  if (newViolations.length === 0 && knownDebt.length > 0) {
    console.log(`${GREEN}All ${staged.length} staged files passed Sovereign Guard.${RESET}`);
    console.log(`${YELLOW}  Known baseline debt: ${knownDebt.length} pre-existing violation(s) (not blocking)${RESET}\n`);
    process.exit(0);
  }

  console.log(`\n${RED}${BOLD}COMMIT BLOCKED — ${newViolations.length} new violation(s) found${RESET}`);
  if (knownDebt.length > 0) {
    console.log(`${YELLOW}  (plus ${knownDebt.length} known baseline violations — not blocking)${RESET}`);
  }
  console.log('');

  for (const v of newViolations) {
    const location = v.line > 0 ? `:${v.line}` : '';
    console.log(`${RED}✗ [${v.rule}]${RESET}`);
    console.log(`  File   : ${YELLOW}${v.file}${location}${RESET}`);
    if (v.line > 0) console.log(`  Match  : ${v.match}`);
    console.log(`  Remedy : ${v.remedy}`);
    console.log('');
  }

  console.log(`${BOLD}Fix violations above, then re-commit.${RESET}`);
  console.log(`${YELLOW}Emergency bypass: git commit --no-verify${RESET}`);
  console.log(`${YELLOW}WARNING: Bypasses are tracked. You must explain them in the PR.${RESET}\n`);

  process.exit(1);
}

main();
