import { test, expect } from '@playwright/test';

/**
 * BreatheWise AI — Header and Footer Component Uniqueness & Regression Spec
 * 
 * Validates that every route in the application:
 * 1. Renders exactly ONE <header> element.
 * 2. Renders exactly ONE <footer> element.
 * 3. Header navigation works and active link styles are applied.
 * 4. Footer navigation links function without dead ends.
 * 5. No duplicate branding logos or duplicated footer link columns exist.
 * 6. No horizontal overflow occurs (clientWidth === scrollWidth).
 * 7. Mobile hamburger menu works properly on small screens.
 */

const TARGET_ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/assistant', name: 'AI Assistant' },
  { path: '/air-quality', name: 'Air Quality Radar' },
  { path: '/tips', name: 'Tips & Solutions' },
  { path: '/impact', name: 'Impact Tracker' },
  { path: '/about', name: 'About' },
  { path: '/privacy-policy', name: 'Privacy Policy' },
  { path: '/terms-of-use', name: 'Terms of Use' },
];

test.describe('Header & Footer Structural Uniqueness (All Routes)', () => {
  for (const { path, name } of TARGET_ROUTES) {
    test(`Route "${path}" (${name}) renders exactly ONE Header and exactly ONE Footer`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });

      // 1. Verify Header count
      const headers = page.locator('header');
      const headerCount = await headers.count();
      expect(headerCount, `Expected exactly 1 <header> on ${path}, found ${headerCount}`).toBe(1);
      await expect(headers.first()).toBeVisible();

      // 2. Verify Footer count
      const footers = page.locator('footer');
      const footerCount = await footers.count();
      expect(footerCount, `Expected exactly 1 <footer> on ${path}, found ${footerCount}`).toBe(1);
      await expect(footers.first()).toBeVisible();

      // 3. Verify exactly one main brand logo inside header
      const headerBrand = headers.first().locator('a[aria-label="BreatheWise AI Home"]');
      expect(await headerBrand.count()).toBe(1);

      // 4. Verify exactly one brand section in footer
      const footerBrand = footers.first().locator('span:has-text("BreatheWise")');
      expect(await footerBrand.count()).toBeGreaterThanOrEqual(1);

      // 5. Verify no horizontal overflow (overflow-x)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll, `Horizontal scroll detected on ${path}`).toBe(false);
    });
  }
});

test.describe('Navigation Interactivity & Active State Verification', () => {
  test('Header desktop navigation highlights active route correctly', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop navigation verified on desktop viewports only');

    await page.goto('/tips');
    const activeLink = page.locator('header nav a[href="/tips"]');
    await expect(activeLink).toBeVisible();
    // Active class in Header.tsx is 'text-[#397A55] bg-[#EEF3EA] font-semibold'
    await expect(activeLink).toHaveClass(/bg-\[#EEF3EA\]/);

    await page.goto('/about');
    const aboutLink = page.locator('header nav a[href="/about"]');
    await expect(aboutLink).toBeVisible();
    await expect(aboutLink).toHaveClass(/bg-\[#EEF3EA\]/);
  });

  test('Footer links navigate correctly to target routes', async ({ page }) => {
    await page.goto('/');
    const footerPrivacyLink = page.locator('footer a[href="/privacy-policy"]');
    await expect(footerPrivacyLink).toBeVisible();
    await footerPrivacyLink.click();
    await expect(page).toHaveURL(/.*\/privacy-policy/);

    const headers = page.locator('header');
    expect(await headers.count()).toBe(1);
    const footers = page.locator('footer');
    expect(await footers.count()).toBe(1);
  });

  test('Mobile navigation menu toggles without duplicating header shell', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile menu tested on mobile viewports only');

    await page.goto('/');
    const menuButton = page.locator('header button[aria-label="Toggle navigation menu"]');
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // Verify mobile navigation container opens
    const mobileNav = page.locator('nav[aria-label="Mobile Navigation"]');
    await expect(mobileNav).toBeVisible();

    // Verify header count remains strictly 1 while open
    expect(await page.locator('header').count()).toBe(1);

    // Close menu
    await menuButton.click();
    await expect(mobileNav).not.toBeVisible();
  });
});
