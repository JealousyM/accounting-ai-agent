import { test, expect } from '@playwright/test';

test.describe('/guide section', () => {
  test('all guide pages reachable without authentication', async ({ page }) => {
    await page.goto('/guide');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto('/guide/ksef');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto('/guide/ksef/get-tokens');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);

    await expect(page.getByRole('link', { name: /KSeF/i }).first()).toBeVisible();
  });

  test('locale switcher changes article content', async ({ page }) => {
    await page.goto('/guide/ksef/get-tokens');
    const h1 = page.locator('h1');
    const initial = await h1.textContent();

    await page.getByRole('button', { name: /^pl$/i }).click();
    await expect(h1).not.toHaveText(initial ?? '');
  });
});
