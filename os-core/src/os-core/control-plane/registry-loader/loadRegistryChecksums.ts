import logicalRoutesRaw from "../../../../../registry-yaml/logical-routes.yaml?raw";
import viewsRaw from "../../../../../registry-yaml/views.yaml?raw";
import agentPoliciesRaw from "../../../../../registry-yaml/agent-policies.yaml?raw";
import actionsRaw from "../../../../../registry-yaml/actions.yaml?raw";
import uiElementsRaw from "../../../../../registry-yaml/ui-elements.yaml?raw";

export interface RegistryChecksumMeta {
  version: number;
  shortHash: string;
}

export interface RegistryChecksums {
  logicalRoutes: RegistryChecksumMeta;
  views: RegistryChecksumMeta;
  agentPolicies: RegistryChecksumMeta;
  actions: RegistryChecksumMeta;
  uiElements: RegistryChecksumMeta;
}

function extractVersion(raw: string): number {
  const match = raw.match(/^version:\s*(\d+)/m);
  return match ? Number(match[1]) : 0;
}

async function computeShortSha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 8);
}

export async function loadRegistryChecksums(): Promise<RegistryChecksums> {
  const [logicalRoutesHash, viewsHash, agentPoliciesHash, actionsHash, uiElementsHash] =
    await Promise.all([
      computeShortSha256(logicalRoutesRaw),
      computeShortSha256(viewsRaw),
      computeShortSha256(agentPoliciesRaw),
      computeShortSha256(actionsRaw),
      computeShortSha256(uiElementsRaw),
    ]);

  return {
    logicalRoutes: {
      version: extractVersion(logicalRoutesRaw),
      shortHash: logicalRoutesHash,
    },
    views: {
      version: extractVersion(viewsRaw),
      shortHash: viewsHash,
    },
    agentPolicies: {
      version: extractVersion(agentPoliciesRaw),
      shortHash: agentPoliciesHash,
    },
    actions: {
      version: extractVersion(actionsRaw),
      shortHash: actionsHash,
    },
    uiElements: {
      version: extractVersion(uiElementsRaw),
      shortHash: uiElementsHash,
    },
  };
}
