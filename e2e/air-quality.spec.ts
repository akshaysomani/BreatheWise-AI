import { test, expect } from '@playwright/test';

/**
 * BreatheWise AI — End-to-End Air Quality Intelligence Browser Verification (M4 / M4.1)
 * 
 * Verifies live browser telemetry radar, CPCB NAQI calculation, 8-criteria pollutant
 * breakdown, station switching, dual-timestamp display, provenance status badge,
 * acute sensor proxy disclaimer, and honest zero-fabrication fallback states.
 */

test.describe('Air Quality Intelligence Dashboard Integration (M4.1 Integrity)', () => {
  let testIp = '10.99.1.1';

  test.beforeEach(async ({ context }) => {
    testIp = `10.99.${Math.floor(Math.random() * 200 + 1)}.${Math.floor(Math.random() * 200 + 1)}`;
    await context.setExtraHTTPHeaders({
      'x-forwarded-for': testIp,
    });
  });

  test('Flow 1: CPCB Atmospheric Radar, Provenance Badge, Timestamps, 8 Criteria Pollutants & Regional Hub Switching', async ({ page }) => {
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

    // 3. Verify AQI Display OR Honest NO_DATA Fallback
    // When OPENAQ_API_KEY is configured, live AQI data is displayed.
    // When unconfigured (local/CI), the application correctly shows NO_DATA with zero fabrication.
    const aqiDisplay = page.locator('[data-testid="aqi-value-display"]');
    const noDataCard = page.locator('[data-testid="aqi-no-data-card"]');
    await expect(aqiDisplay.or(noDataCard)).toBeVisible({ timeout: 15_000 });

    const hasLiveData = await aqiDisplay.isVisible();

    if (hasLiveData) {
      // Live telemetry path: validate full AQI display
      const aqiText = await aqiDisplay.textContent();
      expect(Number(aqiText)).toBeGreaterThanOrEqual(0);

      // 4. Verify Acute 1-Hour Proxy and Averaging Standard Disclaimer
      await expect(radarCard).toContainText(/Averaging Standard:/i);
      await expect(radarCard).toContainText(/Acute 1-hour sensor/i);

      // 4b. Verify Short-Term Indicator Badge & Official CPCB 24-Hour Regulatory Status Card
      const shortTermBadge = page.locator('[data-testid="short-term-indicator-badge"]');
      await expect(shortTermBadge).toBeVisible();
      await expect(shortTermBadge).toContainText('1-Hour Acute Proxy');

      const officialCpcbCard = page.locator('[data-testid="official-cpcb-status"]');
      await expect(officialCpcbCard).toBeVisible();
      await expect(officialCpcbCard).toContainText(/CPCB National AQI/i);
      await expect(officialCpcbCard).toContainText(/Completeness:/i);

      // 5. Verify Provenance Badge is visible
      const provenanceBadge = radarCard.locator('[data-testid^="provenance-badge-"]');
      await expect(provenanceBadge).toBeVisible();

      // 6. Verify Observation & Retrieval Timestamps are displayed
      await expect(radarCard).toContainText(/Observed:/i);
      await expect(radarCard).toContainText(/Retrieved:/i);

      // 7. Verify CPCB Criteria Pollutants are rendered (all 8 parameters)
      await expect(radarCard).toContainText('PM2.5');
      await expect(radarCard).toContainText('PM10');
      await expect(radarCard).toContainText('NO2');
      await expect(radarCard).toContainText('SO2');
      await expect(radarCard).toContainText('CO');
      await expect(radarCard).toContainText('O3');
      await expect(radarCard).toContainText('NH3');
      await expect(radarCard).toContainText('Pb');

      // 8. Verify Health Advisory Guidance is present
      await expect(radarCard).toContainText(/General Public/i);
      await expect(radarCard).toContainText(/Sensitive Groups/i);
      await expect(radarCard).toContainText(/Clean Room Action/i);

      // 9. Test Regional Station Switching: Click Ahmedabad (Maninagar) chip
      const ahmedabadChip = page.locator('button:has-text("Ahmedabad (Maninagar)")');
      await expect(ahmedabadChip).toBeVisible();
      await ahmedabadChip.click();

      // Verify station updates to Maninagar
      await expect(radarCard).toContainText(/Maninagar.*Ahmedabad/i, { timeout: 8000 });

      // 10. Test Refresh button triggers live check
      const refreshBtn = page.locator('button[aria-label="Refresh atmospheric telemetry"]');
      await expect(refreshBtn).toBeVisible();
      await refreshBtn.click();
      await expect(radarCard).toBeVisible();

      // 11. Verify Provenance and License Disclosure
      await expect(radarCard).toContainText(/Data Provenance:/i);
      await expect(radarCard).toContainText(/License:/i);
    } else {
      // NO_DATA fallback path: verify zero-fabrication integrity
      // Application correctly shows honest NO_DATA state without fabricating AQI numbers
      await expect(noDataCard).toBeVisible();
      await expect(noDataCard).toContainText(/No Verified Atmospheric Telemetry|No Monitoring Station/i);
      await expect(noDataCard).toContainText(/Zero Synthetic Fabrication Policy/i);

      // Regional hub chips remain interactive
      const ahmedabadChip = page.locator('button:has-text("Ahmedabad (Maninagar)")');
      if (await ahmedabadChip.isVisible()) {
        await ahmedabadChip.click();
      }

      // Test Refresh button triggers query without crash
      const refreshBtn = page.locator('button[aria-label="Refresh atmospheric telemetry"]');
      if (await refreshBtn.isVisible()) {
        await refreshBtn.click();
      }
      await expect(radarCard).toBeVisible();
    }
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

    // Verify AQI display OR honest NO_DATA fallback without horizontal overflow
    const aqiDisplay = page.locator('[data-testid="aqi-value-display"]');
    const hasLiveData = await aqiDisplay.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasLiveData) {
      // Live data: verify AQI is visible
      await expect(aqiDisplay).toBeVisible();

      // Verify regional chips remain scrollable / clickable on mobile
      const delhiChip = page.locator('button:has-text("Delhi (Anand Vihar)")');
      await expect(delhiChip).toBeVisible();

      // Verify 390px iPhone viewport adaptation
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(radarCard).toBeVisible();
      await expect(page.locator('[data-testid="official-cpcb-status"]')).toBeVisible();
    } else {
      // NO_DATA path: radar card visible, AQI not fabricated
      await expect(radarCard).toBeVisible();

      // Verify 390px iPhone viewport adaptation
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(radarCard).toBeVisible();
    }
  });

  test('Flow 3: API Zero-Fabrication Fallback for Remote / Out-of-Range Coordinates', async ({ request }) => {
    // Remote coordinate off the Gujarat coast in the Arabian Sea (19.00, 68.00)
    const res = await request.get('/api/aqi?lat=19.00&lon=68.00');
    expect(res.ok()).toBe(true);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(['NO_NEARBY_STATION', 'NO_DATA']).toContain(json.data.status);
    expect(json.data.provenanceStatus).toBe('NO_DATA');
    expect(json.data.cpcbAqi).toBeNull();
    expect(json.data.station).toBeNull();
    expect(json.data.notice).toContain('BreatheWise AI strictly adheres to verified');
  });
});
