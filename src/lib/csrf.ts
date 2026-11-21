import { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from './session';

/**
 * BreatheWise AI — Hardened Cross-Site Request Forgery (CSRF) & Trusted Origin Guard
 * 
 * SECURITY SPECIFICATION (M3.1):
 * - Eliminates blind reliance on request-supplied `Host` or `X-Forwarded-Host` headers.
 * - Resolves trusted origins from controlled server-side configuration (`TRUSTED_ORIGINS`, `APP_URL`, `NEXT_PUBLIC_APP_URL`).
 * - In non-production environments, permits standard loopback origins (`localhost:3000`, `127.0.0.1:3000`).
 * - Validates incoming `Origin` and `Referer` headers against the controlled trusted origin whitelist.
 * - For state-changing mutations (POST, PUT, PATCH, DELETE) that carry session cookies:
 *   - Rejects untrusted cross-origin requests with HTTP 403.
 *   - Rejects requests with malformed Origin or Referer URLs.
 *   - Fails closed if BOTH Origin and Referer are missing on cookie-authenticated browser requests.
 * - Pure Bearer token requests (programmatic API/CLI) and safe read methods (GET, HEAD, OPTIONS) are exempt.
 */

/**
 * Known verified legitimate production application origins for BreatheWise AI deployment.
 * Explicitly whitelists the primary production domain and canonical main-branch preview domain.
 * Arbitrary preview deployments and wildcards are strictly prohibited.
 */
export const VERIFIED_PRODUCTION_ORIGINS = [
  'https://breathe-wise-ai-seven.vercel.app',
  'https://breathe-wise-ai-git-main-akshaysomanis-projects.vercel.app',
] as const;

/**
 * Retrieves the normalized set of trusted origins from server configuration.
 */
export function getTrustedOrigins(): Set<string> {
  const origins = new Set<string>();

  // 1. Built-in verified production application origins
  for (const prodOrigin of VERIFIED_PRODUCTION_ORIGINS) {
    origins.add(prodOrigin.toLowerCase());
  }

  // 2. Explicitly configured TRUSTED_ORIGINS environment variable
  const envOrigins = process.env.TRUSTED_ORIGINS;
  if (envOrigins) {
    envOrigins.split(',').forEach((o) => {
      const trimmed = o.trim();
      if (trimmed) {
        try {
          const parsed = new URL(trimmed);
          origins.add(parsed.origin.toLowerCase());
        } catch {
          // If already just host:port or valid format
          origins.add(trimmed.toLowerCase());
        }
      }
    });
  }

  // 3. Server APP_URL or NEXT_PUBLIC_APP_URL
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      const parsed = new URL(appUrl);
      origins.add(parsed.origin.toLowerCase());
    } catch {
      origins.add(appUrl.toLowerCase());
    }
  }

  // 4. Local development and test fallbacks (disabled if NODE_ENV === 'production' unless configured)
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
    origins.add('http://localhost:3001');
    origins.add('http://127.0.0.1:3001');
  }

  return origins;
}

export interface CsrfValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates request origin against server-side trusted origins.
 */
export function validateCsrf(req: NextRequest): CsrfValidationResult {
  const method = req.method.toUpperCase();

  // Safe read-only HTTP methods are exempt from CSRF checks
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  // Programmatic API clients sending Bearer authorization are not vulnerable to browser CSRF
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.trim().startsWith('Bearer ')) {
    return { valid: true };
  }

  const hasSessionCookie = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const trustedOrigins = getTrustedOrigins();

  // 1. If Origin header is provided (standard for modern browser CORS/fetch/POST)
  if (origin) {
    try {
      const parsedOrigin = new URL(origin).origin.toLowerCase();
      if (trustedOrigins.has(parsedOrigin)) {
        return { valid: true };
      }
      return {
        valid: false,
        reason: `Untrusted Origin header: '${origin}'. Does not match configured trusted origins.`,
      };
    } catch {
      return { valid: false, reason: 'Malformed Origin header' };
    }
  }

  // 2. If Origin is absent, inspect Referer header as fallback
  if (referer) {
    try {
      const parsedRefererOrigin = new URL(referer).origin.toLowerCase();
      if (trustedOrigins.has(parsedRefererOrigin)) {
        return { valid: true };
      }
      return {
        valid: false,
        reason: `Untrusted Referer header: '${referer}'. Does not match configured trusted origins.`,
      };
    } catch {
      return { valid: false, reason: 'Malformed Referer header' };
    }
  }

  // 3. Both Origin and Referer are absent
  // If the request carries an ambient session cookie, missing origin headers indicate an anomalous request
  if (hasSessionCookie) {
    return {
      valid: false,
      reason: 'Missing both Origin and Referer headers on cookie-authenticated state-changing request.',
    };
  }

  // In headless tests or direct server-to-server calls without cookies, verify custom header
  const customHeader = req.headers.get('x-requested-with') || req.headers.get('content-type');
  if (customHeader?.includes('application/json')) {
    return { valid: true };
  }

  return { valid: true };
}
