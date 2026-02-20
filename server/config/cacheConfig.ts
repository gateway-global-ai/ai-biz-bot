/**
 * Cache TTL configuration for business data and tour guide features.
 * Use with in-memory cache (e.g. businessDataCache singleton) or DB-backed cache.
 */

export const CACHE_TTL_MINUTES = {
  /** Enriched business payload (general + optional intelligence). */
  BUSINESS_DATA: 24 * 60, // 24 hours
  /** Review analysis / full report (SERP + Gemini). */
  REVIEW_ANALYSIS: 7 * 24 * 60, // 7 days (spec suggests 30 days; adjust as needed)
  /** System instruction built from business context. */
  SYSTEM_INSTRUCTION: 60, // 1 hour
  /** Tour specification (YAML-derived). */
  TOUR_SPEC: 30 * 24 * 60, // 30 days
} as const;

/** Key prefixes for in-memory cache. */
export const CACHE_PREFIX = {
  BUSINESS_DATA: 'business_data',
  REVIEW_REPORT: 'review_report',
  SYSTEM_INSTRUCTION: 'system_instruction',
  TOUR_SPEC: 'tour_spec',
} as const;

/** In-memory cache entry. */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/** Simple in-memory TTL cache keyed by string (e.g. placeId). */
class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T, ttlMinutes: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMinutes * 60 * 1000,
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }
}

/** Shared in-memory cache for business data and review reports. */
export const businessDataMemoryCache = new MemoryCache();
