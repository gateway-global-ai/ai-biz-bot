/**
 * novaDocumentService.ts — Nova Sovereign Document Template Resolver
 *
 * Reads nova_sovereign_ruleset_v1.yaml and returns the industry-specific
 * document templates and IDV protocol level for a given set of Google Places types.
 *
 * Used by:
 *   - ConciergePanel Intelligence > Documents panel (client fetches GET /api/nova/documents/:siteConfigId)
 *   - Agent provisioning (to know what docs to surface in system prompt)
 *   - NovaGate (to determine protocol level for IDV flow)
 *
 * Spec: .system_design/nova_sovereign_ruleset_v1.yaml
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";

interface BillingGroup {
  id: string;
  idv_requirement: string;
  categories: string[];
  invoice_template: { items: string[] };
  document_template: string[];
}

interface NovaRuleset {
  nova_sovereign_config: {
    billing_groups: BillingGroup[];
    idv_protocols: {
      level_1: { name: string; description: string; steps: string[] };
      level_5: { name: string; description: string; steps: string[] };
      level_7: { name: string; description: string; steps: string[] };
    };
  };
}

let _cachedRuleset: NovaRuleset | null = null;

function loadRuleset(): NovaRuleset {
  if (_cachedRuleset) return _cachedRuleset;
  const filePath = path.join(process.cwd(), ".system_design", "nova_sovereign_ruleset_v1.yaml");
  const raw = fs.readFileSync(filePath, "utf8");
  _cachedRuleset = yaml.load(raw) as NovaRuleset;
  return _cachedRuleset;
}

export interface DocumentProfile {
  billingGroupId: string;
  idvRequirement: string;
  protocolLevel: 1 | 5 | 7;
  protocolName: string;
  protocolDescription: string;
  documents: Array<{
    id: string;
    label: string;
    status: "available" | "pending" | "active";
  }>;
  invoiceItems: string[];
}

/**
 * Resolve document templates and IDV protocol level for a set of Google Places types.
 * Returns the most restrictive (highest) protocol level if multiple groups match.
 */
export function resolveDocumentProfile(placeTypes: string[]): DocumentProfile | null {
  const ruleset = loadRuleset();
  const groups = ruleset.nova_sovereign_config.billing_groups;
  const protocols = ruleset.nova_sovereign_config.idv_protocols;

  let matched: BillingGroup | null = null;

  // Find the first matching billing group (most restrictive first: level_7 → level_5 → level_1)
  const orderedGroups = [
    ...groups.filter(g => g.idv_requirement === "Protocol_Level_7"),
    ...groups.filter(g => g.idv_requirement === "Protocol_Level_5"),
    ...groups.filter(g => g.idv_requirement === "Protocol_Level_1"),
  ];

  for (const group of orderedGroups) {
    if (placeTypes.some(t => group.categories.includes(t))) {
      matched = group;
      break;
    }
  }

  if (!matched) {
    // Default: Level 1 (telecom/SaaS group covers platform owners)
    matched = groups.find(g => g.id === "telecom_saas") ?? groups[groups.length - 1];
  }

  const levelNum = matched.idv_requirement === "Protocol_Level_7" ? 7 :
    matched.idv_requirement === "Protocol_Level_5" ? 5 : 1;

  const protocolKey = `level_${levelNum}` as "level_1" | "level_5" | "level_7";
  const protocol = protocols[protocolKey];

  const documents = matched.document_template.map(docId => ({
    id: docId,
    label: docId.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    status: "available" as const,
  }));

  return {
    billingGroupId: matched.id,
    idvRequirement: matched.idv_requirement,
    protocolLevel: levelNum as 1 | 5 | 7,
    protocolName: protocol.name,
    protocolDescription: protocol.description,
    documents,
    invoiceItems: matched.invoice_template.items,
  };
}

/**
 * Get all available billing groups (for admin/overview purposes).
 */
export function getAllBillingGroups(): BillingGroup[] {
  return loadRuleset().nova_sovereign_config.billing_groups;
}
