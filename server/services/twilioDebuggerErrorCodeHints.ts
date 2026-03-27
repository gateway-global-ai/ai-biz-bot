/**
 * Loads registry-yaml/twilio-debugger-error-code-hints.v0.yaml once — maps Twilio error_code → failure_class_id.
 * 10b bridge: aligns Debugger normalization with twilio-platform-failure-classes.v0.yaml.
 */
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

type HintFile = {
  error_code_hints?: Array<{ twilio_error_code: string; failure_class_id: string }>;
};

let cachedMap: Record<string, string> | null = null;

function loadHints(): Record<string, string> {
  if (cachedMap) return cachedMap;
  const filePath = path.resolve(process.cwd(), "registry-yaml/twilio-debugger-error-code-hints.v0.yaml");
  const raw = fs.readFileSync(filePath, "utf8");
  const data = yaml.load(raw) as HintFile;
  const map: Record<string, string> = {};
  for (const row of data.error_code_hints ?? []) {
    if (row.twilio_error_code && row.failure_class_id) {
      map[String(row.twilio_error_code).trim()] = String(row.failure_class_id).trim();
    }
  }
  cachedMap = map;
  return map;
}

/** Returns platform `failure_class_id` when a hint row exists; otherwise null (unknown code). */
export function resolveDebuggerFailureClassId(errorCode: string | null | undefined): string | null {
  if (errorCode == null || !String(errorCode).trim()) return null;
  const code = String(errorCode).trim();
  const map = loadHints();
  return map[code] ?? null;
}
