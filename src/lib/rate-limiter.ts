import { NextRequest } from 'next/server';

/**
 * BreatheWise AI — Defensive Rate Limiting Engine
 * 
 * ARCHITECTURAL AUDIT & LIMITATIONS (M2.1):
 * - IN-MEMORY LIMITATION: This implementation uses a process-local sliding-window in memory (`Map<string, RateLimitRecord>`).
 * - SCOPE: Ideal for single-instance Node.js servers, local development, and CI regression testing.
 * - PRODUCTION CLUSTERING NOTICE: In multi-instance deployments (e.g., Kubernetes pods or Vercel serverless functions),
 *   each instance has its own memory map. An attacker can theoretically partition requests across instances.
 *   For multi-node production deployment, configure the `DistributedRateLimiter` backed by Redis / Upstash sliding-window.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const ipCache = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes to prevent memory accumulation
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

/**
 * Basic IPv4 and IPv6 format validator to prevent header injection or garbage keys.
 */
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^[0-9a-fA-F:]+$/;

/**
 * Safely extracts client IP address from NextRequest without blindly trusting spoofable headers.
 * 
 * DEFENSE STRATEGY:
 * 1. Checks `req.ip` if provided by trusted hosting platform runtime.
 * 2. Parses `x-forwarded-for` and `x-real-ip` headers:
 *    - Strips IPv4-mapped IPv6 prefixes (`::ffff:`).
 *    - Validates IP syntax against strict IP regex.
 *    - Takes the client IP (first element) after sanitization, or falls back to '127.0.0.1'.
 */
export function getClientIp(req: NextRequest): string {
  // 1. Next.js platform native trusted IP if provided by runtime/edge
  const platformIp = (req as unknown as { ip?: string }).ip;
  if (platformIp && (IPV4_REGEX.test(platformIp) || IPV6_REGEX.test(platformIp))) {
    return platformIp;
  }

  // 2. Inspect X-Real-IP
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    const cleaned = realIp.trim().replace(/^::ffff:/, '');
    if (IPV4_REGEX.test(cleaned) || IPV6_REGEX.test(cleaned)) {
      return cleaned;
    }
  }

  // 3. Inspect X-Forwarded-For
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // The leftmost IP is the original client, subsequent are proxies
    const firstIp = forwardedFor.split(',')[0].trim().replace(/^::ffff:/, '');
    if (IPV4_REGEX.test(firstIp) || IPV6_REGEX.test(firstIp)) {
      return firstIp;
    }
  }

  // Fallback to secure localhost representation
  return '127.0.0.1';
}

/**
 * Checks sliding-window rate limit for a given identifier (IP or User ID).
 */
export function checkRateLimit(
  identifier: string,
  limit = 60,
  windowMs = 60_000
): RateLimitResult {
  const sanitizedIdentifier = identifier.trim().substring(0, 128);
  const now = Date.now();
  let record = ipCache.get(sanitizedIdentifier);

  if (!record) {
    record = { timestamps: [] };
    ipCache.set(sanitizedIdentifier, record);
  }

  // Filter timestamps within current rolling window
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

/**
 * Resets the rate limiter cache (primarily for test suite isolation).
 */
export function resetRateLimits(): void {
  ipCache.clear();
}
