/**
 * Best-effort label from document.referrer / Referer URL for idle canvas copy.
 * Not PII — hostname only; same-origin navigation returns null.
 */
export function parseReferrerDisplayLabel(referrer: string): string | null {
  if (!referrer?.trim()) return null;
  try {
    const u = new URL(referrer);
    if (typeof window !== 'undefined' && u.origin === window.location.origin) {
      return null;
    }
    const host = u.hostname.replace(/^www\./i, '').trim();
    return host || null;
  } catch {
    return null;
  }
}
