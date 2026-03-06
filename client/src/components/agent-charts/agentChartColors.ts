/**
 * Shared colors for DiSC and ARCH agent profile charts.
 * Matches investor demo theme and zip reference (D/I/S/C, A/R/Cx/H).
 */
export const DISC_COLORS = {
  D: "#ef4444", // Dominance — red
  I: "#f59e0b", // Influence — amber
  S: "#10b981", // Steadiness — emerald
  C: "#3b82f6", // Conscientiousness — blue
} as const;

export const ARCH_COLORS = {
  A: "#10b981", // Acknowledge — emerald
  R: "#3b82f6", // Reflect — blue
  Cx: "#f59e0b", // Context — amber
  H: "#ef4444", // Handoff — red
} as const;
