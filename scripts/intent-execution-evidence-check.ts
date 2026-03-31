import { execSync } from "node:child_process";

import { detectDomainsFromFiles, deriveTierFromDomains, getTierPolicy } from "../server/services/domainPolicyEvaluator.js";

type EvidenceMarker = {
  intentExecutionId: string;
  approvalTier: "tier0" | "tier1" | "tier2" | "tier3";
  requiredGates: string[];
  requiredReviewers: string[];
  evidenceRequirements: string[];
  domainsTouched: string[];
  reviewReady: boolean;
};

function extractMarker(body: string): EvidenceMarker {
  const match = body.match(/<!-- CODING_INTENT_EVIDENCE\s*([\s\S]*?)\s*-->/);
  if (!match?.[1]) {
    throw new Error("CODING_INTENT_EVIDENCE marker missing from PR body");
  }
  return JSON.parse(match[1]) as EvidenceMarker;
}

function changedFilesForPr(baseRef: string): string[] {
  const diff = execSync(`git diff --name-only origin/${baseRef}...HEAD`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  return diff ? diff.split("\n").filter(Boolean) : [];
}

function tierOrder(tier: EvidenceMarker["approvalTier"]): number {
  return ["tier0", "tier1", "tier2", "tier3"].indexOf(tier);
}

function main(): void {
  const body = process.env.PR_BODY ?? "";
  const baseRef = process.env.GITHUB_BASE_REF ?? "main";
  const marker = extractMarker(body);
  const changedFiles = changedFilesForPr(baseRef);
  const derivedDomains = detectDomainsFromFiles(changedFiles);
  const strongestTier = deriveTierFromDomains(derivedDomains);
  const tierPolicy = getTierPolicy(strongestTier);

  if (tierOrder(marker.approvalTier) < tierOrder(strongestTier)) {
    throw new Error(`approval tier too low: marker=${marker.approvalTier} required=${strongestTier}`);
  }

  for (const gate of tierPolicy.required_review_gates ?? []) {
    if (!marker.requiredGates.includes(gate)) {
      throw new Error(`required gate missing from evidence marker: ${gate}`);
    }
  }

  for (const reviewer of tierPolicy.required_reviewers ?? []) {
    if (!marker.requiredReviewers.includes(reviewer)) {
      throw new Error(`required reviewer group missing from evidence marker: ${reviewer}`);
    }
  }

  if (!marker.intentExecutionId?.trim()) {
    throw new Error("intentExecutionId missing from evidence marker");
  }
}

main();
