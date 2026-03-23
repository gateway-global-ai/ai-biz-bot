import manifestRaw from "../../../../../docs-governance/SYSTEM_MANIFEST.md?raw";

export interface SystemManifestMeta {
  architectureVersion: string;
  specStatus: string;
  runtimeTarget: string;
}

function extractValue(label: string): string {
  const match = manifestRaw.match(new RegExp(`^${label}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim() ?? "Unknown";
}

export function loadSystemManifestMeta(): SystemManifestMeta {
  return {
    architectureVersion: extractValue("Version"),
    specStatus: extractValue("Status"),
    runtimeTarget: extractValue("Runtime Target"),
  };
}
