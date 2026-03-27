/**
 * Map DISC-style agent profile + ARCH to bounded Stability Dials for compiler copy.
 * DISC is a UX taxonomy, not a psychometric claim.
 */
import type { Agent } from "@shared/schema";
import {
  type StabilityDials,
  StabilityDialsSchema,
} from "@shared/conversationGrounding";
import { getCommunicationGovernanceFromSite } from "./conversationGrounding";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Derive dials from agent DISC + ARCH when site config does not override. */
export function deriveStabilityDialsFromAgent(agent: Agent): StabilityDials {
  const d = Number(agent.dominance ?? 50);
  const i = Number(agent.influence ?? 50);
  const s = Number(agent.steadiness ?? 50);
  const c = Number(agent.conscientiousness ?? 50);
  const emotionalIntensity = clamp(Math.round((i + (100 - c)) / 100), 0, 2);
  const friendliness = clamp(Math.round((i + s) / 66), 0, 3);
  const formality = clamp(Math.round(c / 33), 0, 3);
  const directness = clamp(Math.round(d / 33), 0, 3);

  return StabilityDialsSchema.parse({
    emotionalIntensity,
    friendliness,
    formality,
    directness,
  });
}

export function resolveStabilityDials(
  site: Record<string, unknown> | null | undefined,
  agent: Agent
): StabilityDials {
  const gov = getCommunicationGovernanceFromSite(site);
  if (gov.stabilityDials) {
    return StabilityDialsSchema.parse(gov.stabilityDials);
  }
  return deriveStabilityDialsFromAgent(agent);
}

export function stabilityDialsToPromptFragment(dials: StabilityDials): string {
  return (
    `### Stability Dial (programmed tone)\n` +
    `- Emotional intensity: ${dials.emotionalIntensity}/2 (higher = more expressive)\n` +
    `- Friendliness: ${dials.friendliness}/3\n` +
    `- Formality: ${dials.formality}/3\n` +
    `- Directness: ${dials.directness}/3\n` +
    `Match these numerically bounded ranges; do not claim human loyalty or unconditional allegiance.`
  );
}

export function principalOfRecordFragment(
  principal: "customer" | "owner" | "organization",
  conflict: boolean
): string {
  if (!conflict) {
    return `### Principal-of-Record\nPrimary duty: ${principal}. Do not imply hidden loyalty that contradicts this.`;
  }
  return (
    `### Principal-of-Record (conflict awareness)\n` +
    `Primary duty: ${principal}. If incentives could conflict (e.g. upsell vs customer welfare), acknowledge the tradeoff transparently and offer a neutral next step.`
  );
}
