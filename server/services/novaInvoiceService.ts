/**
 * NOVA Sovereign — generate invoice payload from ruleset YAML
 * Constitution: .system_design/nova_sovereign_ruleset_v1.yaml billing_groups
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";

type BillingGroup = {
  id: string;
  categories: string[];
  invoice_template: { items: string[]; stress_test_category?: string };
};

type Ruleset = {
  nova_sovereign_config?: {
    billing_groups?: BillingGroup[];
  };
};

let cachedRuleset: Ruleset | null = null;

function getRulesetPath(): string {
  const root = process.cwd();
  return path.join(root, ".system_design", "nova_sovereign_ruleset_v1.yaml");
}

function loadRuleset(): Ruleset {
  if (cachedRuleset) return cachedRuleset;
  const filePath = getRulesetPath();
  const raw = fs.readFileSync(filePath, "utf8");
  cachedRuleset = yaml.load(raw) as Ruleset;
  return cachedRuleset!;
}

function findGroupByCategory(category: string): BillingGroup | null {
  const config = loadRuleset().nova_sovereign_config;
  if (!config?.billing_groups) return null;
  return config.billing_groups.find((g) => g.categories?.includes(category)) ?? null;
}

export interface InvoiceLineItem {
  name: string;
  amount: number | null;
  description?: string;
}

export interface GeneratedInvoice {
  line_items: InvoiceLineItem[];
  total: number;
  currency: string;
  category: string;
  group_id: string;
}

/**
 * Generate invoice JSON for owner dashboard. For real_estate_agency uses Group 1 stress-test template (10 items).
 * Amounts are placeholder 0 when no pricing input; callers can pass salePrice or context to derive amounts later.
 */
export function generateInvoice(category: string, _context?: { salePrice?: number }): GeneratedInvoice | null {
  const group = findGroupByCategory(category);
  if (!group?.invoice_template?.items?.length) return null;

  const items = group.invoice_template.items.map((name): InvoiceLineItem => ({
    name,
    amount: null,
    description: undefined,
  }));

  const total = items.reduce((sum, i) => sum + (i.amount ?? 0), 0);

  return {
    line_items: items,
    total,
    currency: "USD",
    category,
    group_id: group.id,
  };
}
