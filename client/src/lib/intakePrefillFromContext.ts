/**
 * Helpers for tool-driven intake / manual input prefill (client-side).
 * Server owns authoritative field lists; metadata may carry `prefill` / `initialValue`.
 * See docs-governance/INTENT_DRIVEN_CANVAS_SPEC.md
 */

const STORAGE_KEY = 'gateway_intake_hint_v1';

/** Non-PII hints only (e.g. last intent label for UX). */
export function readStoredIntakeHint(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredIntakeHint(value: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, value.slice(0, 500));
  } catch {
    /* ignore quota */
  }
}

export function pickInitialManualValue(metadata: {
  prefill?: string;
  initialValue?: string;
}): string {
  const v = metadata.prefill ?? metadata.initialValue;
  return typeof v === 'string' ? v : '';
}
