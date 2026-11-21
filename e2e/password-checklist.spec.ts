import { test, expect } from '@playwright/test';

/**
 * BreatheWise AI — Password Requirements Checklist & Real-Time Validation E2E Spec
 * 
 * Verifies live browser behavior:
 * 1. Initial state: Requirements neutral, strength container hidden when input empty.
 * 2. Incremental typing: Each requirement checkmark turns green dynamically as rule is satisfied.
 * 3. Dynamic strength meter: Updates from Weak -> Fair -> Good -> Strong as entropy increases.
 * 4. Character deletion: Unmet requirements immediately lose their completed state.
 * 5. Confirm password matching: Real-time feedback for mismatch vs. match.
 * 6. Successful registration: Valid submission creates account and navigates to /dashboard.
 */

test.describe('Password Requirements Live Checklist & Registration UX', () => {
  let testIp = '10.99.1.1';

  test.beforeEach(async ({ context }) => {
    testIp = `10.99.${Math.floor(Math.random() * 200 + 1)}.${Math.floor(Math.random() * 200 + 1)}`;
    await context.setExtraHTTPHeaders({
      'x-forwarded-for': testIp,
    });
  });

  test('evaluates live requirements, strength meter, and confirmation in real-time', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h1')).toContainText(/Create Household Account/i);

    const passwordInput = page.locator('input#register-password');
    const confirmInput = page.locator('input#register-confirm-password');

    // 1. Initial neutral state: all 5 requirement items have data-valid="false"
    const reqMinLength = page.locator('[data-testid="req-min-length"]');
    const reqUpper = page.locator('[data-testid="req-uppercase"]');
    const reqLower = page.locator('[data-testid="req-lowercase"]');
    const reqNumber = page.locator('[data-testid="req-number"]');
    const reqSpecial = page.locator('[data-testid="req-special"]');

    await expect(reqMinLength).toHaveAttribute('data-valid', 'false');
    await expect(reqUpper).toHaveAttribute('data-valid', 'false');
    await expect(reqLower).toHaveAttribute('data-valid', 'false');
    await expect(reqNumber).toHaveAttribute('data-valid', 'false');
    await expect(reqSpecial).toHaveAttribute('data-valid', 'false');

    // Strength meter is not shown before typing
    await expect(page.locator('[data-testid="password-strength-container"]')).not.toBeVisible();

    // 2. Type lowercase only ("abc")
    await passwordInput.fill('abc');
    await expect(reqLower).toHaveAttribute('data-valid', 'true');
    await expect(reqUpper).toHaveAttribute('data-valid', 'false');
    await expect(reqNumber).toHaveAttribute('data-valid', 'false');
    await expect(reqSpecial).toHaveAttribute('data-valid', 'false');
    await expect(reqMinLength).toHaveAttribute('data-valid', 'false');

    // Strength container now visible and displays Weak
    const strengthLabel = page.locator('[data-testid="password-strength-label"]');
    await expect(strengthLabel).toBeVisible();
    await expect(strengthLabel).toHaveText(/Weak/i);

    // 3. Add uppercase ("abcABC")
    await passwordInput.fill('abcABC');
    await expect(reqUpper).toHaveAttribute('data-valid', 'true');
    await expect(reqLower).toHaveAttribute('data-valid', 'true');

    // 4. Add number ("abcABC12") -> length reaches 8
    await passwordInput.fill('abcABC12');
    await expect(reqNumber).toHaveAttribute('data-valid', 'true');
    await expect(reqMinLength).toHaveAttribute('data-valid', 'true');
    await expect(reqSpecial).toHaveAttribute('data-valid', 'false');
    await expect(strengthLabel).toHaveText(/Fair/i);

    // 5. Add special character ("abcABC12!@#") -> all 5 satisfied, Strong rating
    await passwordInput.fill('abcABC12!@#');
    await expect(reqSpecial).toHaveAttribute('data-valid', 'true');
    await expect(reqMinLength).toHaveAttribute('data-valid', 'true');
    await expect(reqUpper).toHaveAttribute('data-valid', 'true');
    await expect(reqLower).toHaveAttribute('data-valid', 'true');
    await expect(reqNumber).toHaveAttribute('data-valid', 'true');
    await expect(strengthLabel).toHaveText(/Strong/i);

    // 6. Test character deletion: delete until no special character
    await passwordInput.fill('abcABC12');
    await expect(reqSpecial).toHaveAttribute('data-valid', 'false');

    // Restore strong password
    await passwordInput.fill('BreatheWise2026!#');
    await expect(reqSpecial).toHaveAttribute('data-valid', 'true');

    // 7. Test Confirm Password mismatch
    await confirmInput.fill('DifferentPass123!');
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
    await expect(page.locator('[data-testid="password-match-indicator"]')).not.toBeVisible();

    // 8. Test Confirm Password match
    await confirmInput.fill('BreatheWise2026!#');
    await expect(page.locator('[data-testid="password-match-indicator"]')).toBeVisible();
    await expect(page.locator('text=Passwords do not match')).not.toBeVisible();

    // 9. Fill valid email and name, then submit
    const uniqueEmail = `pw_e2e_${Date.now()}@breathewise.test`;
    await page.fill('input#register-name', 'Strong Password Family');
    await page.fill('input#register-email', uniqueEmail);

    await page.click('button:has-text("Create Account & Continue")');

    // 10. Verify redirect to /dashboard
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    await expect(page.locator('h1')).toContainText(/Welcome/i);
  });
});
