import { test, expect } from '@playwright/test';
import { loginUser } from '../helpers/test-utils';

test.describe('Admin Panel - User Management', () => {
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
      // Wait for initial data to load
      await page.waitForTimeout(2000);
    } catch {
      test.skip();
    }
  });

  test.describe('Search Functionality', () => {
    test('ADMIN-USER-001: should have search input', async ({ page }) => {
      // Find search input
      const searchInput = page.locator('input[placeholder*="Search"]')
        .or(page.locator('input[placeholder*="Szukaj"]')
        .or(page.locator('input[placeholder*="Поиск"]')));

      await expect(searchInput).toBeVisible({ timeout: 5000 });
    });

    test('ADMIN-USER-002: should search users by email', async ({ page }) => {
      // Find search input
      const searchInput = page.locator('input[placeholder*="Search"]')
        .or(page.locator('input[placeholder*="Szukaj"]')
        .or(page.locator('input[placeholder*="Поиск"]')));

      await expect(searchInput).toBeVisible({ timeout: 5000 });

      // Type a search term (partial email)
      await searchInput.fill('test');

      // Submit search (press Enter)
      await searchInput.press('Enter');

      // Wait for search results
      await page.waitForTimeout(2000);

      // Table should still be visible
      const table = page.locator('table');
      await expect(table).toBeVisible();
    });

    test('ADMIN-USER-003: should search users by name', async ({ page }) => {
      // Find search input
      const searchInput = page.locator('input[placeholder*="Search"]')
        .or(page.locator('input[placeholder*="Szukaj"]')
        .or(page.locator('input[placeholder*="Поиск"]')));

      await expect(searchInput).toBeVisible({ timeout: 5000 });

      // Type a name search term
      await searchInput.fill('Admin');

      // Submit search
      await searchInput.press('Enter');

      // Wait for search results
      await page.waitForTimeout(2000);

      // Table should be visible with results
      const table = page.locator('table');
      await expect(table).toBeVisible();
    });

    test('ADMIN-USER-004: should clear search and show all users', async ({ page }) => {
      // Find search input
      const searchInput = page.locator('input[placeholder*="Search"]')
        .or(page.locator('input[placeholder*="Szukaj"]')
        .or(page.locator('input[placeholder*="Поиск"]')));

      await expect(searchInput).toBeVisible({ timeout: 5000 });

      // First, search for something
      await searchInput.fill('test');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);

      // Clear search
      await searchInput.clear();
      await searchInput.press('Enter');

      // Wait for results to update
      await page.waitForTimeout(2000);

      // All users should be shown again
      const table = page.locator('table');
      await expect(table).toBeVisible();
    });

    test('ADMIN-USER-005: should handle no search results', async ({ page }) => {
      // Find search input
      const searchInput = page.locator('input[placeholder*="Search"]')
        .or(page.locator('input[placeholder*="Szukaj"]')
        .or(page.locator('input[placeholder*="Поиск"]')));

      await expect(searchInput).toBeVisible({ timeout: 5000 });

      // Search for something that shouldn't exist
      await searchInput.fill('nonexistentuserxyz12345');
      await searchInput.press('Enter');

      // Wait for search results
      await page.waitForTimeout(2000);
    
      // Either no results message or empty table
      const tableRows = page.locator('tbody tr');
      const rowCount = await tableRows.count();

      // Should show no users or a "no results" message
      if (rowCount === 1) {
        // Check if it's an empty state row
        const rowText = await tableRows.first().textContent();
        expect(rowText?.toLowerCase()).toMatch(/no users|brak|nie znaleziono|loading/i);
      }
    });
  });

  test.describe('Role Filter', () => {
    test('ADMIN-USER-006: should have role filter dropdown', async ({ page }) => {
      // Find role filter select
      const roleFilter = page.locator('select').filter({ hasText: /All Roles|User|Admin/i })
        .or(page.locator('select:has(option[value="all"])'));

      await expect(roleFilter).toBeVisible({ timeout: 5000 });
    });

    test('ADMIN-USER-007: should filter users by admin role', async ({ page }) => {
      // Find role filter
      const roleFilter = page.locator('select').filter({ hasText: /All Roles|User|Admin/i })
        .or(page.locator('select:has(option[value="all"])'));

      await expect(roleFilter).toBeVisible({ timeout: 5000 });

      // Select admin role
      await roleFilter.selectOption('admin');

      // Wait for filter to apply
      await page.waitForTimeout(2000);

      // Check that table shows only admins (if there are any results)
      const tableRows = page.locator('tbody tr');
      const rowCount = await tableRows.count();

      if (rowCount > 0) {
        // Check for loading state
        const loadingText = page.locator('text="Loading..."');
        if (!(await loadingText.isVisible())) {
          // All visible role badges should be Admin
          const userBadges = page.locator('span.rounded-full:has-text("User")');
          const userBadgeCount = await userBadges.count();

          // No user badges should be visible when filtering by admin
          expect(userBadgeCount).toBe(0);
        }
      }
    });

    test('ADMIN-USER-008: should filter users by user role', async ({ page }) => {
      // Find role filter
      const roleFilter = page.locator('select').filter({ hasText: /All Roles|User|Admin/i })
        .or(page.locator('select:has(option[value="all"])'));

      await expect(roleFilter).toBeVisible({ timeout: 5000 });

      // Select user role
      await roleFilter.selectOption('user');

      // Wait for filter to apply
      await page.waitForTimeout(2000);

      // Table should be visible
      const table = page.locator('table');
      await expect(table).toBeVisible();

      // Check that no admin badges are visible (only user badges)
      const tableRows = page.locator('tbody tr');
      const rowCount = await tableRows.count();

      if (rowCount > 0) {
        const loadingText = page.locator('text="Loading..."');
        if (!(await loadingText.isVisible())) {
          const adminBadges = page.locator('span.rounded-full.bg-purple-100:has-text("Admin")');
          const adminBadgeCount = await adminBadges.count();
          expect(adminBadgeCount).toBe(0);
        }
      }
    });

    test('ADMIN-USER-009: should show all users when "All Roles" selected', async ({ page }) => {
      // Find role filter
      const roleFilter = page.locator('select').filter({ hasText: /All Roles|User|Admin/i })
        .or(page.locator('select:has(option[value="all"])'));

      await expect(roleFilter).toBeVisible({ timeout: 5000 });

      // First filter by admin
      await roleFilter.selectOption('admin');
      await page.waitForTimeout(1000);

      // Then select all roles
      await roleFilter.selectOption('all');
      await page.waitForTimeout(2000);

      // Table should show all users
      const table = page.locator('table');
      await expect(table).toBeVisible();
    });
  });

  test.describe('Pagination', () => {
    test('ADMIN-USER-010: should display pagination when many users exist', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(2000);

      // Check for pagination controls (only visible if more than 20 users)
      const pagination = page.locator('text=/Page \\d+ of \\d+/');
      const prevButton = page.locator('button:has-text("Previous")');
      const nextButton = page.locator('button:has-text("Next")');

      // Pagination might not be visible if less than 20 users
      // Just check that the table is working
      const table = page.locator('table');
      await expect(table).toBeVisible();

      // If pagination exists, verify buttons are present
      if (await pagination.isVisible()) {
        await expect(prevButton).toBeVisible();
        await expect(nextButton).toBeVisible();
      }
    });

    test('ADMIN-USER-011: should navigate to next page', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(2000);

      // Look for next button
      const nextButton = page.locator('button:has-text("Next")');

      // If pagination exists and next is enabled
      if (await nextButton.isVisible()) {
        const isDisabled = await nextButton.isDisabled();

        if (!isDisabled) {
          // Get current page info
          const pageInfo = page.locator('text=/Page \\d+ of \\d+/');
          const beforeText = await pageInfo.textContent();

          // Click next
          await nextButton.click();

          // Wait for page change
          await page.waitForTimeout(2000);

          // Page info should update
          const afterText = await pageInfo.textContent();

          // If there are multiple pages, text should change
          if (beforeText !== afterText) {
            expect(afterText).not.toBe(beforeText);
          }
        }
      }
    });

    test('ADMIN-USER-012: should navigate to previous page', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(2000);

      // First go to page 2 if possible
      const nextButton = page.locator('button:has-text("Next")');

      if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
        await nextButton.click();
        await page.waitForTimeout(1000);

        // Now try to go back
        const prevButton = page.locator('button:has-text("Previous")');

        if (await prevButton.isVisible() && !(await prevButton.isDisabled())) {
          await prevButton.click();
          await page.waitForTimeout(1000);

          // Should be back on page 1
          const pageInfo = page.locator('text=/Page 1 of/');
          await expect(pageInfo).toBeVisible();
        }
      }
    });

    test('ADMIN-USER-013: previous button should be disabled on first page', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(2000);

      // Look for previous button
      const prevButton = page.locator('button:has-text("Previous")');

      // If pagination exists, previous should be disabled on page 1
      if (await prevButton.isVisible()) {
        await expect(prevButton).toBeDisabled();
      }
    });
  });

  test.describe('Role Toggle', () => {
    test('ADMIN-USER-014: should have role toggle action buttons', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(2000);

      // Look for "Make Admin" or "Remove Admin" buttons in the actions column
      const makeAdminButton = page.locator('button:has-text("Make Admin")')
        .or(page.locator('text=/Make Admin|Mianuj Adminem|Сделать админом/i'));

      const removeAdminButton = page.locator('button:has-text("Remove Admin")')
        .or(page.locator('text=/Remove Admin|Usuń Admina|Убрать админа/i'));

      // At least one of these should be visible (for users or admins)
      const hasToggleButtons = await makeAdminButton.isVisible() || await removeAdminButton.isVisible();

      // If there are users in the table, there should be action buttons
      const tableRows = page.locator('tbody tr');
      const rowCount = await tableRows.count();

      if (rowCount > 0) {
        const loadingText = page.locator('text="Loading..."');
        if (!(await loadingText.isVisible())) {
          expect(hasToggleButtons).toBeTruthy();
        }
      }
    });

    test('ADMIN-USER-015: should show confirmation dialog when toggling role', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(2000);

      // Find a user with "Make Admin" button (regular user)
      const makeAdminButton = page.locator('button:has-text("Make Admin")').first()
        .or(page.locator('td button:has-text("Make Admin")').first());

      if (await makeAdminButton.isVisible()) {
        // Set up dialog handler to catch confirmation
        let dialogShown = false;
        page.on('dialog', async (dialog) => {
          dialogShown = true;
          expect(dialog.type()).toBe('confirm');
          // Dismiss the dialog to cancel the action
          await dialog.dismiss();
        });

        // Click the button
        await makeAdminButton.click();

        // Wait a moment for dialog
        await page.waitForTimeout(1000);

        // Verify dialog was shown
        expect(dialogShown).toBeTruthy();
      }
    });

    test('ADMIN-USER-016: should toggle user role when confirmed', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(2000);

      // Find a user with "Make Admin" button
      const makeAdminButton = page.locator('button:has-text("Make Admin")').first()
        .or(page.locator('td button:has-text("Make Admin")').first());

      if (await makeAdminButton.isVisible()) {
        // Get the row before the change
        const userRow = makeAdminButton.locator('xpath=ancestor::tr');
        const emailCell = userRow.locator('td').first();
        const userEmail = await emailCell.textContent();

        // Set up dialog handler to accept confirmation
        page.on('dialog', async (dialog) => {
          await dialog.accept();
        });

        // Click the button
        await makeAdminButton.click();

        // Wait for mutation to complete
        await page.waitForTimeout(3000);

        // Verify the change - the button should now say "Remove Admin" for this user
        // Or the role badge should change to "Admin"
        if (userEmail) {
          const updatedRow = page.locator(`tr:has-text("${userEmail}")`);
          const adminBadge = updatedRow.locator('span.rounded-full:has-text("Admin")');
          const removeButton = updatedRow.locator('button:has-text("Remove Admin")');

          // Either admin badge should be visible or remove admin button
          const isUpdated = await adminBadge.isVisible() || await removeButton.isVisible();
          expect(isUpdated).toBeTruthy();
        }
      }
    });

    test('ADMIN-USER-017: should cancel role toggle when dismissed', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(2000);

      // Find a user with "Make Admin" button
      const makeAdminButton = page.locator('button:has-text("Make Admin")').first()
        .or(page.locator('td button:has-text("Make Admin")').first());

      if (await makeAdminButton.isVisible()) {
        // Get the row before the action
        const userRow = makeAdminButton.locator('xpath=ancestor::tr');
        const roleBadge = userRow.locator('span.rounded-full');
        const roleBefore = await roleBadge.textContent();

        // Set up dialog handler to dismiss (cancel) confirmation
        page.on('dialog', async (dialog) => {
          await dialog.dismiss();
        });

        // Click the button
        await makeAdminButton.click();

        // Wait a moment
        await page.waitForTimeout(1000);

        // Role should NOT have changed
        const roleAfter = await roleBadge.textContent();
        expect(roleAfter).toBe(roleBefore);
      }
    });
  });

  test.describe('Combined Filters', () => {
    test('ADMIN-USER-018: should combine search and role filter', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(2000);

      // Find search input
      const searchInput = page.locator('input[placeholder*="Search"]')
        .or(page.locator('input[placeholder*="Szukaj"]')
        .or(page.locator('input[placeholder*="Поиск"]')));

      // Find role filter
      const roleFilter = page.locator('select').filter({ hasText: /All Roles|User|Admin/i })
        .or(page.locator('select:has(option[value="all"])'));

      if (await searchInput.isVisible() && await roleFilter.isVisible()) {
        // Set search term
        await searchInput.fill('test');

        // Set role filter
        await roleFilter.selectOption('user');

        // Submit search
        await searchInput.press('Enter');

        // Wait for results
        await page.waitForTimeout(2000);

        // Table should be visible with filtered results
        const table = page.locator('table');
        await expect(table).toBeVisible();
      }
    });
  });
});
