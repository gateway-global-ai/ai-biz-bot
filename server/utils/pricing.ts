/**
 * server/utils/pricing.ts
 *
 * Single source of truth for all commercial rates on the platform.
 * Reads directly from /.system_design/pricing_v1.yaml — the governance
 * artifact that governs MSA v1.0.0 and MSA v1.1.0 (Reseller Addendum).
 *
 * Design mandates:
 *   - Lazy singleton: YAML file is read from disk exactly once on first call.
 *     Subsequent calls return the cached object. Zero I/O overhead in steady state.
 *   - Thread-safe initialization: Node.js is single-threaded; the synchronous
 *     readFileSync + assignment is atomic within the event loop.
 *   - Cent conversion: all dollar → Stripe cents conversions use Math.round()
 *     to eliminate floating-point drift (e.g., 49.00 * 100 = 4899.9999...).
 *
 * Source of truth: /.system_design/pricing_v1.yaml
 * Governance reference: /.system_design/rules.md §Rule 2
 */

import { readFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import { storage } from "../storage";

// ── YAML Schema Types ────────────────────────────────────────────────────────

interface FlatFeeEntry {
  amount: number;
  currency: string;
  billing_cycle: string;
  refundable: boolean;
  stripe_price_type: string;
  monthly_effective?: number;
  savings_vs_monthly?: number;
  savings_label?: string;
}

interface OverageRateEntry {
  rate: number;
  unit: string;
  currency: string;
  stripe_meter_event: string;
}

interface TermsConfig {
  min_term_months: number;
  renewal_notice_days: number;
  grace_period_days: number;
  early_termination_rate: number;
  suspension_threshold_days: number;
}

interface WholesaleV1 {
  msa_ref: string;
  base_rate: number;
  currency: string;
  billing_model: string;
  billing_day: number;
  custom_rate_field: string;
  revenue_share: {
    platform_cut: string;
    reseller_cut: string;
    formula: string;
    ledger_field: string;
    payout_method: string;
  };
  overage_pass_through: {
    default: string;
    managed_billing_option: string;
    rates_ref: string;
  };
}

export interface PricingConfig {
  version: string;
  schema: string;
  msa_ref: string;
  flat_fee: {
    monthly: FlatFeeEntry;
    annual_prepaid: FlatFeeEntry;
  };
  overage_rates: {
    phone_voice_ai: OverageRateEntry;
    web_voice_ai: OverageRateEntry;
    a2p_sms: OverageRateEntry;
  };
  terms: TermsConfig;
  wholesale_v1: WholesaleV1;
}

// ── MarkupRate DB shape (matches the markupRate JSONB column) ────────────────

interface MarkupRate {
  phoneVoiceAi?: number;
  webVoiceAi?: number;
  a2pSms?: number;
  monthlyFlatFee?: number;
}

// ── Singleton Cache ──────────────────────────────────────────────────────────

let _config: PricingConfig | null = null;

/**
 * Returns the parsed pricing_v1.yaml config object.
 * Lazy-initialized: reads from disk on first call, cached thereafter.
 * Node.js single-thread guarantee makes the synchronous init atomic.
 */
export function getPricingConfig(): PricingConfig {
  if (_config) return _config;

  const yamlPath = join(process.cwd(), ".system_design", "pricing_v1.yaml");
  try {
    const raw = readFileSync(yamlPath, "utf8");
    _config = yaml.load(raw) as PricingConfig;
  } catch (err: any) {
    throw new Error(
      `[Pricing] Failed to load pricing_v1.yaml from "${yamlPath}": ${err.message}. ` +
      `Ensure the .system_design directory is present at the project root.`
    );
  }

  if (!_config?.flat_fee?.monthly?.amount) {
    throw new Error("[Pricing] pricing_v1.yaml is missing required field: flat_fee.monthly.amount");
  }

  return _config;
}

// ── Effective Rate Resolution ────────────────────────────────────────────────

export interface EffectiveRates {
  /** Monthly flat fee in dollars (e.g. 49.00) */
  monthlyFlatFee: number;
  /** Per-minute rate for Phone Voice AI in dollars (e.g. 0.25) */
  phoneVoiceAiRate: number;
  /** Per-minute rate for Web Voice AI in dollars (e.g. 0.18) */
  webVoiceAiRate: number;
  /** Per-message rate for A2P SMS in dollars (e.g. 0.125) */
  a2pSmsRate: number;
  /** Indicates whether reseller markup overrides are in effect */
  source: "yaml_default" | "markup_override";
}

/**
 * Resolves the effective billing rates for a given customer account.
 *
 * Rate resolution order (MSA v1.1.0 §2.2):
 *   1. If accountType === 'SUB_ACCOUNT' AND markupRate is set → use markup values
 *      (individual fields fall back to YAML defaults if not present in markupRate)
 *   2. All other account types → YAML defaults from pricing_v1.yaml
 *
 * This is the ONLY function in the codebase that may return billing rates.
 * Do not read pricing_v1.yaml directly elsewhere.
 */
export async function getEffectiveRate(accountId: string): Promise<EffectiveRates> {
  const config = getPricingConfig();

  const yamlDefaults: EffectiveRates = {
    monthlyFlatFee:   config.flat_fee.monthly.amount,
    phoneVoiceAiRate: config.overage_rates.phone_voice_ai.rate,
    webVoiceAiRate:   config.overage_rates.web_voice_ai.rate,
    a2pSmsRate:       config.overage_rates.a2p_sms.rate,
    source:           "yaml_default",
  };

  let account: any;
  try {
    account = await storage.getCustomerAccountById(accountId);
  } catch {
    // If account lookup fails, return YAML defaults rather than erroring the billing path
    return yamlDefaults;
  }

  if (!account) return yamlDefaults;

  if (account.accountType === "SUB_ACCOUNT" && account.markupRate) {
    const m = account.markupRate as MarkupRate;
    return {
      monthlyFlatFee:   m.monthlyFlatFee  ?? yamlDefaults.monthlyFlatFee,
      phoneVoiceAiRate: m.phoneVoiceAi    ?? yamlDefaults.phoneVoiceAiRate,
      webVoiceAiRate:   m.webVoiceAi      ?? yamlDefaults.webVoiceAiRate,
      a2pSmsRate:       m.a2pSms          ?? yamlDefaults.a2pSmsRate,
      source:           "markup_override",
    };
  }

  return yamlDefaults;
}

// ── Cent Conversion Helpers ──────────────────────────────────────────────────
// Always use Math.round() — never multiply floating-point dollars without rounding.
// Example: 49.00 * 100 in IEEE 754 may yield 4899.999999999999.

/**
 * Converts a dollar amount to Stripe cents (integer).
 * Math.round() eliminates all floating-point drift.
 */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Returns the monthly platform flat fee in Stripe cents.
 * Shorthand for the most common billing operation.
 */
export function getPlatformFeeCents(): number {
  return toCents(getPricingConfig().flat_fee.monthly.amount);
}

/**
 * Returns the annual pre-paid platform fee in Stripe cents.
 */
export function getAnnualFeeCents(): number {
  return toCents(getPricingConfig().flat_fee.annual_prepaid.amount);
}
