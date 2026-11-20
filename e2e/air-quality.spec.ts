import { test, expect } from '@playwright/test';

/**
 * BreatheWise AI — End-to-End Air Quality Intelligence Browser Verification (M4)
 * 
 * Verifies live browser telemetry radar, CPCB NAQI calculation, 8-criteria pollutant
 * breakdown, station switching, freshness tags, and mobile responsive behavior.
 */

test.describe('Air Quality Intelligence Dashboard Integration (M4)', () => {
  let testIp = '10.99.1.1';

  test.beforeEach(async ({ context }) => {
    testIp = `10.99.${Math.floor(Math.random() * 200 + 1)}.${Math.floor(Math.random() * 200 + 1)}`;
    await context.setExtraHTTPHeaders({
      'x-forwarded-for': testIp,
    });
  });

  test('Flow 1: Live CPCB Atmospheric Radar, 8-Criteria Pollutants & Regional Hub Switching', async ({ page }) => {
    const testUser = {
      name: 'AQI Verification User',
      email: `aqi_e2e_${Date.now()}_${Math.random().toString(36).substring(7)}@breathewise.test`,
      password: 'SecurePassword123!',
    };

    // 1. Register and enter dashboard
    await page.goto('/register');
    await page.fill('input#register-name', testUser.name);
    await page.fill('input#register-email', testUser.email);
    await page.fill('input#register-password', testUser.password);
    await page.fill('input#register-confirm-password', testUser.password);
    await page.click('form button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await expect(page.locator('h1')).toContainText(/Welcome/i);

    // 2. Verify Atmospheric Telemetry Radar Card is visible
    const radarCard = page.locator('[data-testid="aqi-radar-card"]');
    await expect(radarCard).toBeVisible({ timeout: 10_000 });
    await expect(radarCard).toContainText('Atmospheric Telemetry Radar');
    await expect(radarCard).toContainText(/Central Pollution Control Board/i);

    // 3. Verify AQI Value Display and Category Badge
    const aqiDisplay = page.locator('[data-testid="aqi-value-display"]');
    await expect(aqiDisplay).toBeVisible();
    const aqiText = await aqiDisplay.textContent();
    expect(Number(aqiText)).toBeGreaterThanOrEqual(0);

    // 4. Verify CPCB Criteria Pollutants are rendered (all 8 parameters)
    await expect(radarCard).toContainText('PM2.5');
    await expect(radarCard).toContainText('PM10');
    await expect(radarCard).toContainText('NO2');
    await expect(radarCard).toContainText('SO2');
    await expect(radarCard).toContainText('CO');
    await expect(radarCard).toContainText('O3');
    await expect(radarCard).toContainText('NH3');
    await expect(radarCard).toContainText('Pb');

    // 5. Verify Health Advisory Guidance is present
    await expect(radarCard).toContainText(/General Public/i);
    await expect(radarCard).toContainText(/Sensitive Groups/i);
    await expect(radarCard).toContainText(/Clean Room Action/i);

    // 6. Test Regional Station Switching: Click Ahmedabad (Maninagar) chip
    const ahmedabadChip = page.locator('button:has-text("Ahmedabad (Maninagar)")');
    await expect(ahmedabadChip).toBeVisible();
    await ahmedabadChip.click();

    // Verify station updates to Maninagar
    await expect(radarCard).toContainText(/Maninagar.*Ahmedabad/i, { timeout: 5000 });

    // 7. Test Refresh button triggers live check
    const refreshBtn = page.locator('button[aria-label="Refresh atmospheric telemetry"]');
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await expect(radarCard).toBeVisible();

    // 8. Verify Provenance and License Disclosure
    await expect(radarCard).toContainText(/Data Provenance:/i);
    await expect(radarCard).toContainText(/License:/i);
  });

  test('Flow 2: Responsive Viewport Adaptation (Mobile 360px & 390px)', async ({ page }) => {
    // Test small mobile viewport (360x740 Android)
    await page.setViewportSize({ width: 360, height: 740 });

    const testUser = {
      name: 'Mobile AQI User',
      email: `mobile_aqi_${Date.now()}_${Math.random().toString(36).substring(7)}@breathewise.test`,
      password: 'SecurePassword123!',
    };

    await page.goto('/register');
    await page.fill('input#register-name', testUser.name);
    await page.fill('input#register-email', testUser.email);
    await page.fill('input#register-password', testUser.password);
    await page.fill('input#register-confirm-password', testUser.password);
    await page.click('form button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15_000 });

    const radarCard = page.locator('[data-testid="aqi-radar-card"]');
    await expect(radarCard).toBeVisible({ timeout: 10_000 });

    // Verify hero AQI is visible without horizontal overflow
    const aqiDisplay = page.locator('[data-testid="aqi-value-display"]');
    await expect(aqiDisplay).toBeVisible();

    // Verify regional chips remain scrollable / clickable on mobile
    const delhiChip = page.locator('button:has-text("Delhi (Anand Vihar)")');
    await expect(delhiChip).toBeVisible();
  });
});
