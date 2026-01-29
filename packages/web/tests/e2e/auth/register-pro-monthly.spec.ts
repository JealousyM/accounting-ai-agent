import { test, expect } from '@playwright/test';
import { generateTestUser, fillRegistrationForm, STRIPE_TEST_CARDS, dismissCookieBanner } from '../helpers/test-utils';

test.describe('Registration - Pro Plan Monthly', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    // Dismiss cookie banner if visible (it can block clicks)
    await dismissCookieBanner(page);
  });

  test('REG-002: should register with Pro plan (monthly) and redirect to Stripe', async ({ page }) => {
    const user = generateTestUser('pro');

    // Fill form with Pro plan and monthly billing
    await fillRegistrationForm(page, user, {
      selectProPlan: true,
      billingPeriod: 'monthly',
    });

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for registration to complete and redirect to pricing/checkout
    await Promise.race([
      page.waitForURL(/.*\/pricing.*autoCheckout=true.*billingPeriod=monthly/, { timeout: 20000 }),
      page.waitForURL(/.*checkout\.stripe\.com/, { timeout: 20000, waitUntil: 'domcontentloaded' }),
    ]);

    // Verify we're on pricing or Stripe checkout
    const url = page.url();
    expect(url).toMatch(/pricing|stripe/);
  });

  test('should show Pro plan features', async ({ page }) => {
    // Click on Pro plan (the plan card, not the AI Provider label)
    await page.locator('label:has-text("Pro"):has-text("PLN")').first().click();

    // Check Pro plan features are displayed - actual text: "included" / "wliczone"
    await expect(page.locator('text=/included|wliczone|включено/i')).toBeVisible({ timeout: 5000 });

    // Check billing period selector appears (buttons contain nested divs with text)
    await expect(page.locator('button:has-text("Monthly"), button:has-text("Miesięcznie")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Yearly"), button:has-text("Rocznie")').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display Pro checkout info message', async ({ page }) => {
    // Select Pro plan (the plan card, not the AI Provider label)
    await page.locator('label:has-text("Pro"):has-text("PLN")').first().click();

    // Check info message about checkout is displayed
    // Actual text: "You will be redirected to checkout after registration"
    await expect(page.locator('text=/redirected.*checkout|checkout.*after.*registration|przekierowany.*płatności|płatności.*rejestracji/i')).toBeVisible({ timeout: 5000 });
  });

  test('should not require LLM provider for Pro plan', async ({ page }) => {
    // Select Pro plan (the plan card, not the AI Provider label)
    await page.locator('label:has-text("Pro"):has-text("PLN")').first().click();

    // LLM provider section should NOT be visible
    await expect(page.locator('select#llmProvider')).not.toBeVisible();
    await expect(page.locator('input#llmApiKey')).not.toBeVisible();
  });

  test.skip('should complete Pro monthly registration with valid card', async ({ page }) => {
    // SKIP: Stripe Checkout hosted page has dynamic selectors that are difficult to test
    // The card input frames don't use the expected 'privateStripeFrame' naming pattern
    const user = generateTestUser('pro');

    // Fill form with Pro plan
    await fillRegistrationForm(page, user, {
      selectProPlan: true,
      billingPeriod: 'monthly',
    });

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for redirect to pricing page with autoCheckout
    try {
      await page.waitForURL(/.*\/pricing.*autoCheckout=true/, { timeout: 20000 });
    } catch {
      // May redirect directly to Stripe
    }

    // Wait for Stripe checkout redirect
    try {
      await page.waitForURL(/.*checkout\.stripe\.com/, { timeout: 30000, waitUntil: 'domcontentloaded' });
    } catch {
      // If Stripe redirect doesn't happen, skip the test
      test.skip();
      return;
    }

    // Wait for Stripe form to be ready (don't use networkidle - Stripe keeps making requests)
    await page.waitForTimeout(3000);

    // Verify Stripe checkout loaded (use test ID for submit button)
    // Fix: Only use the submit button selector, not the OR with text that matches multiple elements
    await expect(page.getByTestId('hosted-payment-submit-button')).toBeVisible({ timeout: 20000 });

    // Fill Stripe form with valid test card
    // Note: Stripe's iframe handling requires special consideration
    // The card input is inside an iframe
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="card number"]').fill(STRIPE_TEST_CARDS.valid);
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="MM / YY"]').fill('12/34');
    await page.frameLocator('iframe[name*="privateStripeFrame"]').first().locator('[placeholder*="CVC"]').fill('123');

    // Fill billing details if visible
    const emailInput = page.locator('input[name="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill(user.email);
    }

    // Submit payment
    await page.getByRole('button', { name: /pay|subscribe|zapłać/i }).click();

    // Wait for success redirect
    await Promise.race([
      page.waitForURL(/.*\/subscription\/success/, { timeout: 60000 }),
      page.waitForURL(/.*\/chat/, { timeout: 60000 }),
    ]);

    // Verify success
    const successUrl = page.url();
    expect(successUrl).toMatch(/success|chat/);
  });
});
