/**
 * Simple in-memory cache for Google Places API responses
 * Reduces API calls and costs by caching search results
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class PlacesCache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number; // Time to live in milliseconds
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(defaultTTLMinutes: number = 60) {
    this.cache = new Map();
    this.defaultTTL = defaultTTLMinutes * 60 * 1000;
    
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Clean up resources and stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * Generate cache key from request parameters
   */
  private generateKey(prefix: string, params: any): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as any);
    
    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Get cached data if available and not expired
   */
  get<T>(prefix: string, params: any): T | null {
    const key = this.generateKey(prefix, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[Cache HIT] ${key}`);
    return entry.data as T;
  }

  /**
   * Store data in cache
   */
  set<T>(prefix: string, params: any, data: T, ttlMinutes?: number): void {
    const key = this.generateKey(prefix, params);
    const ttl = ttlMinutes ? ttlMinutes * 60 * 1000 : this.defaultTTL;
    const now = Date.now();

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });

    console.log(`[Cache SET] ${key} (expires in ${ttlMinutes || this.defaultTTL / 60000}min)`);
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(prefix: string, params: any): void {
    const key = this.generateKey(prefix, params);
    this.cache.delete(key);
    console.log(`[Cache INVALIDATE] ${key}`);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    console.log('[Cache CLEAR] All entries cleared');
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Cache CLEANUP] Removed ${removed} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
      defaultTTLMinutes: this.defaultTTL / 60000,
    };
  }

  /**
   * Get or fetch pattern - common caching pattern
   */
  async getOrFetch<T>(
    prefix: string,
    params: any,
    fetchFn: () => Promise<T>,
    ttlMinutes?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(prefix, params);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch data
    console.log(`[Cache MISS] ${this.generateKey(prefix, params)}`);
    const data = await fetchFn();

    // Store in cache
    this.set(prefix, params, data, ttlMinutes);

    return data;
  }
}

// Singleton instance
export const placesCache = new PlacesCache(60); // 60 minutes default TTL

// Cache TTL configurations (in minutes)
export const CACHE_TTL = {
  PLACE_SEARCH: 60,        // Search results cache for 1 hour
  PLACE_DETAILS: 1440,     // Place details cache for 24 hours
  OWNER_REPORT: 720,       // Competitive reports cache for 12 hours
  MARKETING_SEARCH: 360,   // Marketing searches cache for 6 hours
} as const;
