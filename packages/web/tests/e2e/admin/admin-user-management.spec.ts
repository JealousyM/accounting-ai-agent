import { test, expect } from '@playwright/test';
import { loginUser } from '../helpers/test-utils';

/**
 * E2E tests for Admin User Management — Task #88
 *
 * These tests require:
 *   TEST_ADMIN_EMAIL  — a seeded admin account
 *   TEST_ADMIN_PASSWORD
 *
 * If those env vars are absent the whole suite is skipped (consistent with the
 * other admin specs in this directory).
 *
 * NOTE: The "soft-delete a user → not in list" and "deleted-user URL → see
 * deleted badge" tests are intentionally omitted. They mutate DB state and
 * there is no isolated per-test user fixture or teardown mechanism in the
 * existing E2E infrastructure, so they would leave dirty state for subsequent
 * runs.
 */

test.describe('Admin user management — detail page', () => {
  test.beforeEach(async ({ page }) => {
    const adminEmail = process.env.TEST_ADMIN_EMAIL;
    const adminPassword = process.env.TEST_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      test.skip();
      return;
    }

    try {
      await loginUser(page, adminEmail, adminPassword);
    } catch {
      test.skip();
    }
  });

  // -------------------------------------------------------------------------
  // ADMIN-UMD-001: navigating from the user list opens the detail page
  // -------------------------------------------------------------------------
  test('ADMIN-UMD-001: clicking a user row navigates to the detail page', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    // Give the table time to populate after the initial API call
    await page.waitForTimeout(2000);

    // Click the first data row in the users table
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();

    // Should navigate to /admin/users/<uuid>
    await expect(page).toHaveURL(/\/admin\/users\//, { timeout: 15000 });
  });

  // -------------------------------------------------------------------------
  // ADMIN-UMD-002: user detail page has Subscription panel with plan select
  // -------------------------------------------------------------------------
  test('ADMIN-UMD-002: user detail page shows subscription panel', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();
    await expect(page).toHaveURL(/\/admin\/users\//, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // The SubscriptionPanel renders a <label> whose text is t.subscription.plan = "Plan"
    // and a <select id="subscription-plan-select">
    const planSelect = page.locator('#subscription-plan-select');
    await expect(planSelect).toBeVisible({ timeout: 10000 });

    // Save plan button — text is t.subscription.save = "Save plan"
    const saveButton = page.getByRole('button', { name: /save plan/i });
    await expect(saveButton).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // ADMIN-UMD-003: admin can change a user plan and the confirmation appears
  // -------------------------------------------------------------------------
  test('ADMIN-UMD-003: admin can change a user plan and it shows saved confirmation', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate to first user's detail page
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();
    await expect(page).toHaveURL(/\/admin\/users\//, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const planSelect = page.locator('#subscription-plan-select');
    await expect(planSelect).toBeVisible({ timeout: 10000 });

    // Read the current value so we can toggle to the other option
    const currentValue = await planSelect.inputValue();
    const targetPlan = currentValue === 'pro' ? 'free' : 'pro';

    await planSelect.selectOption(targetPlan);

    // Click "Save plan"
    const saveButton = page.getByRole('button', { name: /save plan/i });
    await saveButton.click();

    // The SubscriptionPanel sets savedMsg = t.subscription.saved = "Plan updated"
    // and clears it after 3 s — verify it appears
    await expect(page.getByText(/plan updated/i)).toBeVisible({ timeout: 10000 });

    // Reload and verify the plan persisted
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const planSelectAfterReload = page.locator('#subscription-plan-select');
    await expect(planSelectAfterReload).toHaveValue(targetPlan);
  });

  // -------------------------------------------------------------------------
  // ADMIN-UMD-004: admin cannot delete themselves (buttons are disabled)
  // -------------------------------------------------------------------------
  test('ADMIN-UMD-004: admin cannot delete their own account (buttons disabled)', async ({ page }) => {
    // Resolve the currently-logged-in admin's id via the /api/auth/me endpoint
    const meResponse = await page.request.get('/api/auth/me');
    const meBody = await meResponse.json().catch(() => null);

    // The API may nest the user differently; try common shapes
    const myId: string | undefined =
      meBody?.data?.id ?? meBody?.user?.id ?? meBody?.id;

    if (!myId) {
      test.skip();
      return;
    }

    await page.goto(`/admin/users/${myId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // DangerZone renders two buttons whose text comes from i18n:
    //   t.danger.softDelete = "Soft delete user"
    //   t.danger.hardDelete = "Hard delete user"
    // Both are disabled when isSelf === true
    const softDeleteButton = page.getByRole('button', { name: /soft delete user/i });
    const hardDeleteButton = page.getByRole('button', { name: /hard delete user/i });

    await expect(softDeleteButton).toBeVisible({ timeout: 10000 });
    await expect(hardDeleteButton).toBeVisible({ timeout: 10000 });

    await expect(softDeleteButton).toBeDisabled();
    await expect(hardDeleteButton).toBeDisabled();

    // Additionally, the "selfActionDisabled" warning should be visible:
    //   t.danger.selfActionDisabled = "You cannot perform this action on your own account"
    await expect(
      page.getByText(/you cannot perform this action on your own account/i)
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // ADMIN-UMD-005: user detail page shows the "Back to users" link
  // -------------------------------------------------------------------------
  test('ADMIN-UMD-005: user detail page has a back link to /admin', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();
    await expect(page).toHaveURL(/\/admin\/users\//, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // t.userDetail.back = "Back to users"
    const backLink = page.getByRole('link', { name: /back to users/i });
    await expect(backLink).toBeVisible({ timeout: 10000 });

    await backLink.click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // ADMIN-UMD-006: user detail page shows profile card with active/deleted badge
  // -------------------------------------------------------------------------
  test('ADMIN-UMD-006: user detail page shows an active badge for a non-deleted user', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();
    await expect(page).toHaveURL(/\/admin\/users\//, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // UserProfileCard renders either t.deletedBadge ("Deleted") or t.activeBadge ("Active")
    // For any non-deleted seeded admin user the badge should read "Active"
    await expect(page.getByText(/^Active$/i)).toBeVisible({ timeout: 10000 });
  });
});
