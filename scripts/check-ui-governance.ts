#!/usr/bin/env npx tsx
/**
 * Phase 2.0 — Anti-artboard UI governance (canvas scope).
 *
 * Enforces VISUAL_INTEGRITY_GOVERNANCE_V1.md + CANVAS_OS_TOOL_MANDATE for:
 *   - client/src/components/canvas/**  (governed canvas primitives)
 *   - client/src/components/voice/tools/SharedCanvasPanel.tsx (command_center host + typed views)
 *
 * Does not replace governance:visual-integrity (repo-wide grandfather baseline).
 *
 * Usage:
 *   npm run governance:ui
 *   npm run governance:ui -- --ci
 *   npm run governance:ui -- --file-list /tmp/changed-files.txt
 *
 * With --file-list: only files that intersect the strict set are checked; empty → exit 0.
 * Without --file-list: full strict set (every CI run).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const CANONICAL = "docs-governance/canonical/VISUAL_INTEGRITY_GOVERNANCE_V1.md";

/** Primary location for new governed canvas UI (Shadcn / tokens). */
const CANVAS_COMPONENTS_DIR = join(process.cwd(), "client/src/components/canvas");

/** Command center slot host + TypedCanvasView (registry-bound surfaces). */
const COMMAND_CENTER_HOST = join(
  process.cwd(),
  "client/src/components/voice/tools/SharedCanvasPanel.tsx",
);

/** COMMAND_CENTER_SURFACE_SPEC_V1 — fixed slot labels inside CommandCenterCanvas. */
const COMMAND_CENTER_SLOT_ANCHORS = ["Status lane", "Main work", "Approvals"] as const;

const BANNED_PATTERNS: Array<{ id: string; rx: RegExp; hint: string }> = [
  {
    id: "INLINE_STYLE_OBJECT",
    rx: /style\s*=\s*\{\s*\{/,
    hint: "No presentation style={{ }} — use Tailwind + tokens (VISUAL_INTEGRITY_GOVERNANCE_V1).",
  },
  {
    id: "ARBITRARY_HEX_IN_TW_ARBITRARY",
    rx: /className=\{[^}]*\[#[0-9a-fA-F]{3,8}/,
    hint: "No arbitrary hex in bracket classes — use tokens or var(--).",
  },
  {
    id: "HEX_IN_CLASS_STRING",
    rx: /className=["'`][^"'`]*#[0-9a-fA-F]{3,8}/,
    hint: "No hex color literals in className strings.",
  },
  {
    id: "RGB_FUNCTION",
    rx: /(?:className|style)=["'`][^"'`]*\brgba?\(/,
    hint: "No rgb()/rgba() in className/style strings — use theme utilities or CSS variables.",
  },
];

/** Imports forbidden in client/src/components/canvas (quarantine / artboard bypass). */
const BANNED_IMPORTS = [/legacy-ui-reference/, /from\s+['"]styled-components['"]/];

function parseArgs(): { ci: boolean; fileListPath?: string } {
  const argv = process.argv.slice(2);
  const ci = argv.includes("--ci");
  const idx = argv.indexOf("--file-list");
  const fileListPath = idx !== -1 && argv[idx + 1] ? argv[idx + 1] : undefined;
  return { ci, fileListPath };
}

function walkTsxFiles(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkTsxFiles(p, out);
    else if (name.endsWith(".tsx")) out.push(p);
  }
}

function collectStrictSet(cwd: string): string[] {
  const files: string[] = [];
  walkTsxFiles(CANVAS_COMPONENTS_DIR, files);
  if (existsSync(COMMAND_CENTER_HOST)) {
    files.push(COMMAND_CENTER_HOST);
  }
  return files.map((p) => relative(cwd, p).split("\\").join("/"));
}

function readList(path: string): string[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split("\\").join("/"));
}

function filterByChanged(strictRel: string[], changed?: string[]): string[] {
  if (!changed || changed.length === 0) return strictRel;
  const set = new Set(changed);
  return strictRel.filter((f) => set.has(f));
}

function checkFile(relPath: string, src: string, errors: string[]): void {
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("//") || line.includes("// @ui-governance-ignore")) continue;

    for (const { id, rx, hint } of BANNED_PATTERNS) {
      rx.lastIndex = 0;
      if (rx.test(line)) {
        errors.push(`${relPath}:${i + 1} [${id}] ${hint}`);
      }
    }
  }

  if (relPath.startsWith("client/src/components/canvas/")) {
    for (const brx of BANNED_IMPORTS) {
      brx.lastIndex = 0;
      if (brx.test(src)) {
        errors.push(`${relPath}: banned import pattern (${brx}) — ${CANONICAL}`);
      }
    }
    const hasUiPrimitive =
      /from\s+['"]@\/components\/ui\//.test(src) ||
      /from\s+['"]@\/ui-core\//.test(src) ||
      /from\s+['"]@\/config\/brand['"]/.test(src) ||
      /from\s+['"]@gateway\/(design-tokens|canvas-sdk)['"]/.test(src);
    const onlyReexports = /^\s*export\s+/.test(src.trim());
    if (!onlyReexports && src.includes("export") && !hasUiPrimitive && lines.length > 15) {
      // Soft signal: canvas folder should usually compose ui primitives (not a hard fail for tiny stubs)
      const hasJsx = /<[A-Z]/.test(src);
      if (hasJsx && !hasUiPrimitive) {
        errors.push(
          `${relPath}: expected at least one import from @/components/ui/, @/ui-core/, or @gateway/* for composed canvas UI (CANVAS_OS_TOOL_MANDATE).`,
        );
      }
    }
  }

  if (relPath.endsWith("SharedCanvasPanel.tsx")) {
    for (const anchor of COMMAND_CENTER_SLOT_ANCHORS) {
      if (!src.includes(anchor)) {
        errors.push(
          `${relPath}: CommandCenterCanvas must retain slot labels "${COMMAND_CENTER_SLOT_ANCHORS.join('", "')}" per COMMAND_CENTER_SURFACE_SPEC_V1 (missing: ${anchor}).`,
        );
      }
    }
  }
}

function main(): void {
  const cwd = process.cwd();
  const { ci, fileListPath } = parseArgs();
  const strictRel = collectStrictSet(cwd);
  const changed = fileListPath ? readList(fileListPath) : undefined;
  const toScan = filterByChanged(strictRel, changed);

  console.log("UI governance — anti-artboard gate (canvas scope)\n");
  console.log(`Canonical: ${CANONICAL}\n`);
  if (changed && toScan.length === 0) {
    console.log("No strict-path files in change list — skip (OK).");
    process.exit(0);
    return;
  }
  if (toScan.length === 0) {
    console.log("Strict path set empty — create client/src/components/canvas/ or ensure SharedCanvasPanel exists.");
    process.exit(ci ? 0 : 1);
    return;
  }

  const errors: string[] = [];
  for (const rel of toScan) {
    const abs = join(cwd, rel);
    let src: string;
    try {
      src = readFileSync(abs, "utf8");
    } catch {
      errors.push(`${rel}: read failed`);
      continue;
    }
    checkFile(rel, src, errors);
  }

  console.log(`Scanned ${toScan.length} file(s):`);
  for (const f of toScan) console.log(`  ${f}`);
  console.log("");

  if (errors.length) {
    console.error("--- UI GOVERNANCE FAILED ---\n");
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  console.log("UI governance (canvas scope): OK");
  process.exit(0);
}

main();
