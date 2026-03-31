import { useState, useEffect } from 'react';
import { parseReferrerDisplayLabel } from '@/lib/referrerDisplay';

const STORAGE_KEY = 'gg_platform_entry_referrer_v1';

function readStoredLabel(): string | null | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return undefined;
    return raw === '' ? null : raw;
  } catch {
    return undefined;
  }
}

/**
 * Captures external referring hostname once per tab session for platform home idle copy.
 * Persists in sessionStorage so refresh does not lose attribution when document.referrer clears.
 */
export function usePlatformEntryReferrer(): string | null {
  const [label, setLabel] = useState<string | null>(() => readStoredLabel() ?? null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const existing = sessionStorage.getItem(STORAGE_KEY);
      if (existing !== null) {
        setLabel(existing === '' ? null : existing);
        return;
      }
      const parsed = parseReferrerDisplayLabel(document.referrer);
      sessionStorage.setItem(STORAGE_KEY, parsed ?? '');
      setLabel(parsed);
    } catch {
      try {
        sessionStorage.setItem(STORAGE_KEY, '');
      } catch {
        /* ignore */
      }
      setLabel(null);
    }
  }, []);

  return label;
}
