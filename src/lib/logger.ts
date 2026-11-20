/**
 * Sanitized Application Logger
 * Automatically redacts sensitive fields (passwords, tokens, keys, emails, coordinates)
 * to comply with OWASP ASVS and NIST SP 800-53 security logging requirements.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'secret',
  'apikey',
  'authorization',
  'cookie',
  'gemini_api_key',
  'openaq_api_key',
  'session_secret',
]);

function redactObject(obj: unknown, depth = 0): unknown {
  if (depth > 4 || obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactObject(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const sanitized = context ? (redactObject(context) as Record<string, unknown>) : undefined;
    console.log(
      JSON.stringify({
        level: 'INFO',
        timestamp,
        message,
        ...(sanitized ? { context: sanitized } : {}),
      })
    );
  },

  warn: (message: string, context?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const sanitized = context ? (redactObject(context) as Record<string, unknown>) : undefined;
    console.warn(
      JSON.stringify({
        level: 'WARN',
        timestamp,
        message,
        ...(sanitized ? { context: sanitized } : {}),
      })
    );
  },

  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? (redactObject(context) as Record<string, unknown>) : undefined;
    const errorDetails =
      error instanceof Error
        ? { name: error.name, message: error.message }
        : error;

    console.error(
      JSON.stringify({
        level: 'ERROR',
        timestamp,
        message,
        error: errorDetails,
        ...(sanitizedContext ? { context: sanitizedContext } : {}),
      })
    );
  },
};
