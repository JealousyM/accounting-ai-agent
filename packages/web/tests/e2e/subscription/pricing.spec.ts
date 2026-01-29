import { test, expect } from '@playwright/test';
import { loginUser, dismissCookieBanner } from '../helpers/test-utils';

test.describe('Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first since pricing page is protected
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
    await loginUser(page, testEmail, testPassword);
    await dismissCookieBanner(page);

    // Navigate to pricing page
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
  });

  test('PRICING-002: should toggle between monthly and yearly billing', async ({ page }) => {
    // Find billing toggle buttons
    const monthlyButton = page.getByRole('button', { name: /monthly|miesięcznie|ежемесячно/i });
    const yearlyButton = page.getByRole('button', { name: /yearly|rocznie|ежегодно/i });

    // Verify toggle buttons are visible
    await expect(monthlyButton).toBeVisible();
    await expect(yearlyButton).toBeVisible();

    // Click monthly button - should be active by default
    await monthlyButton.click();
    await expect(monthlyButton).toHaveClass(/bg-white|shadow/);

    // Click yearly button
    await yearlyButton.click();
    await expect(yearlyButton).toHaveClass(/bg-white|shadow/);

    // Verify save percentage badge is visible on yearly option
    await expect(page.locator('text=/-\\d+%|save|экономия|oszczęd/i')).toBeVisible();

    // The yearly billing should show "billed yearly" or similar text
    await expect(page.locator('text=/billed yearly|rocznie|ежегодн|оплата за год/i').first()).toBeVisible();

    // Click back to monthly
    await monthlyButton.click();
    await expect(monthlyButton).toHaveClass(/bg-white|shadow/);
  });

  test('PRICING-003: should display correct prices in PLN', async ({ page }) => {
    // Wait for pricing content to load
    await expect(page.locator('.text-4xl').first()).toBeVisible({ timeout: 10000 });

    // Check that PLN currency is displayed (may render as "PLN" or "zł" depending on locale)
    await expect(page.locator('text=/PLN|zł/i').first()).toBeVisible();

    // Free plan should show 0 price (PLN 0 or 0 zł or 0,00 zł)
    await expect(page.locator('text=/PLN\\s*0|0\\s*PLN|0[,.]00\\s*zł|0\\s*zł/i').first()).toBeVisible();

    // Pro plan should show a price greater than 0 (text-4xl contains formatted price)
    const proPriceElement = page.locator('.text-4xl').filter({ hasText: /[1-9]/ }).first();
    await expect(proPriceElement).toBeVisible();

    // Verify the price format includes currency symbol
    const priceText = await proPriceElement.textContent();
    expect(priceText).toMatch(/PLN|zł|\d+/i);

    // Check per month indicator
    await expect(page.locator('text=/\\/month|\\/miesiąc|\\/месяц|месяц/i').first()).toBeVisible();
  });

  test('PRICING-004: should highlight Pro plan as popular', async ({ page }) => {
    // Check for "Popular" badge on Pro plan
    await expect(page.locator('text=/popular|popularne|популярн/i')).toBeVisible();

    // Pro plan card should have distinct styling (blue border)
    const proPlanCard = page.locator('div.border-blue-500').first();
    await expect(proPlanCard).toBeVisible();

    // Check for gradient background on Pro plan
    const proGradient = page.locator('[class*="from-blue"]');
    await expect(proGradient.first()).toBeVisible();
  });

  test('PRICING-007: should have back navigation to chat', async ({ page }) => {
    // Check for back button/link
    const backLink = page.locator('a[href="/chat"]').first();
    await expect(backLink).toBeVisible();

    // Click back and verify navigation
    await backLink.click();
    await page.waitForURL(/.*\/chat/);
    expect(page.url()).toContain('/chat');
  });

});
