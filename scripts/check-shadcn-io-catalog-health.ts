#!/usr/bin/env npx tsx
/**
 * HTTP probe for shadcn.io doc + recipe URLs in merged_catalog.v1.json (fallback: component_index).
 * Writes a JSON report (gitignored) and prints a short summary.
 *
 * Usage:
 *   npx tsx scripts/check-shadcn-io-catalog-health.ts
 *   npx tsx scripts/check-shadcn-io-catalog-health.ts --concurrency 8 --fail-on-error
 *   npx tsx scripts/check-shadcn-io-catalog-health.ts --recipes-only
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const mergedPath = join(root, "registry-yaml/shadcn-io-catalog/merged_catalog.v1.json");
const fallbackIndexPath = join(root, "registry-yaml/shadcn-io-catalog/component_index.v1.json");
const defaultOut = join(
  root,
  "docs-governance/artifacts/shadcn_io_catalog_health_report.json",
);

type Entry = {
  id: string;
  docUrl: string;
  recipeUrl?: string;
};

type IndexFile = { entries: Entry[] };

type UrlCheck = {
  url: string;
  status: number | null;
  ok: boolean;
  method: string;
  error?: string;
};

function parseArgs(argv: string[]) {
  let concurrency = 6;
  let failOnError = false;
  let recipesOnly = false;
  let docsOnly = false;
  let outPath = defaultOut;
  let noWrite = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--fail-on-error") failOnError = true;
    else if (a === "--recipes-only") recipesOnly = true;
    else if (a === "--docs-only") docsOnly = true;
    else if (a === "--no-write") noWrite = true;
    else if (a.startsWith("--concurrency="))
      concurrency = Math.max(1, parseInt(a.split("=")[1], 10) || 6);
    else if (a === "--concurrency") {
      i++;
      concurrency = Math.max(1, parseInt(argv[i], 10) || 6);
    } else if (a.startsWith("--out=")) outPath = a.slice("--out=".length);
    else if (a === "--out") {
      i++;
      outPath = argv[i];
    }
  }
  if (recipesOnly && docsOnly) {
    console.error("Use only one of --recipes-only or --docs-only.");
    process.exit(2);
  }
  return { concurrency, failOnError, recipesOnly, docsOnly, outPath, noWrite };
}

async function checkUrl(url: string): Promise<UrlCheck> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22_000);
  const fail = (method: string, error?: string): UrlCheck => ({
    url,
    status: null,
    ok: false,
    method,
    error,
  });
  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { Accept: "*/*" },
      });
      return {
        url,
        status: res.status,
        ok: res.ok,
        method: "GET",
      };
    }
    return {
      url,
      status: res.status,
      ok: res.ok,
      method: "HEAD",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    try {
      const c2 = new AbortController();
      const t2 = setTimeout(() => c2.abort(), 22_000);
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: c2.signal,
        headers: { Accept: "*/*" },
      });
      clearTimeout(t2);
      return {
        url,
        status: res.status,
        ok: res.ok,
        method: "GET",
      };
    } catch (e2) {
      const msg2 = e2 instanceof Error ? e2.message : String(e2);
      return fail("GET", `${msg}; retry: ${msg2}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

type Task = { entryId: string; kind: "doc" | "recipe"; url: string };

async function runPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) break;
      results[i] = await fn(items[i]);
    }
  }

  const n = Math.min(concurrency, items.length || 1);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

function loadEntries(): Entry[] {
  const path = existsSync(mergedPath) ? mergedPath : fallbackIndexPath;
  const raw = readFileSync(path, "utf-8");
  const index = JSON.parse(raw) as IndexFile;
  return index.entries;
}

async function main() {
  const args = parseArgs(process.argv);
  const entries = loadEntries();

  const tasks: Task[] = [];
  for (const e of entries) {
    if (!args.recipesOnly) tasks.push({ entryId: e.id, kind: "doc", url: e.docUrl });
    if (!args.docsOnly && e.recipeUrl) {
      tasks.push({ entryId: e.id, kind: "recipe", url: e.recipeUrl });
    }
  }

  const checks = await runPool(tasks, args.concurrency, (t) => checkUrl(t.url));

  const perEntry: Record<
    string,
    { doc?: UrlCheck; recipe?: UrlCheck }
  > = {};
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const c = checks[i];
    if (!perEntry[t.entryId]) perEntry[t.entryId] = {};
    if (t.kind === "doc") perEntry[t.entryId].doc = c;
    else perEntry[t.entryId].recipe = c;
  }

  let okCount = 0;
  let failCount = 0;
  const byStatus: Record<string, number> = {};
  for (const c of checks) {
    if (c.ok) okCount++;
    else failCount++;
    const key = c.status === null ? "error" : String(c.status);
    byStatus[key] = (byStatus[key] ?? 0) + 1;
  }

  const report = {
    spec: "shadcn_io_catalog_health_report_v1",
    generatedAt: new Date().toISOString(),
    indexPath: "registry-yaml/shadcn-io-catalog/component_index.v1.json",
    notes:
      "401 on https://www.shadcn.io/r/*.json often means the registry requires authentication for anonymous HTTP; the shadcn CLI may still work when logged in. Use --docs-only to probe HTML docs only.",
    summary: {
      tasks: tasks.length,
      ok: okCount,
      failed: failCount,
      byStatus,
    },
    entries: perEntry,
  };

  const json = JSON.stringify(report, null, 2);
  if (!args.noWrite) {
    writeFileSync(args.outPath, json, "utf-8");
  }

  console.log(
    `[shadcn-io:health] tasks=${tasks.length} ok=${okCount} failed=${failCount}` +
      (args.noWrite ? " (no-write)" : ` → ${args.outPath}`),
  );

  if (failCount > 0) {
    const sample = checks
      .map((c, i) => ({ ...c, task: tasks[i] }))
      .filter((x) => !x.ok)
      .slice(0, 12);
    for (const s of sample) {
      console.log(
        `  FAIL ${s.task?.entryId} ${s.task?.kind} ${s.status ?? "?"} ${s.url}${s.error ? ` (${s.error})` : ""}`,
      );
    }
    if (failCount > 12) console.log(`  … and ${failCount - 12} more`);
  }

  if (args.failOnError && failCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
