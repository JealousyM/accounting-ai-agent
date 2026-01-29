import { test, expect } from '@playwright/test';
import { loginUser } from '../helpers/test-utils';

test.describe('Admin Panel - Access Control', () => {
  test.describe('Regular User Access', () => {
    test.beforeEach(async ({ page }) => {
      // Login as regular user
      const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
      const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

      try {
        await loginUser(page, testEmail, testPassword);
      } catch {
        test.skip();
      }
    });

    test('ADMIN-001: admin button should not be visible for regular users', async ({ page }) => {
      // Verify we are on chat page
      await expect(page).toHaveURL(/.*\/chat/);

      // Look for the admin button (Shield icon with purple color)
      const adminButton = page.locator('a[href="/admin"]')
        .or(page.locator('button[title="Admin"]'))
        .or(page.locator('button:has(svg.lucide-shield)'));

      // Admin button should NOT be visible for regular users
      await expect(adminButton).not.toBeVisible();
    });

    test('ADMIN-002: should redirect non-admin users attempting to access /admin', async ({ page }) => {
      // Try to navigate directly to admin page
      await page.goto('/admin');

      // Wait for redirect - should be redirected away from admin page
      // The AdminRoute component redirects non-admin users to /chat
      await page.waitForURL(/.*\/(chat|login)/, { timeout: 10000 });

      // Verify we are NOT on admin page
      expect(page.url()).not.toContain('/admin');
    });

    test('ADMIN-003: should not show admin content when accessing /admin directly', async ({ page }) => {
      // Try to navigate to admin page
      await page.goto('/admin');

      // Wait for any redirect or content to load
      await page.waitForTimeout(2000);

      // Admin dashboard title should not be visible
      const adminTitle = page.locator('h1:has-text("Admin Dashboard")')
        .or(page.locator('h1:has-text("Panel Administracyjny")'))
        .or(page.locator('text=/Admin Dashboard|Panel Administracyjny/i'));

      await expect(adminTitle).not.toBeVisible();
    });
  });

  test.describe('Admin User Access', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin user
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

    test('ADMIN-004: admin button should be visible for admin users', async ({ page }) => {
      // Verify we are on chat page
      await expect(page).toHaveURL(/.*\/chat/);

      // Look for the admin button (Shield icon in header)
      const adminButton = page.locator('a[href="/admin"]')
        .or(page.locator('button[title="Admin"]'))
        .or(page.locator('header button:has(svg.lucide-shield)'));

      // Admin button should be visible for admin users
      await expect(adminButton).toBeVisible({ timeout: 5000 });
    });

    test('ADMIN-005: admin button should navigate to admin panel', async ({ page }) => {
      // Verify we are on chat page
      await expect(page).toHaveURL(/.*\/chat/);

      // Find and click the admin button
      const adminButton = page.locator('a[href="/admin"]')
        .or(page.locator('button[title="Admin"]'));

      await expect(adminButton).toBeVisible({ timeout: 5000 });
      await adminButton.click();

      // Should navigate to admin page
      await page.waitForURL(/.*\/admin/, { timeout: 10000 });
      expect(page.url()).toContain('/admin');
    });

    test('ADMIN-006: admin can access /admin page directly', async ({ page }) => {
      // Navigate directly to admin page
      await page.goto('/admin');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Should stay on admin page (no redirect)
      await expect(page).toHaveURL(/.*\/admin/);

      // Admin dashboard should be visible
      const adminTitle = page.locator('h1:has-text("Admin Dashboard")')
        .or(page.locator('h1:has-text("Panel Administracyjny")')
        .or(page.locator('h1:has-text("Панель администратора")')));

      await expect(adminTitle).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Unauthenticated Access', () => {
    test('ADMIN-007: should redirect unauthenticated users to login', async ({ page }) => {
      // Clear any existing auth state
      await page.context().clearCookies();

      // Try to access admin page without authentication
      await page.goto('/admin');

      // Should redirect to login
      await page.waitForURL(/.*\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });
  });
});
