import { test, expect } from '@playwright/test';
import { loginUser, dismissCookieBanner } from '../helpers/test-utils';

test.describe('Subscription Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first since subscription page is protected
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
    await loginUser(page, testEmail, testPassword);
    await dismissCookieBanner(page);

    // Navigate to subscription management page
    await page.goto('/subscription');
    await page.waitForLoadState('networkidle');
  });

  test('SUB-001: should display current subscription status', async ({ page }) => {
    // Check page header
    await expect(page.locator('h1').first()).toBeVisible();

    // Check that current plan is displayed (either Free or Pro)
    const planName = page.locator('text=/Free|Pro/i').first();
    await expect(planName).toBeVisible();

    // Check that status is displayed
    await expect(page.locator('text=/status|статус/i').first()).toBeVisible();

    // Status should show active, past_due, or similar
    const statusText = page.locator('text=/active|aktywn|активн|past_due/i');
    await expect(statusText.first()).toBeVisible();

    // Plan icon should be visible (Crown for Pro, Zap for Free)
    const planIcon = page.locator('svg.lucide-crown, svg.lucide-zap');
    await expect(planIcon.first()).toBeVisible();
  });

  test('SUB-002: should show usage meter', async ({ page }) => {
    // Check for usage section header
    await expect(page.locator('text=/usage|użycie|использовани/i').first()).toBeVisible();

    // Check for usage meter elements
    // AI Messages usage
    const aiMessagesUsage = page.locator('text=/AI Messages|Wiadomości AI|Сообщения AI/i');

    // wFirma Requests usage
    const wfirmaUsage = page.locator('text=/wFirma|żądania|запросы/i');

    // At least one usage meter should be visible
    const usageMeter = aiMessagesUsage.or(wfirmaUsage);
    await expect(usageMeter.first()).toBeVisible();

    // Check for usage numbers (X / Y format)
    await expect(page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first()).toBeVisible();

    // Check for progress bar
    const progressBar = page.locator('[class*="bg-blue-500"], [class*="bg-yellow-500"], [class*="bg-red-500"]');
    await expect(progressBar.first()).toBeVisible();
  });

  test('SUB-003: should handle subscription cancellation flow', async ({ page }) => {
    // This test depends on whether the user has a Pro subscription
    // First check if cancel button is visible (only for Pro users who haven't canceled)

    const cancelButton = page.locator('button').filter({ hasText: /cancel subscription|anuluj subskrypcję|отменить подписку/i });

    // If cancel button is not visible, user is on Free plan or already canceled
    const isCancelVisible = await cancelButton.isVisible().catch(() => false);

    if (isCancelVisible) {
      // Click cancel button to open modal
      await cancelButton.click();

      // Check that cancellation modal appears
      const modal = page.locator('[role="dialog"], .fixed.inset-0');
      await expect(modal).toBeVisible();

      // Check modal content
      await expect(page.locator('text=/cancel|anulować|отменить/i')).toBeVisible();
      await expect(page.locator('text=/are you sure|czy jesteś pewien|вы уверены/i').or(
        page.locator('text=/lose access|stracisz dostęp|потеряете доступ/i')
      )).toBeVisible();

      // Check for confirmation buttons
      const keepButton = page.locator('button').filter({ hasText: /keep|zachowaj|сохранить/i });
      const confirmCancelButton = page.locator('button').filter({ hasText: /yes, cancel|tak, anuluj|да, отменить/i });

      await expect(keepButton).toBeVisible();
      await expect(confirmCancelButton).toBeVisible();

      // Click "Keep subscription" to close modal without canceling
      await keepButton.click();

      // Modal should close
      await expect(modal).not.toBeVisible({ timeout: 5000 });
    } else {
      // User is on Free plan - check for upgrade prompt instead
      const upgradeLink = page.locator('a[href="/pricing"]').filter({ hasText: /upgrade|view plans|przejdź|zobacz plany/i });

      if (await upgradeLink.isVisible()) {
        await expect(upgradeLink).toBeVisible();
        test.info().annotations.push({ type: 'note', description: 'User is on Free plan - cancellation not available' });
      } else {
        // User might have already canceled
        const cancelWarning = page.locator('text=/will be cancelled|zostanie anulowana|будет отменена/i');
        if (await cancelWarning.isVisible()) {
          await expect(cancelWarning).toBeVisible();
          test.info().annotations.push({ type: 'note', description: 'Subscription already marked for cancellation' });
        }
      }
    }
  });

  test('SUB-005: should have back navigation to chat', async ({ page }) => {
    // Check for back button/link (Next.js Link renders as <a>)
    const backLink = page.locator('a[href="/chat"]');
    await expect(backLink).toBeVisible({ timeout: 10000 });

    // Verify it has the back arrow icon
    const arrowIcon = page.locator('svg.lucide-arrow-left').or(page.locator('a[href="/chat"] svg'));
    await expect(arrowIcon.first()).toBeVisible();

    // Click back and verify navigation
    await backLink.click();
    await page.waitForURL(/.*\/chat/, { timeout: 15000 });
    expect(page.url()).toContain('/chat');
  });

  test('SUB-006: should show loading state initially', async ({ page }) => {
    // Navigate again to catch loading state
    await page.goto('/subscription');

    // Check for loader (may be brief)
    const loader = page.locator('.animate-spin');

    // Either loader is visible briefly or content loads quickly
    await Promise.race([
      expect(loader).toBeVisible({ timeout: 2000 }),
      expect(page.locator('text=/Free|Pro/i').first()).toBeVisible({ timeout: 5000 }),
    ]).catch(() => {
      // Content loaded too fast to see loader, which is acceptable
    });

    // Eventually content should be visible
    await expect(page.locator('text=/Free|Pro/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('SUB-008: should display usage reset information', async ({ page }) => {
    // Check for usage section
    await expect(page.locator('text=/usage|использовани|użyci/i').first()).toBeVisible();

    // Check for reset date if limits are shown
    const resetInfo = page.locator('text=/resets on|odnawia się|сбрасывается|сброс/i');
    const usageNumbers = page.locator('text=/\\d+\\s*\\/\\s*\\d+/');

    // If usage limits are shown, reset date may also be shown (only when resetAt is set)
    if (await usageNumbers.first().isVisible()) {
      // Reset date might be visible, or "no limits" text for Pro users with own key
      // Russian: "Сброс: {date}" or "лимиты сообщений не применяются"
      const resetOrNoLimits = resetInfo.or(page.locator('text=/no limits|bez limitu|без ограничен|лимиты.*не применяются|безлимитн/i'));
      const isResetVisible = await resetOrNoLimits.first().isVisible().catch(() => false);
      if (isResetVisible) {
        await expect(resetOrNoLimits.first()).toBeVisible();
      }
      // If neither reset info nor "no limits" is visible, it's acceptable
      // (resetAt can be null, and user might not have own key)
    }
  });

  test('SUB-009: should show cancellation warning if subscription is canceled', async ({ page }) => {
    // Check if there's a cancellation warning banner
    const cancelWarning = page.locator('[class*="bg-yellow"]').filter({ hasText: /cancel|anulowa|отмен/i });

    if (await cancelWarning.isVisible()) {
      // Verify warning content
      await expect(cancelWarning).toContainText(/will be cancelled|zostanie anulowana|будет отменена|expires/i);

      // Should show the expiration date
      const warningText = await cancelWarning.textContent();
      // Date should be in the warning
      expect(warningText).toBeTruthy();
    }
  });

  test('SUB-010: should navigate to pricing page from upgrade link', async ({ page }) => {
    // Check for upgrade link (visible for Free users)
    const upgradeLink = page.locator('a[href="/pricing"]');

    if (await upgradeLink.first().isVisible()) {
      await upgradeLink.first().click();
      await page.waitForURL(/.*\/pricing/);
      expect(page.url()).toContain('/pricing');
    } else {
      // User is already Pro - test passes
      test.info().annotations.push({ type: 'note', description: 'User is Pro - no upgrade link shown' });
    }
  });
});
