import { test, expect } from '@playwright/test';

test('check register page loads correctly', async ({ page }) => {
  // Go to register page
  await page.goto('/register');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Check URL - should NOT redirect to login
  const url = page.url();
  console.log('Current URL:', url);

  if (url.includes('/login')) {
    throw new Error('FAIL: Redirected to login instead of staying on register');
  }

  // Check if registration form elements are visible
  await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

  // Check for Google OAuth button
  const googleButton = page.getByRole('button', { name: /google/i });
  await expect(googleButton).toBeVisible();

  console.log('SUCCESS: Register page loaded correctly');
});
