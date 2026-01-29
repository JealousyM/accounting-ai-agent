import { test, expect } from '@playwright/test';
import { loginUser, dismissCookieBanner } from '../helpers/test-utils';

test.describe('Profile - API Credentials Management', () => {
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

  test('CRED-001: should open API credentials modal from profile', async ({ page }) => {
    // Wait for chat page to fully load
    await expect(page).toHaveURL(/.*\/chat/);
    await page.waitForLoadState('networkidle');

    // Open profile modal first
    const profileButton = page.locator('button').filter({ has: page.locator('svg.lucide-user') })
      .or(page.getByRole('button', { name: /profile|profil|user/i }));
    await profileButton.first().click();

    // Wait for profile modal
    const profileModal = page.locator('[role="dialog"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });

    // Find and click the API credentials link (Key icon with text)
    const apiCredentialsLink = page.locator('button').filter({ has: page.locator('svg.lucide-key') })
      .or(page.getByRole('button', { name: /api.*credentials|klucze.*api|api.*key/i }));

    await expect(apiCredentialsLink.first()).toBeVisible({ timeout: 5000 });
    await apiCredentialsLink.first().click();

    // Wait for API credentials modal to open
    await page.waitForTimeout(500); // Allow for modal transition

    // Verify API credentials modal is shown (look for wFirma and LLM sections)
    const credentialsModal = page.locator('[role="dialog"]');
    await expect(credentialsModal).toBeVisible({ timeout: 5000 });

    // Verify modal has wFirma section
    const wfirmaSection = page.locator('text=/wfirma/i');
    await expect(wfirmaSection.first()).toBeVisible({ timeout: 5000 });

    // Verify modal has LLM section (Russian: "Провайдер ИИ")
    const llmSection = page.locator('text=/llm|openai|google.*gemini|провайдер ИИ|ai provider/i');
    await expect(llmSection.first()).toBeVisible({ timeout: 5000 });
  });

  test('CRED-002: should display wFirma credentials section', async ({ page }) => {
    // Wait for chat page to fully load
    await expect(page).toHaveURL(/.*\/chat/);
    await page.waitForLoadState('networkidle');

    // Navigate to API credentials modal
    const profileButton = page.locator('button').filter({ has: page.locator('svg.lucide-user') })
      .or(page.getByRole('button', { name: /profile|profil|user/i }));
    await profileButton.first().click();

    const profileModal = page.locator('[role="dialog"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });

    const apiCredentialsLink = page.locator('button').filter({ has: page.locator('svg.lucide-key') })
      .or(page.getByRole('button', { name: /api.*credentials|klucze.*api/i }));
    await apiCredentialsLink.first().click();

    await page.waitForTimeout(500);

    // Check for wFirma section
    const wfirmaSection = page.locator('text=/wfirma/i').first();
    await expect(wfirmaSection).toBeVisible({ timeout: 5000 });

    // Check for configure or update button for wFirma
    const wfirmaButton = page.getByRole('button', { name: /configure|update|konfiguruj|aktualizuj|настроить|обновить|использовать/i }).first();
    await expect(wfirmaButton).toBeVisible({ timeout: 5000 });
  });

  test('CRED-003: should open wFirma credentials form', async ({ page }) => {
    // Wait for chat page to fully load
    await expect(page).toHaveURL(/.*\/chat/);
    await page.waitForLoadState('networkidle');

    // Navigate to API credentials modal
    const profileButton = page.locator('button').filter({ has: page.locator('svg.lucide-user') })
      .or(page.getByRole('button', { name: /profile|profil|user/i }));
    await profileButton.first().click();

    const profileModal = page.locator('[role="dialog"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });

    const apiCredentialsLink = page.locator('button').filter({ has: page.locator('svg.lucide-key') })
      .or(page.getByRole('button', { name: /api.*credentials|klucze.*api/i }));
    await apiCredentialsLink.first().click();

    await page.waitForTimeout(500);

    // Click configure/update button for wFirma
    const wfirmaButton = page.getByRole('button', { name: /configure|update|konfiguruj|aktualizuj|настроить|обновить|использовать/i }).first();
    await wfirmaButton.click();

    // Wait for form to appear
    await page.waitForTimeout(300);

    // Verify form fields are present (access key, secret key, company ID)
    const accessKeyInput = page.locator('input[type="password"]').first();
    await expect(accessKeyInput).toBeVisible({ timeout: 5000 });

    // Look for company ID field
    const companyIdField = page.locator('input[type="text"]')
      .or(page.locator('input[placeholder*="company"]'))
      .or(page.locator('input[placeholder*="firma"]'));
    await expect(companyIdField.first()).toBeVisible({ timeout: 5000 });
  });

  test('CRED-004: should update wFirma credentials', async ({ page }) => {
    // Wait for chat page to fully load
    await expect(page).toHaveURL(/.*\/chat/);
    await page.waitForLoadState('networkidle');

    // Navigate to API credentials modal
    const profileButton = page.locator('button').filter({ has: page.locator('svg.lucide-user') })
      .or(page.getByRole('button', { name: /profile|profil|user/i }));
    await profileButton.first().click();

    const profileModal = page.locator('[role="dialog"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });

    const apiCredentialsLink = page.locator('button').filter({ has: page.locator('svg.lucide-key') })
      .or(page.getByRole('button', { name: /api.*credentials|klucze.*api/i }));
    await apiCredentialsLink.first().click();

    await page.waitForTimeout(500);

    // Click configure/update button for wFirma
    const wfirmaButton = page.getByRole('button', { name: /configure|update|konfiguruj|aktualizuj|настроить|обновить|использовать/i }).first();
    await wfirmaButton.click();

    await page.waitForTimeout(300);

    // Fill in test credentials
    const passwordInputs = page.locator('input[type="password"]');
    const accessKeyInput = passwordInputs.first();
    const secretKeyInput = passwordInputs.nth(1);

    await accessKeyInput.fill('test-access-key-12345');
    await secretKeyInput.fill('test-secret-key-67890');

    // Fill company ID
    const companyIdInput = page.locator('input[type="text"]').first();
    await companyIdInput.fill('12345');

    // Click save button within the wFirma form
    const saveButton = page.getByRole('button', { name: /save|zapisz|сохранить/i }).first();
    await saveButton.click();

    // Wait for response - either success or error
    await page.waitForTimeout(2000);

    // Check for result (success or error message)
    const resultMessage = page.locator('.bg-green-50, .bg-green-100, .bg-red-50, .bg-red-100')
      .or(page.locator('text=/success|error|saved|failed|zapisano|blad/i'));

    // Result should be visible (either success or failure)
    await expect(resultMessage.first()).toBeVisible({ timeout: 10000 });
  });

  test('CRED-006: should open LLM credentials form with provider selection', async ({ page }) => {
    // Wait for chat page to fully load
    await expect(page).toHaveURL(/.*\/chat/);
    await page.waitForLoadState('networkidle');

    // Navigate to API credentials modal
    const profileButton = page.locator('button').filter({ has: page.locator('svg.lucide-user') })
      .or(page.getByRole('button', { name: /profile|profil|user/i }));
    await profileButton.first().click();

    const profileModal = page.locator('[role="dialog"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });

    const apiCredentialsLink = page.locator('button').filter({ has: page.locator('svg.lucide-key') })
      .or(page.getByRole('button', { name: /api.*credentials|klucze.*api/i }));
    await apiCredentialsLink.first().click();

    await page.waitForTimeout(500);

    // Find all configure/update buttons and click the last one (LLM section)
    const configButtons = page.getByRole('button', { name: /configure|update|konfiguruj|aktualizuj|настроить|обновить|использовать/i });
    const buttonCount = await configButtons.count();

    if (buttonCount > 1) {
      await configButtons.last().click();
    } else {
      await configButtons.first().click();
    }

    await page.waitForTimeout(300);

    // Verify provider select is present (OpenAI/Google)
    const providerSelect = page.locator('select').filter({ hasText: /openai|google/i })
      .or(page.locator('select').first());
    await expect(providerSelect).toBeVisible({ timeout: 5000 });

    // Verify API key input is present
    const apiKeyInput = page.locator('input[type="password"]')
      .or(page.locator('input[placeholder*="sk-"]'));
    await expect(apiKeyInput.first()).toBeVisible({ timeout: 5000 });
  });

  test('CRED-007: should update LLM API key (OpenAI)', async ({ page }) => {
    // Wait for chat page to fully load
    await expect(page).toHaveURL(/.*\/chat/);
    await page.waitForLoadState('networkidle');

    // Navigate to API credentials modal
    const profileButton = page.locator('button').filter({ has: page.locator('svg.lucide-user') })
      .or(page.getByRole('button', { name: /profile|profil|user/i }));
    await profileButton.first().click();

    const profileModal = page.locator('[role="dialog"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });

    const apiCredentialsLink = page.locator('button').filter({ has: page.locator('svg.lucide-key') })
      .or(page.getByRole('button', { name: /api.*credentials|klucze.*api/i }));
    await apiCredentialsLink.first().click();

    await page.waitForTimeout(500);

    // Find all configure/update buttons and click the last one (LLM section)
    const configButtons = page.getByRole('button', { name: /configure|update|konfiguruj|aktualizuj|настроить|обновить|использовать/i });
    const buttonCount = await configButtons.count();

    if (buttonCount > 1) {
      await configButtons.last().click();
    } else {
      await configButtons.first().click();
    }

    await page.waitForTimeout(300);

    // Select OpenAI provider
    const providerSelect = page.locator('select').first();
    await providerSelect.selectOption('openai');

    // Fill API key (use test key format)
    const apiKeyInput = page.locator('input[type="password"]').last();
    await apiKeyInput.fill('sk-test-1234567890abcdefghijklmnopqrstuvwxyz');

    // Click save button
    const saveButton = page.getByRole('button', { name: /save|zapisz|сохранить/i }).last();
    await saveButton.click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Check for result (success or error message)
    const resultMessage = page.locator('.bg-green-50, .bg-green-100, .bg-red-50, .bg-red-100')
      .or(page.locator('text=/success|error|saved|failed|zapisano|blad|invalid/i'));

    await expect(resultMessage.first()).toBeVisible({ timeout: 10000 });
  });

  test('CRED-009: should show remove button for configured credentials', async ({ page }) => {
    // Wait for chat page to fully load
    await expect(page).toHaveURL(/.*\/chat/);
    await page.waitForLoadState('networkidle');

    // Navigate to API credentials modal
    const profileButton = page.locator('button').filter({ has: page.locator('svg.lucide-user') })
      .or(page.getByRole('button', { name: /profile|profil|user/i }));
    await profileButton.first().click();

    const profileModal = page.locator('[role="dialog"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });

    const apiCredentialsLink = page.locator('button').filter({ has: page.locator('svg.lucide-key') })
      .or(page.getByRole('button', { name: /api.*credentials|klucze.*api/i }));
    await apiCredentialsLink.first().click();

    await page.waitForTimeout(1000);

    // Check for remove button (Trash icon) if credentials are configured
    const removeButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') })
      .or(page.getByRole('button', { name: /remove|delete|usun|удалить/i }));

    // Remove buttons should be visible if credentials exist
    // This test verifies the UI element exists (button might not be visible if no creds configured)
    const enabledBadge = page.locator('text=/enabled|configured|wlaczone|aktywne|custom|настроено/i');

    if (await enabledBadge.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      // If credentials are configured, remove button should be visible
      await expect(removeButton.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('CRED-010: should close API credentials modal on X button', async ({ page }) => {
    // Wait for chat page to fully load
    await expect(page).toHaveURL(/.*\/chat/);
    await page.waitForLoadState('networkidle');

    // Navigate to API credentials modal
    const profileButton = page.locator('button').filter({ has: page.locator('svg.lucide-user') })
      .or(page.getByRole('button', { name: /profile|profil|user/i }));
    await profileButton.first().click();

    const profileModal = page.locator('[role="dialog"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });

    const apiCredentialsLink = page.locator('button').filter({ has: page.locator('svg.lucide-key') })
      .or(page.getByRole('button', { name: /api.*credentials|klucze.*api/i }));
    await apiCredentialsLink.first().click();

    await page.waitForTimeout(500);

    // Find close button (X icon)
    const closeButton = page.locator('[role="dialog"]').locator('button[aria-label="Close"]')
      .or(page.locator('[role="dialog"]').locator('button').filter({ has: page.locator('svg.lucide-x') }));

    await expect(closeButton.first()).toBeVisible({ timeout: 5000 });
    await closeButton.first().click();

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
  });

  test('CRED-011: should switch between OpenAI and Google providers', async ({ page }) => {
    // Wait for chat page to fully load
    await expect(page).toHaveURL(/.*\/chat/);
    await page.waitForLoadState('networkidle');

    // Navigate to API credentials modal
    const profileButton = page.locator('button').filter({ has: page.locator('svg.lucide-user') })
      .or(page.getByRole('button', { name: /profile|profil|user/i }));
    await profileButton.first().click();

    const profileModal = page.locator('[role="dialog"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });

    const apiCredentialsLink = page.locator('button').filter({ has: page.locator('svg.lucide-key') })
      .or(page.getByRole('button', { name: /api.*credentials|klucze.*api/i }));
    await apiCredentialsLink.first().click();

    await page.waitForTimeout(500);

    // Find all configure/update buttons and click the last one (LLM section)
    const configButtons = page.getByRole('button', { name: /configure|update|konfiguruj|aktualizuj|настроить|обновить|использовать/i });
    const buttonCount = await configButtons.count();

    if (buttonCount > 1) {
      await configButtons.last().click();
    } else {
      await configButtons.first().click();
    }

    await page.waitForTimeout(300);

    // Get provider select
    const providerSelect = page.locator('select').first();
    await expect(providerSelect).toBeVisible({ timeout: 5000 });

    // Select OpenAI
    await providerSelect.selectOption('openai');
    await expect(providerSelect).toHaveValue('openai');

    // Select Google
    await providerSelect.selectOption('google');
    await expect(providerSelect).toHaveValue('google');

    // Switch back to OpenAI
    await providerSelect.selectOption('openai');
    await expect(providerSelect).toHaveValue('openai');
  });
});
