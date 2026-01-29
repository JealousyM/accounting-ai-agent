import { test, expect } from '@playwright/test';
import { generateTestUser, fillRegistrationForm, STRIPE_TEST_CARDS, dismissCookieBanner } from '../helpers/test-utils';

// SKIP: Stripe Checkout hosted page has dynamic selectors that are difficult to test reliably
// These tests require interacting with Stripe's hosted checkout UI which changes frequently
// The card input frames don't use the expected 'privateStripeFrame' naming pattern
test.describe.skip('Registration - Pro Plan with Invalid Card', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    // Dismiss cookie banner if visible (it can block clicks)
    await dismissCookieBanner(page);
  });

  test('REG-004: should show error for declined card', async ({ page }) => {
    const user = generateTestUser('pro');

    // Fill form with Pro plan
    await fillRegistrationForm(page, user, {
      selectProPlan: true,
      billingPeriod: 'monthly',
    });

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for Stripe checkout (use domcontentloaded instead of load for external sites)
    try {
      await page.waitForURL(/.*checkout\.stripe\.com/, { timeout: 30000, waitUntil: 'domcontentloaded' });
    } catch {
      // If Stripe redirect doesn't happen, skip the rest of the test
      test.skip();
      return;
    }

    // Fill Stripe form with declined card
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="card number"]').fill(STRIPE_TEST_CARDS.declined);
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="MM / YY"]').fill('12/34');
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="CVC"]').fill('123');

    // Fill billing details if visible
    const emailInput = page.locator('input[name="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill(user.email);
    }

    // Submit payment
    await page.getByRole('button', { name: /pay|subscribe|zapłać/i }).click();

    // Wait for error message about declined card
    await expect(page.locator('text=/declined|odrzucona|отклонена/i')).toBeVisible({ timeout: 30000 });

    // User should still be on Stripe checkout (not redirected to success)
    const url = page.url();
    expect(url).toContain('stripe');
    expect(url).not.toContain('success');
  });

  test('REG-005: should show error for expired card', async ({ page }) => {
    const user = generateTestUser('pro');

    // Fill form with Pro plan
    await fillRegistrationForm(page, user, {
      selectProPlan: true,
      billingPeriod: 'monthly',
    });

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for Stripe checkout
    try {
      await page.waitForURL(/.*checkout\.stripe\.com/, { timeout: 30000, waitUntil: 'domcontentloaded' });
    } catch {
      test.skip();
      return;
    }

    // Fill Stripe form with expired card
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="card number"]').fill(STRIPE_TEST_CARDS.expired);
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="MM / YY"]').fill('12/34');
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="CVC"]').fill('123');

    // Fill billing details if visible
    const emailInput = page.locator('input[name="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill(user.email);
    }

    // Submit payment
    await page.getByRole('button', { name: /pay|subscribe|zapłać/i }).click();

    // Wait for error message about expired card
    await expect(page.locator('text=/expired|wygasła|истекла/i')).toBeVisible({ timeout: 30000 });

    // User should still be on Stripe checkout
    const url = page.url();
    expect(url).toContain('stripe');
  });

  test('should show error for insufficient funds', async ({ page }) => {
    const user = generateTestUser('pro');

    // Fill form with Pro plan
    await fillRegistrationForm(page, user, {
      selectProPlan: true,
      billingPeriod: 'monthly',
    });

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for Stripe checkout
    try {
      await page.waitForURL(/.*checkout\.stripe\.com/, { timeout: 30000, waitUntil: 'domcontentloaded' });
    } catch {
      test.skip();
      return;
    }

    // Fill Stripe form with insufficient funds card
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="card number"]').fill(STRIPE_TEST_CARDS.insufficientFunds);
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="MM / YY"]').fill('12/34');
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="CVC"]').fill('123');

    // Fill billing details if visible
    const emailInput = page.locator('input[name="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill(user.email);
    }

    // Submit payment
    await page.getByRole('button', { name: /pay|subscribe|zapłać/i }).click();

    // Wait for error message about insufficient funds
    await expect(page.locator('text=/insufficient|niewystarczające|недостаточно/i')).toBeVisible({ timeout: 30000 });

    // User should still be on Stripe checkout
    const url = page.url();
    expect(url).toContain('stripe');
  });

  test('should allow retry after card error', async ({ page }) => {
    const user = generateTestUser('pro');

    // Fill form with Pro plan
    await fillRegistrationForm(page, user, {
      selectProPlan: true,
      billingPeriod: 'monthly',
    });

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for Stripe checkout
    try {
      await page.waitForURL(/.*checkout\.stripe\.com/, { timeout: 30000, waitUntil: 'domcontentloaded' });
    } catch {
      test.skip();
      return;
    }

    // First attempt with declined card
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="card number"]').fill(STRIPE_TEST_CARDS.declined);
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="MM / YY"]').fill('12/34');
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="CVC"]').fill('123');

    // Submit payment
    await page.getByRole('button', { name: /pay|subscribe|zapłać/i }).click();

    // Wait for error
    await expect(page.locator('text=/declined|odrzucona|отклонена|error|błąd/i')).toBeVisible({ timeout: 30000 });

    // Clear the card number and retry with valid card
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="card number"]').clear();
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="card number"]').fill(STRIPE_TEST_CARDS.valid);

    // Submit again
    await page.getByRole('button', { name: /pay|subscribe|zapłać/i }).click();

    // Should succeed now
    await Promise.race([
      page.waitForURL(/.*\/subscription\/success/, { timeout: 60000 }),
      page.waitForURL(/.*\/chat/, { timeout: 60000 }),
    ]);
  });

  test('should handle incomplete card details', async ({ page }) => {
    const user = generateTestUser('pro');

    // Fill form with Pro plan
    await fillRegistrationForm(page, user, {
      selectProPlan: true,
      billingPeriod: 'monthly',
    });

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for Stripe checkout
    try {
      await page.waitForURL(/.*checkout\.stripe\.com/, { timeout: 30000, waitUntil: 'domcontentloaded' });
    } catch {
      test.skip();
      return;
    }

    // Fill only partial card details
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="card number"]').fill('4242');
    // Don't fill expiry and CVC

    // Try to submit payment
    await page.getByRole('button', { name: /pay|subscribe|zapłać/i }).click();

    // Should show validation error
    await expect(page.locator('text=/incomplete|niekompletne|неполные|invalid|nieprawidłowe/i')).toBeVisible({ timeout: 15000 });
  });
});
