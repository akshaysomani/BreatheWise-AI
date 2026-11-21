import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  MemoryRateLimitStore,
  SharedStorageBackend,
  SharedRateLimitStore,
  RedisRateLimitStore,
  DistributedRateLimiter,
  getClientIp,
  checkRateLimit,
  resetRateLimits,
  RedisClientInterface,
} from '@/lib/rate-limiter';

describe('BreatheWise AI — Distributed Rate Limiting & Infrastructure (M8.1 / M7-001)', () => {
  beforeEach(() => {
    resetRateLimits();
    vi.restoreAllMocks();
    delete process.env.TRUST_PROXY;
  });

  describe('1. Multi-Instance Shared Limit Enforcement', () => {
    it('enforces a shared limit across two independently instantiated rate limiters connected to a shared store', async () => {
      // 1. Central shared cluster backend engine
      const sharedBackend = new SharedStorageBackend();

      // 2. Instance A (e.g. Pod 1) and Instance B (e.g. Pod 2)
      const instanceALimiter = new DistributedRateLimiter(
        new SharedRateLimitStore(sharedBackend),
        new MemoryRateLimitStore()
      );
      const instanceBLimiter = new DistributedRateLimiter(
        new SharedRateLimitStore(sharedBackend),
        new MemoryRateLimitStore()
      );

      const targetKey = 'user_commute_cluster_test';
      const limit = 5;
      const windowMs = 60_000;

      // 3. Instance A processes 3 requests
      const r1 = await instanceALimiter.check(targetKey, limit, windowMs);
      const r2 = await instanceALimiter.check(targetKey, limit, windowMs);
      const r3 = await instanceALimiter.check(targetKey, limit, windowMs);
      expect(r1.allowed).toBe(true);
      expect(r2.allowed).toBe(true);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(2);

      // 4. Instance B processes 2 requests (exhausting the shared quota)
      const r4 = await instanceBLimiter.check(targetKey, limit, windowMs);
      const r5 = await instanceBLimiter.check(targetKey, limit, windowMs);
      expect(r4.allowed).toBe(true);
      expect(r5.allowed).toBe(true);
      expect(r5.remaining).toBe(0);

      // 5. 6th request sent to Instance A is BLOCKED because Instance B consumed the remaining quota
      const r6_instanceA = await instanceALimiter.check(targetKey, limit, windowMs);
      expect(r6_instanceA.allowed).toBe(false);
      expect(r6_instanceA.remaining).toBe(0);

      // 6. 7th request sent to Instance B is ALSO BLOCKED
      const r7_instanceB = await instanceBLimiter.check(targetKey, limit, windowMs);
      expect(r7_instanceB.allowed).toBe(false);
      expect(r7_instanceB.remaining).toBe(0);
    });

    it('separates user-based keys and IP-based keys correctly', async () => {
      const sharedBackend = new SharedStorageBackend();
      const limiter = new DistributedRateLimiter(new SharedRateLimitStore(sharedBackend));

      const userKey = 'user_12345';
      const ipKey = 'ip_203.0.113.1';
      const limit = 2;

      await limiter.check(userKey, limit, 60_000);
      await limiter.check(userKey, limit, 60_000);
      const userBlocked = await limiter.check(userKey, limit, 60_000);
      expect(userBlocked.allowed).toBe(false);

      // IP key must not be affected by user key exhaustion
      const ipAllowed = await limiter.check(ipKey, limit, 60_000);
      expect(ipAllowed.allowed).toBe(true);
    });

    it('blocks concurrent bursts exceeding the configured allowance', async () => {
      const sharedBackend = new SharedStorageBackend();
      const limiter = new DistributedRateLimiter(new SharedRateLimitStore(sharedBackend));

      const limit = 10;
      const promises = Array.from({ length: 15 }, () =>
        limiter.check('concurrent_burst_key', limit, 60_000)
      );

      const results = await Promise.all(promises);
      const allowedCount = results.filter((r) => r.allowed).length;
      const blockedCount = results.filter((r) => !r.allowed).length;

      expect(allowedCount).toBe(10);
      expect(blockedCount).toBe(5);
    });
  });

  describe('2. Window Expiration & Storage Boundedness', () => {
    it('allows new requests once the sliding window expires', async () => {
      const store = new MemoryRateLimitStore();
      const key = 'sliding_window_expiration_test';
      const limit = 2;
      const windowMs = 500; // 500ms short window

      expect(store.checkAndIncrement(key, limit, windowMs).allowed).toBe(true);
      expect(store.checkAndIncrement(key, limit, windowMs).allowed).toBe(true);
      expect(store.checkAndIncrement(key, limit, windowMs).allowed).toBe(false);

      // Advance time beyond window
      await new Promise((resolve) => setTimeout(resolve, 550));

      const afterExpiry = store.checkAndIncrement(key, limit, windowMs);
      expect(afterExpiry.allowed).toBe(true);
      expect(afterExpiry.remaining).toBe(1);
    });

    it('prunes stale records so memory store does not grow indefinitely', () => {
      const store = new MemoryRateLimitStore();
      const key1 = 'transient_key_1';
      const key2 = 'transient_key_2';

      store.checkAndIncrement(key1, 5, 100);
      store.checkAndIncrement(key2, 5, 100);
      expect(store.size()).toBe(2);

      // Artificially prune after timestamps expire
      vi.useFakeTimers();
      vi.advanceTimersByTime(200);

      store.pruneStaleRecords();
      expect(store.size()).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('3. Redis Distributed Store & Outage Resilience', () => {
    function createMockRedisClient(): RedisClientInterface & { storage: Map<string, Array<{ score: number; member: string }>> } {
      const storage = new Map<string, Array<{ score: number; member: string }>>();
      return {
        storage,
        async zremrangebyscore(key: string, min: number | string, max: number | string) {
          const list = storage.get(key) || [];
          const maxNum = typeof max === 'string' ? parseFloat(max) : max;
          const filtered = list.filter((item) => item.score > maxNum);
          const removed = list.length - filtered.length;
          storage.set(key, filtered);
          return removed;
        },
        async zcard(key: string) {
          const list = storage.get(key) || [];
          return list.length;
        },
        async zadd(key: string, score: number, member: string) {
          const list = storage.get(key) || [];
          list.push({ score, member });
          storage.set(key, list);
          return 1;
        },
        async pexpire() {
          return 1;
        },
        async zrange(key: string) {
          const list = storage.get(key) || [];
          return list.length > 0 ? [String(list[0].score)] : [];
        },
        async del(key: string) {
          storage.delete(key);
          return 1;
        },
      };
    }

    it('executes atomic sliding window operations against a Redis client adapter', async () => {
      const mockRedis = createMockRedisClient();
      const redisStore = new RedisRateLimitStore(mockRedis);
      const limiter = new DistributedRateLimiter(redisStore);

      const r1 = await limiter.check('redis_test_key', 2, 60_000);
      const r2 = await limiter.check('redis_test_key', 2, 60_000);
      const r3 = await limiter.check('redis_test_key', 2, 60_000);

      expect(r1.allowed).toBe(true);
      expect(r1.source).toBe('DISTRIBUTED');
      expect(r2.allowed).toBe(true);
      expect(r3.allowed).toBe(false);
      expect(r3.source).toBe('DISTRIBUTED');
    });

    it('enforces conservative fallback on high-risk authentication tier during Redis outage', async () => {
      const mockRedis = createMockRedisClient();
      const redisStore = new RedisRateLimitStore(mockRedis);
      const fallbackMemory = new MemoryRateLimitStore();
      const limiter = new DistributedRateLimiter(redisStore, fallbackMemory);

      // Simulate Redis outage
      redisStore.simulateOutage(true);

      // For high-risk auth tier (e.g. login), limit is conservatively halved (10 -> 5)
      const targetKey = 'login_user_outage_test';
      const normalLimit = 10;

      for (let i = 0; i < 5; i++) {
        const check = await limiter.check(targetKey, normalLimit, 60_000, 'HIGH_RISK_AUTH');
        expect(check.allowed).toBe(true);
        expect(check.source).toBe('FALLBACK');
        expect(check.limit).toBe(5); // Conservative 50% threshold
      }

      // 6th attempt must be blocked by conservative fallback
      const blocked = await limiter.check(targetKey, normalLimit, 60_000, 'HIGH_RISK_AUTH');
      expect(blocked.allowed).toBe(false);
      expect(blocked.source).toBe('FALLBACK');
    });

    it('handles Redis timeouts safely by gracefully falling back', async () => {
      const slowRedis: RedisClientInterface = {
        async zremrangebyscore() {
          await new Promise((r) => setTimeout(r, 200)); // Deliberate delay exceeding timeout
          return 0;
        },
        async zcard() { return 0; },
        async zadd() { return 1; },
        async pexpire() { return 1; },
        async zrange() { return []; },
        async del() { return 1; },
      };

      const redisStore = new RedisRateLimitStore(slowRedis, 50); // 50ms short timeout
      const fallbackStore = new MemoryRateLimitStore();
      const limiter = new DistributedRateLimiter(redisStore, fallbackStore);

      const result = await limiter.check('timeout_test_key', 5, 60_000, 'LOW_RISK_READ');
      expect(result.allowed).toBe(true);
      expect(result.source).toBe('FALLBACK');
    });
  });

  describe('4. getClientIp Anti-Spoofing Security', () => {
    it('does NOT trust arbitrary x-forwarded-for headers when strict proxy verification is enabled', () => {
      const req = new NextRequest('http://localhost:3000/api/community/reports/123/upvote', {
        headers: {
          'x-forwarded-for': '203.0.113.199, 10.0.0.1',
          'x-real-ip': '203.0.113.200',
        },
      });

      const ip = getClientIp(req, { strictProxyVerification: true });
      expect(ip).toBe('127.0.0.1'); // Does not trust unverified forwarded headers
    });

    it('safely parses and validates x-forwarded-for when valid IPv4 is supplied', () => {
      const req = new NextRequest('http://localhost:3000/api/community/reports/123/upvote', {
        headers: {
          'x-forwarded-for': '198.51.100.42, 10.0.0.1',
        },
      });

      const ip = getClientIp(req);
      expect(ip).toBe('198.51.100.42');
    });

    it('strips IPv4-mapped IPv6 prefixes from forwarded headers', () => {
      const req = new NextRequest('http://localhost:3000/api/community/reports/123/upvote', {
        headers: {
          'x-forwarded-for': '::ffff:198.51.100.99',
        },
      });

      const ip = getClientIp(req);
      expect(ip).toBe('198.51.100.99');
    });

    it('rejects malformed or injection strings in x-forwarded-for headers', () => {
      const req = new NextRequest('http://localhost:3000/api/community/reports/123/upvote', {
        headers: {
          'x-forwarded-for': '127.0.0.1; DROP TABLE users; --',
        },
      });

      const ip = getClientIp(req);
      expect(ip).toBe('127.0.0.1');
    });
  });

  describe('5. Backward Compatibility & Operational Health', () => {
    it('maintains synchronous checkRateLimit for existing call sites', () => {
      const key = 'synchronous_legacy_call_site';
      const r1 = checkRateLimit(key, 2, 60_000);
      const r2 = checkRateLimit(key, 2, 60_000);
      const r3 = checkRateLimit(key, 2, 60_000);

      expect(r1.allowed).toBe(true);
      expect(r2.allowed).toBe(true);
      expect(r3.allowed).toBe(false);
      expect(r3.remaining).toBe(0);
    });
  });
});
