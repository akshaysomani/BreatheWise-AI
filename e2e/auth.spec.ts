import { test, expect } from '@playwright/test';

/**
 * BreatheWise AI — End-to-End Browser Authentication & Dashboard Verification (M3.1)
 * 
 * Tests the real user journey across full browser execution contexts:
 * 1. User Registration with client and server validation
 * 2. Automatic session cookie establishment & dashboard redirection
 * 3. Session persistence through page refresh
 * 4. Account menu navigation and secure logout
 * 5. Middleware route protection & redirect preservation
 * 6. Credential re-authentication & invalid credential error alerts
 * 7. Duplicate email conflict handling (HTTP 409)
 * 8. Responsive viewport verification (360px, 390px mobile, 1440px desktop)
 */

test.describe('BreatheWise AI Authentication & Dashboard Browser Flows', () => {
  const timestamp = Date.now();
  const testUser = {
    name: 'Browser Verification User',
    email: `browser_e2e_${timestamp}@breathewise.test`,
    password: 'SecurePassword123!',
  };

  test('Flows 1-10: Registration, Dashboard Access, Session Persistence, Logout, and Middleware Protection', async ({ page }) => {
    // 1. Open registration page
    await page.goto('/register');
    await expect(page).toHaveTitle(/Register|BreatheWise/i);
    await expect(page.locator('h1')).toContainText(/Create your account/i);

    // 2. Fill registration form
    await page.fill('input#name', testUser.name);
    await page.fill('input#email', testUser.email);
    await page.fill('input#password', testUser.password);
    await page.fill('input#confirmPassword', testUser.password);

    // 3. Submit registration form
    await page.click('button[type="submit"]');

    // 4. Verify successful redirection to /dashboard
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    await expect(page.locator('h1')).toContainText(/Welcome/i);
    await expect(page.locator('text=Personal Dashboard')).toBeVisible();

    // 5. Refresh dashboard and verify session persistence
    await page.reload();
    await expect(page.locator('h1')).toContainText(/Welcome/i);
    await expect(page.locator(`text=${testUser.name}`)).toBeVisible();

    // 6. Verify cookie exists in browser
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === 'breathewise_session');
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);

    // 7. Open account tab and click Sign Out
    const accountTab = page.locator('button:has-text("Account & Privacy")');
    if (await accountTab.isVisible()) {
      await accountTab.click();
    }
    const signOutBtn = page.locator('button:has-text("Sign Out")').first();
    await signOutBtn.click();

    // 8. Verify redirection away from dashboard
    await page.waitForURL('**/login', { timeout: 10_000 });

    // 9. Attempt to directly revisit /dashboard without valid session
    await page.goto('/dashboard');

    // 10. Verify Next.js middleware redirects to /login?returnUrl=%2Fdashboard
    await page.waitForURL(/.*\/login.*returnUrl=.*/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('Flows 11-13: Invalid Credential Feedback and Re-login', async ({ page }) => {
    await page.goto('/login');

    // 11. Submit invalid credentials
    await page.fill('input#email', testUser.email);
    await page.fill('input#password', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // 12. Verify accessible error feedback alert
    const errorAlert = page.locator('[role="alert"]').first();
    await expect(errorAlert).toBeVisible({ timeout: 5_000 });
    await expect(errorAlert).toContainText(/Invalid email or password/i);

    // 13. Re-login with valid credentials
    await page.fill('input#password', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    await expect(page.locator('h1')).toContainText(/Welcome/i);
  });

  test('Flow 14: Duplicate Registration Conflict Handling', async ({ page }) => {
    await page.goto('/register');

    // Attempt to register with the same email
    await page.fill('input#name', 'Duplicate Tester');
    await page.fill('input#email', testUser.email);
    await page.fill('input#password', 'SomePassword123!');
    await page.fill('input#confirmPassword', 'SomePassword123!');
    await page.click('button[type="submit"]');

    // Verify 409 Conflict error feedback alert
    const alert = page.locator('[role="alert"]').first();
    await expect(alert).toBeVisible({ timeout: 5_000 });
    await expect(alert).toContainText(/already exists/i);
  });

  test('Flow 15: Mobile Viewports (360px and 390px)', async ({ page }) => {
    // 360px viewport (Small Android)
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/login');
    await expect(page.locator('h1')).toBeVisible();
    // Check no horizontal scrollbar / overflow
    const scrollWidth360 = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth360).toBeLessThanOrEqual(360);

    // 390px viewport (iPhone 12/13/14)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const scrollWidth390 = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth390).toBeLessThanOrEqual(390);
  });

  test('Flow 16: Desktop Viewport (1440px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await expect(page.locator('h1')).toBeVisible();

    // Verify header and layout containment
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
    const container = page.locator('main').first();
    await expect(container).toBeVisible();
  });
});
