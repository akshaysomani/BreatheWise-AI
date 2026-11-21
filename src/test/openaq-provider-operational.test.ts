import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAQProvider } from '@/lib/air-quality/providers/openaq-provider';

describe('OpenAQ Provider Operational Readiness & Resilience (M7-006 / M8.7)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    delete process.env.OPENAQ_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Operational Status & Diagnostic Probe', () => {
    it('reports MISSING_API_KEY status when OPENAQ_API_KEY is not configured', () => {
      const provider = new OpenAQProvider();
      const status = provider.getProviderStatus();

      expect(status.configured).toBe(false);
      expect(status.status).toBe('MISSING_API_KEY');
      expect(status.endpoint).toBe('https://api.openaq.org/v3');
      expect(status.retryPolicy.maxRetries).toBe(2);
      expect(status.retryPolicy.timeoutMs).toBe(8000);
      expect(JSON.stringify(status)).not.toContain('key');
    });

    it('reports READY status when OPENAQ_API_KEY is configured without credential leakage', () => {
      const secretKey = 'openaq_secret_live_key_xyz123';
      const provider = new OpenAQProvider(secretKey);
      const status = provider.getProviderStatus();

      expect(status.configured).toBe(true);
      expect(status.status).toBe('READY');
      expect(status.endpoint).toBe('https://api.openaq.org/v3');
      // Verify the secret key is NEVER leaked in status object
      expect(JSON.stringify(status)).not.toContain(secretKey);
    });
  });

  describe('Fail-Closed Behavior on Missing Credentials', () => {
    it('returns empty array for nearby stations without issuing fetch when key is missing', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const provider = new OpenAQProvider();

      const stations = await provider.getNearbyStations(28.6139, 77.2090, 25);
      expect(stations).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns null for station measurements without issuing fetch when key is missing', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const provider = new OpenAQProvider();

      const measurements = await provider.getLatestStationMeasurements('openaq_12345');
      expect(measurements).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('HTTP Failure Handling & Graceful Degradation', () => {
    it('fails closed gracefully to empty stations when upstream returns HTTP 401 Unauthorized', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Invalid API key' }), {
          status: 401,
          statusText: 'Unauthorized',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const provider = new OpenAQProvider('invalid_key');
      const stations = await provider.getNearbyStations(28.6139, 77.2090);
      expect(stations).toEqual([]);
    });

    it('fails closed gracefully to null measurements when upstream returns HTTP 403 Forbidden', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Forbidden' }), {
          status: 403,
          statusText: 'Forbidden',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const provider = new OpenAQProvider('expired_key');
      const result = await provider.getLatestStationMeasurements('openaq_9999');
      expect(result).toBeNull();
    });

    it('handles HTTP 429 Rate Limiting with retry backoff and succeeds if retry is OK', async () => {
      const mockSuccessBody = {
        results: [
          {
            id: 888,
            name: 'Anand Vihar OpenAQ',
            locality: 'Delhi',
            state: 'Delhi',
            coordinates: { latitude: 28.647, longitude: 77.315 },
            sensors: [{ parameter: { name: 'pm25' } }],
          },
        ],
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ message: 'Rate limit exceeded' }), {
            status: 429,
            headers: { 'Retry-After': '0' },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockSuccessBody), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );

      const provider = new OpenAQProvider('test_key');
      const stations = await provider.getNearbyStations(28.647, 77.315);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(stations.length).toBe(1);
      expect(stations[0].id).toBe('openaq_888');
      expect(stations[0].supportedPollutants).toContain('PM2.5');
    });

    it('fails closed gracefully to empty stations when upstream times out or aborts', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new DOMException('The operation was aborted', 'AbortError')
      );

      const provider = new OpenAQProvider('test_key');
      const stations = await provider.getNearbyStations(28.6139, 77.2090);
      expect(stations).toEqual([]);
    });

    it('fails closed gracefully when upstream returns malformed non-JSON payload', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('<html><body>502 Bad Gateway</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      );

      const provider = new OpenAQProvider('test_key');
      const stations = await provider.getNearbyStations(28.6139, 77.2090);
      expect(stations).toEqual([]);
    });

    it('handles empty results payload cleanly', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const provider = new OpenAQProvider('test_key');
      const stations = await provider.getNearbyStations(28.6139, 77.2090);
      expect(stations).toEqual([]);
    });
  });
});
