/**
 * Validates registry-yaml/skill-identity-registry.yaml:
 * each skill's cursor path (SKILL.md) and runtime JSON exist.
 */
import * as fs from "fs";
import * as path from "path";
import yaml from "js-yaml";

const ROOT = path.resolve(import.meta.dirname, "..");
const REGISTRY = path.join(ROOT, "registry-yaml", "skill-identity-registry.yaml");

type SkillEntry = {
  id: string;
  cursor_definition?: { path?: string };
  runtime_definition?: { path?: string };
};

function main(): void {
  const raw = fs.readFileSync(REGISTRY, "utf8");
  const doc = yaml.load(raw) as { skills?: SkillEntry[] };
  const skills = doc?.skills ?? [];
  const errors: string[] = [];

  for (const s of skills) {
    const cursorRel = s.cursor_definition?.path;
    const runtimeRel = s.runtime_definition?.path;
    if (!cursorRel || !runtimeRel) {
      errors.push(`Skill ${s.id}: missing cursor_definition.path or runtime_definition.path`);
      continue;
    }
    const skillMd = path.join(ROOT, cursorRel, "SKILL.md");
    const runtimeJson = path.join(ROOT, runtimeRel);
    if (!fs.existsSync(skillMd)) {
      errors.push(`Missing ${skillMd}`);
    }
    if (!fs.existsSync(runtimeJson)) {
      errors.push(`Missing ${runtimeJson}`);
    }
    if (fs.existsSync(runtimeJson)) {
      const j = JSON.parse(fs.readFileSync(runtimeJson, "utf8")) as { id?: string };
      if (j.id !== s.id) {
        errors.push(`JSON id "${j.id}" !== registry id "${s.id}" for ${runtimeRel}`);
      }
    }
  }

  if (errors.length) {
    console.error("validate-skill-identity-registry: FAILED\n", errors.join("\n"));
    process.exit(1);
  }
  console.log("validate-skill-identity-registry: ok", skills.length, "skills");
}

main();
