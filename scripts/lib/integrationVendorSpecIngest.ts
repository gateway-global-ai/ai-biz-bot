/**
 * Shared: load integration-vendor-metadata YAML, verify checksums, fetch OpenAPI (url_fetch).
 * Used by ingest-integration-vendor-specs.ts and validate-integration-registry.ts (checksum only).
 */
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import yaml from "js-yaml";

export const ROOT = path.resolve(import.meta.dirname, "../..");

export type SpecIngestMode = "manual_promote" | "url_fetch" | "disabled";

export type VendorMetadataDoc = {
  spec?: string;
  version?: string;
  vendor_id?: string;
  developer_portal_url?: string;
  reference_openapi_path?: string;
  api_version_label?: string;
  spec_ingest?: {
    mode?: SpecIngestMode;
    source_url?: string | null;
    checksum_required?: boolean;
    /** Committed file (manual_promote) or post-download must match when checksum_required / verification runs. */
    expected_sha256?: string | null;
  };
};

export function listVendorMetadataYamlFiles(vendorMetaDir: string): string[] {
  if (!fs.existsSync(vendorMetaDir)) return [];
  return fs
    .readdirSync(vendorMetaDir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map((f) => path.join(vendorMetaDir, f));
}

export function readVendorMetadataFile(filePath: string): VendorMetadataDoc {
  const raw = fs.readFileSync(filePath, "utf8");
  return yaml.load(raw) as VendorMetadataDoc;
}

export function sha256HexOfFile(absPath: string): string {
  const buf = fs.readFileSync(absPath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function sha256HexOfBuffer(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** Normative: 64 hex chars (case-insensitive). */
export function isValidExpectedSha256(s: string): boolean {
  return /^[a-f0-9]{64}$/i.test(s);
}

export type VerifyChecksumResult = { ok: true } | { ok: false; actual: string; expected: string };

export function verifyFileMatchesExpectedSha256(
  absPath: string,
  expected: string,
): VerifyChecksumResult {
  const actual = sha256HexOfFile(absPath);
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    return { ok: false, actual, expected };
  }
  return { ok: true };
}

/**
 * Fetch OpenAPI from source_url, optionally verify checksum, write atomically to reference_openapi_path (repo-relative).
 */
export async function fetchAndWriteOpenApi(args: {
  root: string;
  vendorId: string;
  sourceUrl: string;
  referenceOpenapiPath: string;
  expectedSha256?: string | null;
}): Promise<{ bytes: number; sha256: string }> {
  const res = await fetch(args.sourceUrl, {
    redirect: "follow",
    headers: { accept: "application/json, application/yaml, text/yaml, */*" },
  });
  if (!res.ok) {
    throw new Error(
      `[ingest] ${args.vendorId}: HTTP ${res.status} fetching ${args.sourceUrl}`,
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const sha256 = sha256HexOfBuffer(buf);
  if (args.expectedSha256 && isValidExpectedSha256(args.expectedSha256)) {
    if (sha256.toLowerCase() !== args.expectedSha256.toLowerCase()) {
      throw new Error(
        `[ingest] ${args.vendorId}: downloaded SHA256 ${sha256} !== expected_sha256 ${args.expectedSha256}`,
      );
    }
  }
  const rel = args.referenceOpenapiPath.trim();
  const outAbs = path.join(args.root, rel);
  const dir = path.dirname(outAbs);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${outAbs}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, outAbs);
  return { bytes: buf.length, sha256 };
}
