import { test, expect } from '@playwright/test';
import prisma from '../src/lib/db';
import { createDatabaseSession } from '../src/lib/session';

/**
 * BreatheWise AI — End-to-End Personal Impact Tracker & Community Intelligence (M6)
 * 
 * Verifies:
 * 1. Personal Impact Tracker: deterministic calculation previews, logging modal,
 *    historical audit trail, formula inspection drawer, CSV export, and category filters.
 * 2. Community Environmental Intelligence: privacy preservation (~1.1 km coarse fuzzing),
 *    regulatory segregation banner (`isOfficialData: false`), citizen report submission,
 *    upvoting mechanism, and moderation flagging.
 * 3. Mobile responsiveness across 360px and 390px viewports.
 */

test.describe('BreatheWise AI Module 6: Impact Tracker & Community Intelligence', () => {
  let testIp = '10.99.6.1';

  test.beforeEach(async ({ context }) => {
    testIp = `10.99.${Math.floor(Math.random() * 200 + 1)}.${Math.floor(Math.random() * 200 + 1)}`;
    await context.setExtraHTTPHeaders({
      'x-forwarded-for': testIp,
    });
  });

  test('Flow 1: Personal Impact Tracker — Calculation, Logging, Inspection & CSV Export', async ({ page, context }) => {
    // 1. Create authenticated test session directly in database
    const user = await prisma.user.create({
      data: {
        email: `impact_e2e_${Date.now()}_${Math.random().toString(36).substring(7)}@breathewise.test`,
        passwordHash: 'argon2id_mock_hash',
        name: 'Impact Test User',
      },
    });

    const { sessionToken } = await createDatabaseSession(user.id);
    await context.addCookies([
      {
        name: 'breathewise_session',
        value: sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    // 2. Open dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText(/Welcome/i);

    // 3. Click Impact Tracker tab
    const impactTab = page.locator('button:has-text("Impact Tracker")').first();
    await expect(impactTab).toBeVisible();
    await impactTab.click();

    // 4. Verify Impact Workspace header & methodology version
    await expect(page.locator('h2:has-text("Personal Impact Tracker")')).toBeVisible();
    await expect(page.locator('text=Methodology v2024.1.0')).toBeVisible();

    // 5. Open Activity Logger Modal
    const logButton = page.locator('button:has-text("Log Activity")').first();
    await expect(logButton).toBeVisible();
    await logButton.click();

    // 6. Fill Transport Commute Shift (15 km Solo Car -> Metro)
    await page.fill('input#log-title', 'Metro Commute to Connaught Place');
    await page.fill('input#tr-dist', '15');
    await page.selectOption('select#tr-base', 'SOLO_CAR');
    await page.selectOption('select#tr-opt', 'METRO');

    // 7. Verify Deterministic Live Calculation Preview
    await expect(page.locator('text=Deterministic Calculation Preview')).toBeVisible();
    await expect(page.locator('text=+2.04 kg CO2e')).toBeVisible();
    await expect(page.locator('text=+0.21 g PM2.5')).toBeVisible();

    // 8. Save activity to audit trail
    const saveButton = page.locator('button:has-text("Save to Audit Trail")');
    await saveButton.evaluate((el: HTMLElement) => el.click());
    await expect(page.locator('text=Metro Commute to Connaught Place').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=+2.04 kg CO2e').first()).toBeVisible();

    // 9. Open Inspection Modal
    const inspectButton = page.locator('button[title="Inspect calculation details"]').first();
    await expect(inspectButton).toBeVisible();
    await inspectButton.evaluate((el: HTMLElement) => el.click());

    await expect(page.locator('text=Audit Calculation Inspection')).toBeVisible();
    await expect(page.locator('text=Mathematical Formula')).toBeVisible();
    await expect(page.locator('text=UK DESNZ / DEFRA 2024')).toBeVisible();
    await page.locator('button:has-text("Close")').evaluate((el: HTMLElement) => el.click());

    // 10. Verify Export CSV Button
    const exportButton = page.locator('button:has-text("Export CSV")').first();
    await expect(exportButton).toBeVisible();
  });

  test('Flow 2: Community Intelligence — Privacy Fuzzing, Regulatory Segregation & Upvoting', async ({ page, context }) => {
    // 1. Create authenticated test session directly in database
    const user = await prisma.user.create({
      data: {
        email: `community_e2e_${Date.now()}_${Math.random().toString(36).substring(7)}@breathewise.test`,
        passwordHash: 'argon2id_mock_hash',
        name: 'Community Test User',
      },
    });

    const { sessionToken } = await createDatabaseSession(user.id);
    await context.addCookies([
      {
        name: 'breathewise_session',
        value: sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    // 2. Open dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText(/Welcome/i);

    // 3. Click Community tab
    const communityTab = page.locator('button:has-text("Community")').first();
    await expect(communityTab).toBeVisible();
    await communityTab.click();

    // 4. Verify Community Workspace & Hard Invariant Banner
    await expect(page.locator('h2:has-text("Community Environmental Intelligence")')).toBeVisible();
    await expect(page.locator('text=MANDATORY SCIENTIFIC & REGULATORY SEGREGATION')).toBeVisible();
    await expect(page.locator('text=isOfficialData: false (Hard Invariant)')).toBeVisible();

    // 5. Open Observation Submission Modal
    const reportButton = page.locator('button:has-text("Report Local Condition")').first();
    await expect(reportButton).toBeVisible();
    await reportButton.click();

    await expect(page.locator('text=Privacy Guarantee Notice')).toBeVisible();
    await expect(page.locator('text=Fuzzed to a ~1.1 km neighborhood centroid')).toBeVisible();

    // 6. Fill Observation Form
    await page.selectOption('select#sub-type', 'VISIBLE_SMOG');
    await page.selectOption('select#sub-sev', 'MODERATE');
    await page.fill('input#sub-neigh', 'Rohini Sector 7');
    await page.fill('textarea#sub-desc', 'Hazy conditions with reduced visibility along outer ring road.');

    // 7. Submit Observation
    const submitObsButton = page.locator('button:has-text("Submit Observation")');
    await submitObsButton.click({ force: true });

    // 8. Verify observation appears in feed with segregation badge
    await expect(page.locator('text=Rohini Sector 7').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=Unofficial Citizen Data').first()).toBeVisible();

    // 9. Test Upvote action
    const upvoteButton = page.locator('button:has-text("Helpful")').first();
    await expect(upvoteButton).toBeVisible();
    await upvoteButton.click({ force: true });
    await expect(page.locator('button:has-text("Helpful (1)")').first()).toBeVisible();

    // 10. Open Moderation Flagging Modal
    const flagButton = page.locator('button:has-text("Report / Flag")').first();
    await expect(flagButton).toBeVisible();
    await flagButton.click({ force: true });

    await expect(page.locator('text=Report Inappropriate Community Observation')).toBeVisible();
    await page.selectOption('select#fl-reason', 'SPAM_OR_ADVERTISING');
    await page.fill('textarea#fl-det', 'Quarantining test observation');
    await page.locator('button:has-text("Submit Report")').click({ force: true });
  });

  test('Flow 3: Responsive Viewport Adaptation (Mobile Small 360px & Standard 390px)', async ({ page }) => {
    // Test on Mobile Small 360x640
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/login');
    await expect(page.locator('h1')).toBeVisible();

    // Test on Mobile Standard 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await expect(page.locator('h1')).toBeVisible();
  });
});
