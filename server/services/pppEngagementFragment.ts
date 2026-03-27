/**
 * PPP (Purpose · Plan · Pressure) — governed prompt fragment for discovery and alignment.
 * @see docs/bot-builder/08-PPP-ENGAGEMENT-SYSTEM.md
 */
import type { PppEngagementConfig } from "@shared/conversationGrounding";
import { getOperationalMode, isModeNoDriftLocked } from "../config/operationalModes";

export interface BuildPppEngagementFragmentParams {
  modeId: string | null | undefined;
  ppp: PppEngagementConfig;
  /** True when operational mode is SALES or ppp.mode is sales_emphasis. */
  salesEmphasis: boolean;
}

export function buildPppEngagementFragment(
  params: BuildPppEngagementFragmentParams
): string {
  if (params.ppp.enabled === false) {
    return "";
  }

  const modeDef = getOperationalMode(params.modeId);
  const urgent =
    params.modeId === "EMERGENCY" ||
    isModeNoDriftLocked(params.modeId) ||
    modeDef?.noDriftLocked === true;

  if (urgent) {
    return (
      `### [SYSTEM: PPP ENGAGEMENT — MINIMAL]\n` +
      `In urgent or no-drift-locked modes, ask only **one** short clarifying question to resolve the immediate need. ` +
      `Do **not** run the full Purpose–Plan–Pressure discovery loop.`
    );
  }

  const sales =
    params.salesEmphasis || params.ppp.mode === "sales_emphasis";
  const salesLine = sales
    ? `\n**Sales discovery:** Use PPP answers to **qualify** before recommending products, upgrades, or next steps.`
    : "";

  return (
    `### [SYSTEM: PPP ENGAGEMENT — PURPOSE · PLAN · PRESSURE]\n` +
    `Open helpfully (e.g. ask what you can help with). Then systematically surface:\n` +
    `1) **Outcome** — What outcome are they looking for?\n` +
    `2) **Why** — Why that outcome (business reason)?\n` +
    `3) **Plan** — What is their plan to get there?\n` +
    `4) **Pressure** — When is that outcome due (deadline or milestone)?\n` +
    `Then capture **supporting activities** (actions that help the stated outcome) and **conflicting activities** ` +
    `(concrete conflicts: competing priorities, missing tools, scheduling issues — not personality labels).\n` +
    `Agree on **prioritized key needs** (P0 / P1 or top 1–3) for this conversation.\n` +
    `**Token discipline:** Prefer grounded tools and stated facts; avoid broad open-ended web research unless a governed tool requires it.${salesLine}\n` +
    `Stay on actions, plans, and dates — not therapy-style feelings talk.`
  );
}
