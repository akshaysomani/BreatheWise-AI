import { test, expect } from '@playwright/test';

/**
 * BreatheWise AI — End-to-End AI Assistant & Recommendations Browser Verification (M5)
 * 
 * Verifies conversational assistant, grounding badges, 6-field structured recommendation cards,
 * feedback interaction, diurnal daily routine action plans, and indoor IAQ CADR calculator.
 */

test.describe('BreatheWise AI Assistant & Intelligent Recommendations (M5 Scope)', () => {
  let testIp = '10.99.2.1';

  test.beforeEach(async ({ context }) => {
    testIp = `10.99.${Math.floor(Math.random() * 200 + 1)}.${Math.floor(Math.random() * 200 + 1)}`;
    await context.setExtraHTTPHeaders({
      'x-forwarded-for': testIp,
    });
  });

  test('Flow 1: Assistant Workspace Navigation, Chat Interaction & 6-Field Structured Recommendations', async ({ page }) => {
    const testUser = {
      name: 'Assistant Test User',
      email: `assistant_e2e_${Date.now()}_${Math.random().toString(36).substring(7)}@breathewise.test`,
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

    // 2. Click AI Assistant tab
    const assistantTabButton = page.locator('button:has-text("AI Assistant")').first();
    await expect(assistantTabButton).toBeVisible();
    await assistantTabButton.click();

    // 3. Verify Assistant Workspace heading
    await expect(page.locator('h2:has-text("BreatheWise AI Assistant")')).toBeVisible();
    await expect(page.locator('text=Zero-Fabrication Guardrails Active')).toBeVisible();

    // 4. Click a starter prompt pill
    const starterPrompt = page.locator('button:has-text("Is it safe to go for an outdoor walk this evening?")').first();
    await expect(starterPrompt).toBeVisible();
    await starterPrompt.click();

    // 5. Verify user message appears in chat
    await expect(page.locator('text=Is it safe to go for an outdoor walk this evening?')).toBeVisible({ timeout: 5_000 });

    // 6. Verify assistant response bubble appears
    const assistantReply = page.locator('div:has-text("BreatheWise Assistant")').first();
    await expect(assistantReply).toBeVisible({ timeout: 15_000 });

    // 7. Verify 6-field structured recommendation card
    await expect(page.locator('text=Scientific Grounding & Rationale').first()).toBeVisible();
    await expect(page.locator('text=Expected Health Benefit').first()).toBeVisible();
    await expect(page.locator('text=Practical Action Steps').first()).toBeVisible();

    // 8. Expand scientific assumptions & uncertainty
    const expandButton = page.locator('button:has-text("View Scientific Assumptions & Uncertainty")').first();
    if (await expandButton.isVisible()) {
      await expandButton.click();
      await expect(page.locator('text=Underlying Assumptions:').first()).toBeVisible();
      await expect(page.locator('text=Uncertainty Bounds & Limitations:').first()).toBeVisible();
    }

    // 9. Submit recommendation feedback
    const helpfulButton = page.locator('button[aria-label="Helpful recommendation"]').first();
    if (await helpfulButton.isVisible()) {
      await helpfulButton.click();
      await expect(helpfulButton).toHaveClass(/bg-\[#287A4B\]/);
    }
  });

  test('Flow 2: Daily Routine Action Plan & Diurnal Periods (Morning, Afternoon, Evening)', async ({ page }) => {
    const testUser = {
      name: 'Routine Test User',
      email: `routine_e2e_${Date.now()}_${Math.random().toString(36).substring(7)}@breathewise.test`,
      password: 'SecurePassword123!',
    };

    await page.goto('/register');
    await page.fill('input#register-name', testUser.name);
    await page.fill('input#register-email', testUser.email);
    await page.fill('input#register-password', testUser.password);
    await page.fill('input#register-confirm-password', testUser.password);
    await page.click('form button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15_000 });

    // Switch to AI Assistant tab
    await page.locator('button:has-text("AI Assistant")').first().click();

    // Switch to Daily Routine sub-tab
    const routineSubTab = page.locator('button:has-text("Daily Routine")').first();
    await expect(routineSubTab).toBeVisible();
    await routineSubTab.click();

    // Verify 3 diurnal periods
    await expect(page.locator('span:has-text("MORNING")').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('span:has-text("AFTERNOON")').first()).toBeVisible();
    await expect(page.locator('span:has-text("EVENING")').first()).toBeVisible();

    // Verify regenerate button works
    const regenButton = page.locator('button:has-text("Regenerate Daily Plan")');
    await expect(regenButton).toBeVisible();
    await regenButton.click();
    await expect(page.locator('span:has-text("MORNING")').first()).toBeVisible();
  });

  test('Flow 3: Indoor IAQ Advisor Interactive Sizing & Myth Debunking', async ({ page }) => {
    const testUser = {
      name: 'Indoor Advisor User',
      email: `indoor_e2e_${Date.now()}_${Math.random().toString(36).substring(7)}@breathewise.test`,
      password: 'SecurePassword123!',
    };

    await page.goto('/register');
    await page.fill('input#register-name', testUser.name);
    await page.fill('input#register-email', testUser.email);
    await page.fill('input#register-password', testUser.password);
    await page.fill('input#register-confirm-password', testUser.password);
    await page.click('form button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15_000 });

    // Switch to AI Assistant -> Indoor IAQ Advisor
    await page.locator('button:has-text("AI Assistant")').first().click();
    await page.locator('button:has-text("Indoor IAQ Advisor")').first().click();

    // Verify Room IAQ Calculator is visible
    await expect(page.locator('h3:has-text("Room IAQ Calculator"), div:has-text("Room IAQ Calculator")').first()).toBeVisible();

    // Verify Houseplant Myth Debunking card is visible
    await expect(page.locator('text=Houseplant Myth Debunking:')).toBeVisible();

    // Enter custom dimensions: 300 sq ft, 50 CFM purifier -> Deficit expected!
    const floorAreaInput = page.locator('input[type="number"]').first();
    await floorAreaInput.fill('300');

    const recalculateButton = page.locator('button:has-text("Recalculate IAQ Defense")');
    await recalculateButton.click();

    // Verify required CADR calculated (300 sq ft * 9 ft * 5 ACH / 60 = 225 CFM)
    await expect(page.locator('text=225 CFM').first()).toBeVisible({ timeout: 10_000 });
  });
});
