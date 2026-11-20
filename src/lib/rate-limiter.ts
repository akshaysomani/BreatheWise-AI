/**
 * In-Memory Sliding-Window Rate Limiter
 * Provides defensive rate-limiting for abuse-sensitive routes (health, queries, mutations)
 * without requiring external Redis in development.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const ipCache = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipCache.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 60_000);
      if (record.timestamps.length === 0) {
        ipCache.delete(key);
      }
    }
  }, 300_000);
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

export function checkRateLimit(
  identifier: string,
  limit = 60,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  let record = ipCache.get(identifier);

  if (!record) {
    record = { timestamps: [] };
    ipCache.set(identifier, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetMs = Math.max(0, windowMs - (now - oldest));
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetMs,
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    limit,
    remaining: limit - record.timestamps.length,
    resetMs: windowMs,
  };
}

export function resetRateLimits(): void {
  ipCache.clear();
}
