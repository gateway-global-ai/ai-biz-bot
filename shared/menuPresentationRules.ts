/**
 * Menu presentation rules aligned with docs-governance/AIOS_BUSINESS_PLAN_WIRING.md
 * (sourced from user_uploads/new/AIOS_BUSINESS_PLAN.md §3 — dynamic menu templates).
 *
 * Use when building OS menu lists or voice prompts from dynamic data — not for e-commerce catalog menus.
 */

export const MENU_PRESENTATION = {
  /** If top-level options exceed this, split into categories / "More" (plan §3). */
  maxTopLevelBeforeSplit: 5,
  /** Voice prompts list this many primary options before "more options" (plan §3). */
  voiceListTopN: 3,
} as const;

export interface MenuSplitBucket<T> {
  primary: T[];
  overflow: T[];
}

/**
 * Splits a flat list when it exceeds `maxTopLevelBeforeSplit`.
 * Overflow is intended for a "More" submenu or secondary screen.
 */
export function splitTopLevelIfNeeded<T>(
  items: T[],
  max = MENU_PRESENTATION.maxTopLevelBeforeSplit
): MenuSplitBucket<T> {
  if (items.length <= max) {
    return { primary: [...items], overflow: [] };
  }
  return {
    primary: items.slice(0, max),
    overflow: items.slice(max),
  };
}

/** First N items for concise voice / TTS listing. */
export function takeTopNForVoicePrompt<T>(items: T[], n = MENU_PRESENTATION.voiceListTopN): T[] {
  return items.slice(0, n);
}
