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
  let testIp = '10.99.1.1';

  test.beforeEach(async ({ context }) => {
    testIp = `10.99.${Math.floor(Math.random() * 200 + 1)}.${Math.floor(Math.random() * 200 + 1)}`;
    await context.setExtraHTTPHeaders({
      'x-forwarded-for': testIp,
    });
  });

  test('Flows 1-10: Registration, Dashboard Access, Session Persistence, Logout, and Middleware Protection', async ({ page }) => {
    const testUser = {
      name: 'Browser Verification User',
      email: `browser_e2e_${Date.now()}_${Math.random().toString(36).substring(7)}@breathewise.test`,
      password: 'SecurePassword123!',
    };

    // 1. Open registration page
    await page.goto('/register');
    await expect(page).toHaveTitle(/Register|BreatheWise/i);
    await expect(page.locator('h1')).toContainText(/Create.*Account/i);

    // 2. Fill registration form
    await page.fill('input#register-name', testUser.name);
    await page.fill('input#register-email', testUser.email);
    await page.fill('input#register-password', testUser.password);
    await page.fill('input#register-confirm-password', testUser.password);

    // 3. Submit registration form
    await page.click('form button[type="submit"]');

    // 4. Verify successful redirection to /dashboard
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    await expect(page.locator('h1')).toContainText(/Welcome/i);

    // 5. Refresh dashboard and verify session persistence
    await page.reload();
    await expect(page.locator('h1')).toContainText(/Welcome/i);
    await expect(page.locator('h1')).toContainText(testUser.name);

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
    const signOutBtn = page.locator('main button:has-text("Sign Out")').first();
    await signOutBtn.click();

    // 8. Verify redirection away from dashboard to home page
    await page.waitForURL('http://127.0.0.1:3000/', { timeout: 10_000 });

    // 9. Attempt to directly revisit /dashboard without valid session
    await page.goto('/dashboard');

    // 10. Verify Next.js middleware redirects to /login?returnUrl=%2Fdashboard
    await page.waitForURL(/.*\/login.*returnUrl=.*/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('Flows 11-13: Invalid Credential Feedback and Re-login', async ({ page, request }) => {
    const loginUser = {
      name: 'Login Test User',
      email: `login_test_${Date.now()}_${Math.random().toString(36).substring(7)}@breathewise.test`,
      password: 'SecurePassword123!',
    };

    // Pre-register user via API endpoint
    const regRes = await request.post('/api/auth/register', {
      headers: {
        'x-forwarded-for': testIp,
      },
      data: {
        name: loginUser.name,
        email: loginUser.email,
        password: loginUser.password,
      },
    });
    expect(regRes.status()).toBe(201);

    await page.goto('/login');

    // 11. Submit invalid credentials
    await page.fill('input#login-email', loginUser.email);
    await page.fill('input#login-password', 'WrongPassword123!');
    await page.click('form button[type="submit"]');

    // 12. Verify accessible error feedback alert
    const errorAlert = page.locator('form [role="alert"]').first();
    await expect(errorAlert).toBeVisible({ timeout: 5_000 });
    await expect(errorAlert).toContainText(/Invalid email or password/i);

    // 13. Re-login with valid credentials
    await page.fill('input#login-password', loginUser.password);
    await page.click('form button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    await expect(page.locator('h1')).toContainText(/Welcome/i);
  });

  test('Flow 14: Duplicate Registration Conflict Handling', async ({ page, request }) => {
    const duplicateUser = {
      name: 'Existing Account User',
      email: `dup_test_${Date.now()}_${Math.random().toString(36).substring(7)}@breathewise.test`,
      password: 'SecurePassword123!',
    };

    // Pre-register user via API endpoint
    const regRes = await request.post('/api/auth/register', {
      headers: {
        'x-forwarded-for': testIp,
      },
      data: {
        name: duplicateUser.name,
        email: duplicateUser.email,
        password: duplicateUser.password,
      },
    });
    expect(regRes.status()).toBe(201);

    await page.goto('/register');

    // Attempt to register with the same email
    await page.fill('input#register-name', 'Another User');
    await page.fill('input#register-email', duplicateUser.email);
    await page.fill('input#register-password', 'SomePassword123!');
    await page.fill('input#register-confirm-password', 'SomePassword123!');
    await page.click('form button[type="submit"]');

    // Verify 409 Conflict error feedback alert
    const alert = page.locator('form [role="alert"]').first();
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
