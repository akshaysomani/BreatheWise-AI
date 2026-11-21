import { test, expect } from '@playwright/test';

/**
 * BreatheWise AI — Registration Page Width & Layout Verification Spec
 * 
 * Verifies responsive 2-column composition and zero horizontal overflow across:
 * - 1440 × 900 (Desktop large)
 * - 1366 × 768 (Desktop standard)
 * - 1024 × 768 (Tablet landscape)
 * - 768 × 1024 (Tablet portrait)
 * - 390 × 844 (Mobile standard)
 * - 360 × 640 (Mobile small)
 */

const TARGET_VIEWPORTS = [
  { name: '1440x900 Desktop Large', width: 1440, height: 900, isDesktop: true },
  { name: '1366x768 Desktop Standard', width: 1366, height: 768, isDesktop: true },
  { name: '1024x768 Tablet Landscape', width: 1024, height: 768, isDesktop: false },
  { name: '768x1024 Tablet Portrait', width: 768, height: 1024, isDesktop: false },
  { name: '390x844 Mobile Standard', width: 390, height: 844, isDesktop: false },
  { name: '360x640 Mobile Small', width: 360, height: 640, isDesktop: false },
];

test.describe('Registration Page Layout & Multi-Viewport Responsiveness', () => {
  let testIp = '10.99.1.1';

  test.beforeEach(async ({ context }) => {
    testIp = `10.99.${Math.floor(Math.random() * 200 + 1)}.${Math.floor(Math.random() * 200 + 1)}`;
    await context.setExtraHTTPHeaders({
      'x-forwarded-for': testIp,
    });
  });

  for (const vp of TARGET_VIEWPORTS) {
    test(`renders correctly at ${vp.name} without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/register');

      // 1. Unique Header and Footer
      await expect(page.locator('header')).toHaveCount(1);
      await expect(page.locator('footer')).toHaveCount(1);

      // 2. Both sections present
      const introHeading = page.locator('h2:has-text("Create a Healthier Home, Together.")');
      const formHeading = page.locator('h1:has-text("Create Household Account")');

      await expect(introHeading).toBeVisible();
      await expect(formHeading).toBeVisible();

      // 3. Form fields and password checklist elements visible
      await expect(page.locator('input#register-name')).toBeVisible();
      await expect(page.locator('input#register-email')).toBeVisible();
      const passwordInput = page.locator('input#register-password');
      const confirmInput = page.locator('input#register-confirm-password');
      await expect(passwordInput).toBeVisible();
      await expect(confirmInput).toBeVisible();

      // 4. Checklist items visible
      await expect(page.locator('[data-testid="req-min-length"]')).toBeVisible();
      await expect(page.locator('[data-testid="req-uppercase"]')).toBeVisible();

      // 5. Submit button and Form Sign In link visible (specifically scoped to form)
      const submitBtn = page.locator('button:has-text("Create Account & Continue")');
      await expect(submitBtn).toBeVisible();
      await expect(page.locator('form').getByRole('link', { name: 'Sign In' })).toBeVisible();

      // 6. Verify zero horizontal page overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // 7. Geometry check: Form card width & layout composition
      const formCard = page.locator('form').first();
      const formBox = await formCard.boundingBox();
      expect(formBox).not.toBeNull();

      if (vp.isDesktop) {
        expect(formBox!.width).toBeGreaterThanOrEqual(500);
        // Verify 2-column side-by-side positioning
        const introBox = await introHeading.boundingBox();
        expect(introBox).not.toBeNull();
        expect(formBox!.x).toBeGreaterThan(introBox!.x);
      } else {
        // Mobile / Tablet: form fills available width cleanly without exceeding viewport
        expect(formBox!.width).toBeLessThanOrEqual(vp.width);
      }
    });
  }

  test('completes interactive typing and registration submission on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/register');

    const emailInput = page.locator('input#register-email');
    const passwordInput = page.locator('input#register-password');
    const confirmInput = page.locator('input#register-confirm-password');

    // Fill valid data
    const testEmail = `layout_e2e_${Date.now()}@breathewise.test`;
    await page.fill('input#register-name', 'Spacious Layout Family');
    await emailInput.fill(testEmail);
    await passwordInput.fill('CleanAirHome2026!#');
    await confirmInput.fill('CleanAirHome2026!#');

    await expect(page.locator('[data-testid="password-match-indicator"]')).toBeVisible();

    // Submit
    await page.click('button:has-text("Create Account & Continue")');

    // Redirect to /dashboard
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    await expect(page.locator('h1')).toContainText(/Welcome/i);
  });
});
