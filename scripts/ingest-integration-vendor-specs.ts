/**
 * Automated ingest for integration vendor OpenAPI copies (registry-yaml/integration-vendor-metadata).
 *
 * - manual_promote: verify local reference_openapi_path against expected_sha256 when set.
 * - url_fetch: GET source_url, verify checksum, atomic write to reference_openapi_path.
 * - disabled: skip.
 *
 * Run: npm run ingest:integration-vendor-specs
 * Dry-run (no fetch, no write): npm run ingest:integration-vendor-specs -- --dry-run
 * CI verify-only: npm run ingest:integration-vendor-specs -- --verify-only
 *
 * Authority: internal graph remains truth (INTEGRATION_GRAPH_DISCIPLINE D2); this updates inputs only.
 */
import * as fs from "fs";
import * as path from "path";
import {
  ROOT,
  fetchAndWriteOpenApi,
  listVendorMetadataYamlFiles,
  readVendorMetadataFile,
  verifyFileMatchesExpectedSha256,
  type VendorMetadataDoc,
} from "./lib/integrationVendorSpecIngest.js";

const vendorMetaDir = path.join(ROOT, "registry-yaml/integration-vendor-metadata");

function parseArgs(): { dryRun: boolean; verifyOnly: boolean } {
  const argv = process.argv.slice(2);
  return {
    dryRun: argv.includes("--dry-run"),
    verifyOnly: argv.includes("--verify-only"),
  };
}

async function main(): Promise<void> {
  const { dryRun, verifyOnly } = parseArgs();
  const files = listVendorMetadataYamlFiles(vendorMetaDir);
  if (files.length === 0) {
    console.log("[ingest-integration-vendor-specs] no integration-vendor-metadata/*.yaml");
    return;
  }

  let errors = 0;

  for (const file of files) {
    const doc = readVendorMetadataFile(file) as VendorMetadataDoc;
    const vid = doc.vendor_id?.trim();
    const rel = path.relative(ROOT, file);
    if (!vid) {
      console.error(`[ingest] ${rel}: missing vendor_id`);
      errors++;
      continue;
    }

    const ingest = doc.spec_ingest;
    const mode = ingest?.mode ?? "manual_promote";
    const refPath = doc.reference_openapi_path?.trim();
    if (!refPath) {
      console.error(`[ingest] ${vid}: missing reference_openapi_path`);
      errors++;
      continue;
    }

    const expected = ingest?.expected_sha256?.trim() ?? "";

    if (mode === "disabled") {
      console.log(`[ingest] ${vid}: spec_ingest.mode=disabled — skip`);
      continue;
    }

    if (mode === "manual_promote") {
      const abs = path.join(ROOT, refPath);
      if (!fs.existsSync(abs)) {
        console.error(`[ingest] ${vid}: missing file ${refPath}`);
        errors++;
        continue;
      }
      if (ingest?.checksum_required && expected) {
        const v = verifyFileMatchesExpectedSha256(abs, expected);
        if (!v.ok) {
          console.error(
            `[ingest] ${vid}: SHA256 mismatch for ${refPath}\n  expected: ${v.expected}\n  actual:   ${v.actual}`,
          );
          errors++;
        } else {
          console.log(`[ingest] ${vid}: manual_promote checksum OK (${refPath})`);
        }
      } else if (ingest?.checksum_required && !expected) {
        console.error(
          `[ingest] ${vid}: spec_ingest.checksum_required true but expected_sha256 missing`,
        );
        errors++;
      } else {
        console.log(`[ingest] ${vid}: manual_promote — no checksum gate (${refPath})`);
      }
      continue;
    }

    if (mode === "url_fetch") {
      const url = ingest?.source_url?.trim();
      if (!url || !url.startsWith("https://")) {
        console.error(`[ingest] ${vid}: url_fetch requires spec_ingest.source_url (https)`);
        errors++;
        continue;
      }
      if (verifyOnly) {
        console.log(`[ingest] ${vid}: url_fetch skipped (--verify-only)`);
        continue;
      }
      if (dryRun) {
        console.log(`[ingest] ${vid}: DRY-RUN would fetch ${url} → ${refPath}`);
        continue;
      }
      try {
        const { bytes, sha256 } = await fetchAndWriteOpenApi({
          root: ROOT,
          vendorId: vid,
          sourceUrl: url,
          referenceOpenapiPath: refPath,
          expectedSha256: expected || null,
        });
        console.log(`[ingest] ${vid}: wrote ${refPath} (${bytes} bytes) sha256=${sha256}`);
        if (!expected) {
          console.log(
            `[ingest] ${vid}: set spec_ingest.expected_sha256 to ${sha256} in ${rel} to lock checksum`,
          );
        }
      } catch (e) {
        console.error(`[ingest] ${vid}:`, e instanceof Error ? e.message : e);
        errors++;
      }
    }
  }

  if (errors > 0) {
    process.exit(1);
  }
  console.log("[ingest-integration-vendor-specs] OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
