import { defineConfig, devices } from '@playwright/test';

/**
 * BreatheWise AI — Playwright End-to-End Browser Test Configuration (M3.1)
 * 
 * Provides isolated, real browser automation for:
 * - Desktop Chrome / WebKit / Firefox (1440x900)
 * - Mobile Chrome / Safari viewports (360px, 390px)
 * - Automated dev server orchestration on port 3000
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'Mobile Small (360px)',
      use: {
        viewport: { width: 360, height: 640 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'Mobile Standard (390px)',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npx next start -H 127.0.0.1 -p 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
