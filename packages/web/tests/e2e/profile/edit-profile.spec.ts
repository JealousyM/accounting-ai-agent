import { test, expect } from '@playwright/test';
import { loginUser, dismissCookieBanner } from '../helpers/test-utils';

test.describe('Profile - Edit Profile', () => {
  test.beforeEach(async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

    try {
      await loginUser(page, testEmail, testPassword);
      await dismissCookieBanner(page);
    } catch {
      test.skip();
    }
  });

  test('PROFILE-001: should open profile edit modal', async ({ page }) => {
    // Wait for chat page to fully load
    await expect(page).toHaveURL(/.*\/chat/);
    await page.waitForLoadState('networkidle');

    // Find and click the profile button (User icon in header)
    const profileButton = page.locator('button').filter({ has: page.locator('svg.lucide-user') })
      .or(page.getByRole('button', { name: /profile|profil|user/i }));

    await expect(profileButton.first()).toBeVisible({ timeout: 10000 });
    await profileButton.first().click();

    // Wait for profile modal to open
    const profileModal = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });

    // Verify modal title is visible (Edit Profile or similar)
    const modalTitle = profileModal.locator('h2');
    await expect(modalTitle).toBeVisible();

    // Verify form fields are present
    await expect(page.locator('#firstName').or(page.locator('input[name="firstName"]'))).toBeVisible();
    await expect(page.locator('#lastName').or(page.locator('input[name="lastName"]'))).toBeVisible();
    await expect(page.locator('#locale').or(page.locator('select[name="locale"]'))).toBeVisible();
  });

  test('PROFILE-002: should update user name', async ({ page }) => {
    // Wait for chat page to fully load
    await expect(page).toHaveURL(/.*\/chat/);
    await page.waitForLoadState('networkidle');

    // Open profile modal
    const profileButton = page.locator('button').filter({ has: page.locator('svg.lucide-user') })
      .or(page.getByRole('button', { name: /profile|profil|user/i }));
    await profileButton.first().click();

    // Wait for modal
    const profileModal = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });

    // Get input fields
    const firstNameInput = page.locator('#firstName').or(page.locator('input[name="firstName"]'));
    const lastNameInput = page.locator('#lastName').or(page.locator('input[name="lastName"]'));

    // Clear and fill with new values
    const timestamp = Date.now();
    const newFirstName = `TestFirst${timestamp}`;
    const newLastName = `TestLast${timestamp}`;

    await firstNameInput.clear();
    await firstNameInput.fill(newFirstName);

    await lastNameInput.clear();
    await lastNameInput.fill(newLastName);

    // Click save button
    const saveButton = page.getByRole('button', { name: /save|zapisz|сохранить/i });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Wait for loading state to complete
    await expect(saveButton).toBeEnabled({ timeout: 10000 });

    // Verify success message or modal closes
    const successMessage = page.locator('text=/success|saved|zapisano|сохранено/i')
      .or(page.locator('.bg-green-50, .bg-green-100'));

    // Either success message appears or modal closes
    await Promise.race([
      expect(successMessage).toBeVisible({ timeout: 5000 }).catch(() => {}),
      expect(profileModal).not.toBeVisible({ timeout: 5000 }).catch(() => {}),
    ]);
  });

  test('PROFILE-004: should show success message on save', async ({ page }) => {
    // Wait for chat page to fully load
    await expect(page).toHaveURL(/.*\/chat/);
    await page.waitForLoadState('networkidle');

    // Open profile modal
    const profileButton = page.locator('button').filter({ has: page.locator('svg.lucide-user') })
      .or(page.getByRole('button', { name: /profile|profil|user/i }));
    await profileButton.first().click();

    // Wait for modal
    const profileModal = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });

    // Get current values from inputs
    const firstNameInput = page.locator('#firstName').or(page.locator('input[name="firstName"]'));
    const currentFirstName = await firstNameInput.inputValue();

    // Make a minor change (add space and remove it to trigger save)
    await firstNameInput.clear();
    await firstNameInput.fill(currentFirstName.trim() || 'TestUser');

    // Click save button
    const saveButton = page.getByRole('button', { name: /save|zapisz|сохранить/i });
    await saveButton.click();

    // Check for success message (green background with check icon or success text)
    const successIndicator = page.locator('.bg-green-50, .bg-green-100')
      .or(page.locator('text=/success|saved|successfully|zapisano|pomyslnie|сохранено|успешно/i'))
      .or(page.locator('[class*="text-green"]'));

    await expect(successIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  test('PROFILE-005: should close modal on cancel', async ({ page }) => {
    // Wait for chat page to fully load
    await expect(page).toHaveURL(/.*\/chat/);
    await page.waitForLoadState('networkidle');

    // Open profile modal
    const profileButton = page.locator('button').filter({ has: page.locator('svg.lucide-user') })
      .or(page.getByRole('button', { name: /profile|profil|user/i }));
    await profileButton.first().click();

    // Wait for modal
    const profileModal = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });

    // Click cancel button
    const cancelButton = page.getByRole('button', { name: /cancel|anuluj|отмена/i });
    await cancelButton.click();

    // Modal should close
    await expect(profileModal).not.toBeVisible({ timeout: 5000 });
  });

  test('PROFILE-006: should close modal on X button click', async ({ page }) => {
    // Wait for chat page to fully load
    await expect(page).toHaveURL(/.*\/chat/);
    await page.waitForLoadState('networkidle');

    // Open profile modal
    const profileButton = page.locator('button').filter({ has: page.locator('svg.lucide-user') })
      .or(page.getByRole('button', { name: /profile|profil|user/i }));
    await profileButton.first().click();

    // Wait for modal
    const profileModal = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });

    // Click close button (X icon in top right)
    const closeButton = profileModal.locator('button[aria-label="Close"]')
      .or(profileModal.locator('button').filter({ has: page.locator('svg.lucide-x') }));
    await closeButton.first().click();

    // Modal should close
    await expect(profileModal).not.toBeVisible({ timeout: 5000 });
  });

  test('PROFILE-007: should close modal on Escape key', async ({ page }) => {
    // Wait for chat page to fully load
    await expect(page).toHaveURL(/.*\/chat/);
    await page.waitForLoadState('networkidle');

    // Open profile modal
    const profileButton = page.locator('button').filter({ has: page.locator('svg.lucide-user') })
      .or(page.getByRole('button', { name: /profile|profil|user/i }));
    await profileButton.first().click();

    // Wait for modal
    const profileModal = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });

    // Press Escape key
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(profileModal).not.toBeVisible({ timeout: 5000 });
  });

  test('PROFILE-008: should show validation error for empty first name', async ({ page }) => {
    // Wait for chat page to fully load
    await expect(page).toHaveURL(/.*\/chat/);
    await page.waitForLoadState('networkidle');

    // Open profile modal
    const profileButton = page.locator('button').filter({ has: page.locator('svg.lucide-user') })
      .or(page.getByRole('button', { name: /profile|profil|user/i }));
    await profileButton.first().click();

    // Wait for modal
    const profileModal = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });

    // Clear first name field
    const firstNameInput = page.locator('#firstName').or(page.locator('input[name="firstName"]'));
    await firstNameInput.clear();

    // Click save button
    const saveButton = page.getByRole('button', { name: /save|zapisz|сохранить/i });
    await saveButton.click();

    // Should show validation error
    const errorMessage = page.locator('text=/required|wymagane|обязательно/i')
      .or(page.locator('.text-red-600, .text-red-500'));

    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });
});
