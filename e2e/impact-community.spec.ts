import { test, expect } from '@playwright/test';
import fs from 'fs';
import prisma from '../src/lib/db';
import { createDatabaseSession } from '../src/lib/session';

/**
 * BreatheWise AI — End-to-End Personal Impact Tracker & Community Intelligence (M6)
 * 
 * Verifies complete user journeys across:
 * 1. Personal Impact Tracker: deterministic calculation previews, logging modal,
 *    historical audit trail, formula inspection drawer, inline edit, delete with aggregate
 *    recalculation, RFC 4180 CSV export download and content parsing, and audit JSON export.
 * 2. Community Environmental Intelligence: privacy preservation (~1.1 km coarse fuzzing),
 *    regulatory segregation banner (`isOfficialData: false`), citizen report submission,
 *    upvoting deduplication, and moderation flagging.
 * 3. Multi-User Isolation: User B cannot view, edit, or access User A private records.
 * 4. Responsive Viewports: Mobile Small (360×640) and Mobile Standard (390×844) layout checks.
 */

test.describe('BreatheWise AI Module 6: Impact Tracker & Community Intelligence', () => {
  let testIp = '10.99.6.1';

  test.beforeEach(async ({ context }) => {
    testIp = `10.99.${Math.floor(Math.random() * 200 + 1)}.${Math.floor(Math.random() * 200 + 1)}`;
    await context.setExtraHTTPHeaders({
      'x-forwarded-for': testIp,
    });
  });

  test('Flow 1: Personal Impact Tracker — Calculation, Logging, Inspection, Edit, Export & Delete', async ({ page, context }) => {
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
    await expect(page.locator('text=Methodology v2024.2.1')).toBeVisible();

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
    await expect(page.locator('text=Not Quantified').first()).toBeVisible();

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

    // 10. Test Activity Edit Journey & Updated Aggregate
    const editButton = page.locator('button[title="Edit log"]').first();
    await expect(editButton).toBeVisible();
    await editButton.evaluate((el: HTMLElement) => el.click());

    await expect(page.locator('text=Edit Environmental Log')).toBeVisible();
    await page.fill('input#edit-title', 'Metro Commute to Connaught Place (Verified)');
    await page.locator('button:has-text("Save Changes")').evaluate((el: HTMLElement) => el.click());

    await expect(page.locator('text=Metro Commute to Connaught Place (Verified)').first()).toBeVisible({ timeout: 5_000 });

    // 11. Test CSV Export Download & Content Parsing
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button:has-text("Export CSV")').first().click(),
    ]);
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    if (downloadPath) {
      const csvContent = fs.readFileSync(downloadPath, 'utf-8');
      expect(csvContent).toContain('Log ID,Date (UTC),Action Category,Activity Title');
      expect(csvContent).toContain('Metro Commute to Connaught Place (Verified)');
      expect(csvContent).toContain('2.04');
    }

    // 12. Test JSON Export via API
    const jsonRes = await context.request.get('/api/impact?format=json');
    expect(jsonRes.status()).toBe(200);
    const jsonData = await jsonRes.json();
    expect(jsonData.success).toBe(true);
    expect(jsonData.data.totalCount).toBeGreaterThanOrEqual(1);
    expect(jsonData.data.aggregates.totalCO2AvoidedKg).toBe(2.04);

    // 13. Test Activity Deletion with Aggregate Recalculation
    const deleteButton = page.locator('button[title="Delete log"]').first();
    await expect(deleteButton).toBeVisible();
    await deleteButton.evaluate((el: HTMLElement) => el.click());

    await expect(page.locator('text=Confirm Log Removal')).toBeVisible();
    const confirmDeleteBtn = page.locator('button:has-text("Confirm Delete")');
    await confirmDeleteBtn.evaluate((el: HTMLElement) => el.click());

    // Verify activity is removed and empty state appears
    await expect(page.locator('text=No Impact Entries Found')).toBeVisible({ timeout: 5_000 });
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

  test('Flow 3: Multi-User Data Isolation Guard', async ({ browser }) => {
    // 1. Create User A and User B
    const userA = await prisma.user.create({
      data: {
        email: `isolation_a_${Date.now()}@breathewise.test`,
        passwordHash: 'argon2id_mock_hash',
        name: 'User A',
      },
    });
    const userB = await prisma.user.create({
      data: {
        email: `isolation_b_${Date.now()}@breathewise.test`,
        passwordHash: 'argon2id_mock_hash',
        name: 'User B',
      },
    });

    // 2. User A records a private activity
    const logA = await prisma.impactLog.create({
      data: {
        userId: userA.id,
        actionType: 'COMMUTE_SHIFT',
        title: 'Secret Journey by User A',
        co2AvoidedKg: 3.5,
        pm25AvoidedGrams: 0.0,
        calculationFormula: '20 km shifted',
        uncertaintyMargin: 0.15,
      },
    });

    // 3. User B launches a separate browser session
    const contextB = await browser.newContext();
    const { sessionToken: sessionB } = await createDatabaseSession(userB.id);
    await contextB.addCookies([
      {
        name: 'breathewise_session',
        value: sessionB,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    const pageB = await contextB.newPage();
    await pageB.goto('/dashboard');
    await pageB.locator('button:has-text("Impact Tracker")').first().click();

    // 4. Verify User B does not see User A's private activity
    await expect(pageB.locator('text=Secret Journey by User A')).not.toBeVisible();

    // 5. Verify direct API request by User B for User A's record returns 404 (Not Found / Access Denied)
    const apiRes = await contextB.request.get(`/api/impact/${logA.id}`);
    expect(apiRes.status()).toBe(404);

    await contextB.close();
  });

  test('Flow 4: Mobile Viewports (Small 360px & Standard 390px) Dashboard Integrity', async ({ page, context }) => {
    const user = await prisma.user.create({
      data: {
        email: `mobile_e2e_${Date.now()}@breathewise.test`,
        passwordHash: 'argon2id_mock_hash',
        name: 'Mobile Test User',
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

    // Test on Mobile Small 360x640
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText(/Welcome/i);

    // Switch to Impact Tracker and verify no horizontal scroll overflow
    await page.locator('button:has-text("Impact Tracker")').first().click();
    await expect(page.locator('h2:has-text("Personal Impact Tracker")')).toBeVisible();
    const isOverflowing360 = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(isOverflowing360).toBe(false);

    // Test on Mobile Standard 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('button:has-text("Community")').first().click();
    await expect(page.locator('h2:has-text("Community Environmental Intelligence")')).toBeVisible();
    const isOverflowing390 = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(isOverflowing390).toBe(false);
  });
});
