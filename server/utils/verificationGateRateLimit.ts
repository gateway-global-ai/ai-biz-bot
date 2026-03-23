/**
 * Verification gate rate limit: Redis (global) when VERIFICATION_GATE_REDIS_URL is set,
 * else in-memory sliding window (per process / per replica).
 */

import crypto from "crypto";
import Redis from "ioredis";

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const DEFAULT_MAX_PER_WINDOW = parseInt(process.env.VERIFICATION_GATE_MAX_PER_WINDOW ?? "120", 10);

let redisSingleton: Redis | null | undefined = undefined;

function getRedis(): Redis | null {
  const url = process.env.VERIFICATION_GATE_REDIS_URL?.trim();
  if (!url) return null;
  if (redisSingleton === undefined) {
    try {
      redisSingleton = new Redis(url, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
      });
    } catch (e) {
      console.warn("[verificationGateRateLimit] Redis init failed:", e);
      redisSingleton = null;
    }
  }
  return redisSingleton;
}

function redisKeyForRateLimit(key: string): string {
  const h = crypto.createHash("sha256").update(key, "utf8").digest("hex").slice(0, 48);
  return `vgrl:${h}`;
}

function prune(bucket: Bucket, now: number): void {
  const cutoff = now - WINDOW_MS;
  while (bucket.timestamps.length > 0 && bucket.timestamps[0]! < cutoff) {
    bucket.timestamps.shift();
  }
}

function checkMemoryLimit(key: string): { allowed: boolean; retryAfterSec?: number } {
  const max = Number.isFinite(DEFAULT_MAX_PER_WINDOW) && DEFAULT_MAX_PER_WINDOW > 0 ? DEFAULT_MAX_PER_WINDOW : 120;
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }
  prune(bucket, now);
  if (bucket.timestamps.length >= max) {
    const oldest = bucket.timestamps[0]!;
    const retryAfterMs = WINDOW_MS - (now - oldest);
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  bucket.timestamps.push(now);
  return { allowed: true };
}

/**
 * Redis: fixed 60s window via INCR + EXPIRE (global across pods).
 * Falls back to memory on Redis error or missing URL.
 */
export async function checkVerificationGateRateLimit(
  key: string,
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const max = Number.isFinite(DEFAULT_MAX_PER_WINDOW) && DEFAULT_MAX_PER_WINDOW > 0 ? DEFAULT_MAX_PER_WINDOW : 120;
  const r = getRedis();
  if (r) {
    const rk = redisKeyForRateLimit(key);
    try {
      const n = await r.incr(rk);
      if (n === 1) await r.expire(rk, 60);
      if (n > max) {
        const ttl = await r.ttl(rk);
        return { allowed: false, retryAfterSec: Math.max(1, ttl > 0 ? ttl : 60) };
      }
      return { allowed: true };
    } catch (e) {
      console.warn("[verificationGateRateLimit] Redis error, using memory:", e instanceof Error ? e.message : e);
    }
  }
  return checkMemoryLimit(key);
}
