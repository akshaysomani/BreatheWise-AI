/**
 * Open Redirect Prevention Utility
 * Ensures return URLs are strictly relative paths within the BreatheWise AI application.
 * Prevents attackers from supplying malicious external URLs (e.g., https://evil.com, //evil.com, javascript:...).
 */
export function sanitizeReturnUrl(returnUrl?: string | null): string {
  if (!returnUrl || typeof returnUrl !== 'string') {
    return '/dashboard';
  }

  const trimmed = returnUrl.trim();

  // Must begin with single forward slash, not protocol-relative '//', backslash '/\', or contain schemes like ':'
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.startsWith('/\\') &&
    !trimmed.includes(':') &&
    !trimmed.includes('\0')
  ) {
    return trimmed;
  }

  return '/dashboard';
}
