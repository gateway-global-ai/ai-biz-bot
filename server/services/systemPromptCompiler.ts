/**
 * System Prompt Compiler — Structured controls → compiled prompt
 *
 * Compiles full system prompt from:
 *   1. Auto-generated identity/behavior (buildBehavioralPrompt)
 *   2. Structured guardrails (always, never, believe) from agent + site
 *   3. Mirroring directive when enabled
 *   4. User-directed systemPromptOverride
 *
 * Used by chat, voice, and telephony so all channels share one behavior source.
 */

import type { Agent, SiteConfig, StructuredControls, StructuredGuardrails } from "@shared/schema";
import { buildBehavioralPrompt, type BusinessContext } from "./promptCompiler";

const MAX_GUARDRAIL_ITEMS = 20;
const MAX_ITEM_LENGTH = 500;

/** Validate and normalize guardrail arrays (strip empty, trim, cap length). */
export function validateGuardrails(g: StructuredGuardrails | undefined): StructuredGuardrails {
  if (!g || typeof g !== "object") return {};
  const out: StructuredGuardrails = {};
  for (const key of ["always", "never", "believe"] as const) {
    const arr = g[key];
    if (!Array.isArray(arr)) continue;
    const normalized = arr
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_GUARDRAIL_ITEMS)
      .map((s) => s.slice(0, MAX_ITEM_LENGTH));
    if (normalized.length) out[key] = normalized;
  }
  return out;
}

/** Merge site guardrails over agent guardrails (site wins for same key). */
function mergeGuardrails(
  agentControls: StructuredControls | null | undefined,
  siteGuardrails: StructuredGuardrails | null | undefined
): StructuredGuardrails {
  const agent = validateGuardrails(agentControls?.guardrails);
  const site = validateGuardrails(siteGuardrails ?? undefined);
  return {
    always: [...(agent.always ?? []), ...(site.always ?? [])].slice(0, MAX_GUARDRAIL_ITEMS),
    never: [...(agent.never ?? []), ...(site.never ?? [])].slice(0, MAX_GUARDRAIL_ITEMS),
    believe: [...(agent.believe ?? []), ...(site.believe ?? [])].slice(0, MAX_GUARDRAIL_ITEMS),
  };
}

function formatGuardrailsSection(merged: StructuredGuardrails): string {
  const lines: string[] = [];
  if (merged.always?.length) {
    lines.push("Always: " + merged.always.map((s) => `"${s}"`).join("; "));
  }
  if (merged.never?.length) {
    lines.push("Never: " + merged.never.map((s) => `"${s}"`).join("; "));
  }
  if (merged.believe?.length) {
    lines.push("Believe/Values: " + merged.believe.map((s) => `"${s}"`).join("; "));
  }
  if (lines.length === 0) return "";
  return "\n\n### USER-DIRECTED GUARDRAILS\n" + lines.join("\n");
}

function formatMirroringLine(controls: StructuredControls | null | undefined): string {
  const m = controls?.mirroring;
  if (!m?.enabled) return "";
  const intensity = Math.min(100, Math.max(0, Number(m.intensity) ?? 50));
  return `\n\n### MIRRORING\nMatch the user's energy and communication style with intensity ${intensity}% — adapt tone and pace without losing your identity.`;
}

/**
 * Compile full system prompt from agent, site config, and optional business context.
 * Order: identity (behavioral prompt) → guardrails → mirroring → systemPromptOverride.
 */
export function compileFullSystemPrompt(
  agent: Agent,
  siteConfig: Pick<SiteConfig, "structuredGuardrails" | "systemPromptOverride">,
  businessContext?: BusinessContext
): string {
  const sections: string[] = [];

  const identity = buildBehavioralPrompt(agent, businessContext, siteConfig as Record<string, unknown>);
  sections.push(identity);

  const agentControls = agent.structuredControls as StructuredControls | null | undefined;
  const siteGuardrails = siteConfig.structuredGuardrails as StructuredGuardrails | null | undefined;
  const merged = mergeGuardrails(agentControls, siteGuardrails);
  const guardrailsBlock = formatGuardrailsSection(merged);
  if (guardrailsBlock) sections.push(guardrailsBlock);

  const mirroringLine = formatMirroringLine(agentControls);
  if (mirroringLine) sections.push(mirroringLine);

  const override = siteConfig.systemPromptOverride?.trim();
  if (override) {
    sections.push("\n\n--- USER-DIRECTED ADDITIONS ---\n" + override);
  }

  return sections.join("");
}
