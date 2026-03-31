import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import type {
  ApprovalTier,
  CheckRun,
  CodingScopeKey,
  FileTouch,
  RequiredCheck,
} from "@shared/intentExecutionPlane/contracts";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "registry-yaml/domain-sensitivity/manifest.v1.yaml");

type TierPolicy = {
  required_review_gates?: string[];
  required_reviewers?: string[];
  evidence_requirements?: string[];
};

type ScopePolicy = {
  approval_tier: ApprovalTier;
  specialist_role: string;
  default_skill: string;
  default_actions?: string[];
  authorized_domains?: string[];
  required_checks?: RequiredCheck[];
};

type DomainPolicy = {
  sensitivity_tier: ApprovalTier;
  path_globs?: string[];
};

type DomainSensitivityManifest = {
  spec: string;
  version: string;
  approval_tiers: Record<ApprovalTier, TierPolicy>;
  scope_policies: Record<string, ScopePolicy>;
  domains: Record<string, DomainPolicy>;
};

let cachedManifest: DomainSensitivityManifest | null = null;

function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "__DOUBLE_STAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/__DOUBLE_STAR__/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function uniq<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function loadDomainSensitivityManifest(): DomainSensitivityManifest {
  if (cachedManifest) return cachedManifest;
  const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
  cachedManifest = yaml.load(raw) as DomainSensitivityManifest;
  return cachedManifest;
}

export function resetDomainSensitivityManifestCache(): void {
  cachedManifest = null;
}

export function getScopePolicy(scopeKey: CodingScopeKey): ScopePolicy {
  const manifest = loadDomainSensitivityManifest();
  const policy = manifest.scope_policies[scopeKey];
  if (!policy) {
    throw new Error(`scope_policy_not_found:${scopeKey}`);
  }
  return policy;
}

export function getTierPolicy(tier: ApprovalTier): TierPolicy {
  const manifest = loadDomainSensitivityManifest();
  return manifest.approval_tiers[tier] ?? {};
}

function maxTier(a: ApprovalTier, b: ApprovalTier): ApprovalTier {
  const order: ApprovalTier[] = ["tier0", "tier1", "tier2", "tier3"];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
}

export function detectDomainsFromFiles(filesTouched: Array<FileTouch | string>): string[] {
  const manifest = loadDomainSensitivityManifest();
  const paths = filesTouched.map((file) => (typeof file === "string" ? file : file.path));
  const matched = new Set<string>();

  for (const [domainKey, domainPolicy] of Object.entries(manifest.domains)) {
    const matchers = (domainPolicy.path_globs ?? []).map(globToRegex);
    if (paths.some((filePath) => matchers.some((matcher) => matcher.test(filePath)))) {
      matched.add(domainKey);
    }
  }

  return [...matched];
}

export function derivePolicyForScopes(scopeKeys: CodingScopeKey[]): {
  approvalTier: ApprovalTier;
  authorizedDomains: string[];
  requiredChecks: RequiredCheck[];
  requiredReviewGates: string[];
  requiredReviewers: string[];
  evidenceRequirements: string[];
  specialistRoles: string[];
} {
  let approvalTier: ApprovalTier = "tier0";
  const authorizedDomains: string[] = [];
  const requiredChecks: RequiredCheck[] = [];
  const requiredReviewGates: string[] = [];
  const requiredReviewers: string[] = [];
  const evidenceRequirements: string[] = [];
  const specialistRoles: string[] = [];

  for (const scopeKey of scopeKeys) {
    const scopePolicy = getScopePolicy(scopeKey);
    approvalTier = maxTier(approvalTier, scopePolicy.approval_tier);
    authorizedDomains.push(...(scopePolicy.authorized_domains ?? []));
    requiredChecks.push(...(scopePolicy.required_checks ?? []));
    specialistRoles.push(scopePolicy.specialist_role);
  }

  const tierPolicy = getTierPolicy(approvalTier);
  requiredReviewGates.push(...(tierPolicy.required_review_gates ?? []));
  requiredReviewers.push(...(tierPolicy.required_reviewers ?? []));
  evidenceRequirements.push(...(tierPolicy.evidence_requirements ?? []));

  return {
    approvalTier,
    authorizedDomains: uniq(authorizedDomains),
    requiredChecks,
    requiredReviewGates: uniq(requiredReviewGates),
    requiredReviewers: uniq(requiredReviewers),
    evidenceRequirements: uniq(evidenceRequirements),
    specialistRoles: uniq(specialistRoles),
  };
}

export function deriveTierFromDomains(domainsTouched: string[]): ApprovalTier {
  const manifest = loadDomainSensitivityManifest();
  return domainsTouched.reduce<ApprovalTier>((current, domainKey) => {
    const tier = manifest.domains[domainKey]?.sensitivity_tier ?? "tier0";
    return maxTier(current, tier);
  }, "tier0");
}

export function evaluateOutcomePolicy(params: {
  scopeKeys: CodingScopeKey[];
  filesTouched: FileTouch[];
  existingDomainsTouched?: string[];
  checksRun: CheckRun[];
  reviewReady: boolean;
}): {
  domainsTouched: string[];
  approvalTier: ApprovalTier;
  requiredGates: string[];
  requiredReviewers: string[];
  requiredChecks: RequiredCheck[];
  evidenceRequirements: string[];
  missingEvidence: string[];
  checkFailures: string[];
} {
  const scopePolicy = derivePolicyForScopes(params.scopeKeys);
  const derivedDomains = detectDomainsFromFiles(params.filesTouched);
  const domainsTouched = uniq([...(params.existingDomainsTouched ?? []), ...derivedDomains]);
  const strongestTier = maxTier(scopePolicy.approvalTier, deriveTierFromDomains(domainsTouched));
  const tierPolicy = getTierPolicy(strongestTier);

  const requiredGates = uniq([
    ...scopePolicy.requiredReviewGates,
    ...(tierPolicy.required_review_gates ?? []),
  ]);
  const requiredReviewers = uniq([
    ...scopePolicy.requiredReviewers,
    ...(tierPolicy.required_reviewers ?? []),
  ]);
  const evidenceRequirements = uniq([
    ...scopePolicy.evidenceRequirements,
    ...(tierPolicy.evidence_requirements ?? []),
  ]);

  const checkFailures = params.checksRun
    .filter((check) => check.status !== "passed")
    .map((check) => check.cmd);

  const missingEvidence = evidenceRequirements.filter((requirement) => {
    if (requirement === "diff_summary") return params.filesTouched.length === 0;
    if (requirement === "checks_log") return params.checksRun.length === 0;
    if (requirement === "review_packet") return !params.reviewReady;
    if (requirement === "trace_capture") return !domainsTouched.includes("voice_runtime");
    return false;
  });

  return {
    domainsTouched,
    approvalTier: strongestTier,
    requiredGates,
    requiredReviewers,
    requiredChecks: scopePolicy.requiredChecks,
    evidenceRequirements,
    missingEvidence,
    checkFailures,
  };
}
