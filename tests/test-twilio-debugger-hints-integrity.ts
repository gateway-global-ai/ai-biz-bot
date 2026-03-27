/**
 * Invariant: every failure_class_id in twilio-debugger-error-code-hints.v0.yaml
 * must exist as failure_classes[].id in twilio-platform-failure-classes.v0.yaml.
 * Run: npx tsx tests/test-twilio-debugger-hints-integrity.ts
 */
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

type HintsFile = { error_code_hints?: Array<{ twilio_error_code?: string; failure_class_id?: string }> };
type ClassesFile = { failure_classes?: Array<{ id?: string }> };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function main() {
  const root = path.resolve(process.cwd());
  const hintsPath = path.join(root, "registry-yaml/twilio-debugger-error-code-hints.v0.yaml");
  const classesPath = path.join(root, "registry-yaml/twilio-platform-failure-classes.v0.yaml");

  const hints = yaml.load(fs.readFileSync(hintsPath, "utf8")) as HintsFile;
  const classes = yaml.load(fs.readFileSync(classesPath, "utf8")) as ClassesFile;

  const allowed = new Set(
    (classes.failure_classes ?? [])
      .map((c) => (c.id != null ? String(c.id).trim() : ""))
      .filter(Boolean),
  );
  assert(allowed.size > 0, "twilio-platform-failure-classes: no failure_classes[].id found");

  const rows = hints.error_code_hints ?? [];
  assert(rows.length > 0, "twilio-debugger-error-code-hints: no error_code_hints rows");

  const bad: string[] = [];
  for (const row of rows) {
    const id = row.failure_class_id != null ? String(row.failure_class_id).trim() : "";
    const code = row.twilio_error_code ?? "?";
    if (!id || !allowed.has(id)) {
      bad.push(`${code} → ${id || "(missing id)"}`);
    }
  }
  if (bad.length) {
    throw new Error(
      `failure_class_id not in twilio-platform-failure-classes.v0.yaml:\n${bad.join("\n")}`,
    );
  }

  console.log(
    "✅ test-twilio-debugger-hints-integrity: all hint failure_class_id values exist in platform registry",
  );
}

main();
