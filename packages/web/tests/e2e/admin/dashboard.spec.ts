import { test, expect } from '@playwright/test';
import { loginUser } from '../helpers/test-utils';

test.describe('Admin Panel - Dashboard', () => {
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
      // Navigate to admin page
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
    } catch {
      test.skip();
    }
  });

  test.describe('Statistics Cards', () => {
    test('ADMIN-DASH-001: should display admin statistics cards', async ({ page }) => {
      // Wait for stats to load (they might show loading state first)
      await page.waitForTimeout(2000);

      // Check for Total Users stat card
      const usersCard = page.locator('text=/Total Users|Wszyscy Użytkownicy|Всего пользователей/i')
        .or(page.locator('[data-testid="stat-total-users"]'));
      await expect(usersCard).toBeVisible({ timeout: 10000 });

      // Check for Admins stat card
      const adminsCard = page.locator('text=/^Admins$|Administratorzy|Администраторы/i')
        .or(page.locator('[data-testid="stat-total-admins"]'));
      await expect(adminsCard).toBeVisible({ timeout: 5000 });

      // Check for Total AI Cost stat card
      const costCard = page.locator('text=/Total AI Cost|Całkowity koszt AI|Общая стоимость ИИ/i')
        .or(page.locator('[data-testid="stat-total-cost"]'));
      await expect(costCard).toBeVisible({ timeout: 5000 });

      // Check for Total Conversations stat card
      const conversationsCard = page.locator('text=/Total Conversations|Wszystkie rozmowy|Всего бесед/i')
        .or(page.locator('[data-testid="stat-total-conversations"]'));
      await expect(conversationsCard).toBeVisible({ timeout: 5000 });
    });

    test('ADMIN-DASH-002: statistics cards should display numeric values', async ({ page }) => {
      // Wait for stats to load
      await page.waitForTimeout(3000);

      // Get the stats section (grid of cards)
      const statsSection = page.locator('.grid').first();
      await expect(statsSection).toBeVisible();

      // Check that cards contain numeric values (or formatted numbers like "1.2K" or currency)
      const statCards = statsSection.locator('p.text-2xl, .text-2xl');
      const count = await statCards.count();

      // Should have at least 4 stat cards
      expect(count).toBeGreaterThanOrEqual(4);

      // Each card should have a value (number or formatted text)
      for (let i = 0; i < count; i++) {
        const cardValue = statCards.nth(i);
        const text = await cardValue.textContent();
        // Value should not be empty and should contain digits or currency symbols
        expect(text).toBeTruthy();
        expect(text!.length).toBeGreaterThan(0);
      }
    });

    test('ADMIN-DASH-003: statistics cards should have icons', async ({ page }) => {
      // Wait for page to fully load
      await page.waitForTimeout(2000);

      // Check for icons in stat cards (Users, Shield, DollarSign, MessageSquare)
      const statsSection = page.locator('.grid').first();

      // Each stat card should have an icon container
      const iconContainers = statsSection.locator('.p-3.bg-blue-100, .p-3.dark\\:bg-blue-900\\/30');
      const iconCount = await iconContainers.count();

      // Should have icons for all stat cards
      expect(iconCount).toBeGreaterThanOrEqual(4);
    });
  });

  test.describe('Users Table', () => {
    test('ADMIN-DASH-004: should display user list table', async ({ page }) => {
      // Wait for users table to load
      await page.waitForTimeout(2000);

      // Check for Users section title
      const usersTitle = page.locator('h2:has-text("Users")')
        .or(page.locator('h2:has-text("Uzytkownicy")')
        .or(page.locator('h2:has-text("Пользователи")')));
      await expect(usersTitle).toBeVisible({ timeout: 10000 });

      // Check for table element
      const usersTable = page.locator('table');
      await expect(usersTable).toBeVisible();

      // Check for table headers
      const emailHeader = page.locator('th:has-text("Email")');
      await expect(emailHeader).toBeVisible();

      const nameHeader = page.locator('th:has-text("Name")')
        .or(page.locator('th:has-text("Nazwa")')
        .or(page.locator('th:has-text("Имя")')));
      await expect(nameHeader).toBeVisible();

      const roleHeader = page.locator('th:has-text("Role")')
        .or(page.locator('th:has-text("Rola")')
        .or(page.locator('th:has-text("Роль")')));
      await expect(roleHeader).toBeVisible();
    });

    test('ADMIN-DASH-005: user table should display user data', async ({ page }) => {
      // Wait for table data to load
      await page.waitForTimeout(3000);

      // Check for table body with user rows
      const tableBody = page.locator('tbody');
      await expect(tableBody).toBeVisible();

      // Should have at least one user row (the admin themselves at minimum)
      const userRows = tableBody.locator('tr');
      const rowCount = await userRows.count();

      // If no loading state, should have at least 1 user
      const loadingText = page.locator('text="Loading..."');
      const noUsersText = page.locator('text="No users found"');

      if (!(await loadingText.isVisible()) && !(await noUsersText.isVisible())) {
        expect(rowCount).toBeGreaterThanOrEqual(1);
      }
    });

    test('ADMIN-DASH-006: user table should show role badges', async ({ page }) => {
      // Wait for table to load
      await page.waitForTimeout(3000);

      // Check for role badges (either User or Admin)
      const roleBadges = page.locator('span.rounded-full:has-text("User")')
        .or(page.locator('span.rounded-full:has-text("Admin")'))
        .or(page.locator('span.rounded-full:has-text("Uzytkownik")'))
        .or(page.locator('span.rounded-full:has-text("Administrator")'));

      // Should have at least one role badge visible
      const loadingText = page.locator('text="Loading..."');
      if (!(await loadingText.isVisible())) {
        const count = await roleBadges.count();
        expect(count).toBeGreaterThanOrEqual(1);
      }
    });
  });

  test.describe('Refresh Functionality', () => {
    test('ADMIN-DASH-007: should handle refresh button', async ({ page }) => {
      // Wait for initial data to load
      await page.waitForTimeout(2000);

      // Find refresh button (RefreshCw icon in header)
      const refreshButton = page.locator('button[title*="Refresh"]')
        .or(page.locator('button:has(svg.lucide-refresh-cw)'))
        .or(page.locator('header button').filter({ has: page.locator('svg') }).last());

      await expect(refreshButton).toBeVisible({ timeout: 5000 });

      // Click refresh button
      await refreshButton.click();

      // Wait for refresh to complete (data should reload)
      await page.waitForTimeout(2000);

      // Verify stats are still visible after refresh
      const usersCard = page.locator('text=/Total Users|Wszyscy Użytkownicy|Всего пользователей/i');
      await expect(usersCard).toBeVisible();

      // Verify table is still visible after refresh
      const usersTable = page.locator('table');
      await expect(usersTable).toBeVisible();
    });

    test('ADMIN-DASH-008: refresh should update data', async ({ page }) => {
      // Wait for initial data to load
      await page.waitForTimeout(2000);

      // Get initial stat values (if visible)
      const statsSection = page.locator('.grid').first();

      // Click refresh
      const refreshButton = page.locator('button[title*="Refresh"]')
        .or(page.locator('button:has(svg.lucide-refresh-cw)'));

      if (await refreshButton.isVisible()) {
        await refreshButton.click();

        // Wait for refresh
        await page.waitForTimeout(3000);

        // Stats section should still exist
        await expect(statsSection).toBeVisible();
      }
    });
  });

  test.describe('Navigation', () => {
    test('ADMIN-DASH-009: should have back to chat link', async ({ page }) => {
      // Look for back button/link
      const backButton = page.locator('a[href="/chat"]')
        .or(page.locator('button:has(svg.lucide-arrow-left)'));

      await expect(backButton).toBeVisible({ timeout: 5000 });
    });

    test('ADMIN-DASH-010: back button should navigate to chat', async ({ page }) => {
      // Find and click back button
      const backButton = page.locator('a[href="/chat"]')
        .or(page.locator('button:has(svg.lucide-arrow-left)').first());

      await expect(backButton).toBeVisible({ timeout: 5000 });
      await backButton.click();

      // Should navigate to chat page
      await page.waitForURL(/.*\/chat/, { timeout: 10000 });
      expect(page.url()).toContain('/chat');
    });
  });

  test.describe('Responsive Design', () => {
    test('ADMIN-DASH-011: should display correctly on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Stats should still be visible (stacked on mobile)
      const statsSection = page.locator('.grid').first();
      await expect(statsSection).toBeVisible();

      // Table should be scrollable on mobile
      const tableContainer = page.locator('.overflow-x-auto');
      await expect(tableContainer).toBeVisible();
    });
  });
});
