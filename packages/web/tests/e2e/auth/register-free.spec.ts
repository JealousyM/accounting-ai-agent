import { test, expect } from '@playwright/test';
import { generateTestUser, fillRegistrationForm, dismissCookieBanner } from '../helpers/test-utils';

test.describe('Registration - Free Plan', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    // Dismiss cookie banner if visible (it can block clicks)
    await dismissCookieBanner(page);
  });

  test('REG-001: should display registration form correctly', async ({ page }) => {
    // Check form elements are visible
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="companyName"]')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('input#confirmPassword')).toBeVisible();
    await expect(page.locator('input#agreeToTerms')).toBeVisible();

    // Check plan selection is visible (use more specific selectors to avoid matching other "Pro" text)
    await expect(page.locator('label:has-text("Free")')).toBeVisible();
    await expect(page.locator('label:has-text("Pro"):has-text("PLN")').first()).toBeVisible();

    // Check Google OAuth button
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
  });

  test('REG-002: should register with Free plan and valid LLM key', async ({ page }) => {
    const user = generateTestUser('free');

    // Fill form with Free plan and OpenAI provider
    await fillRegistrationForm(page, user, {
      selectProPlan: false,
      llmProvider: 'openai',
      llmApiKey: 'sk-test-key-for-testing-purposes-only',
    });

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for success message or redirect
    // Note: This test may need a real API key to fully pass
    await Promise.race([
      page.waitForURL(/.*\/chat/, { timeout: 20000 }),
      expect(page.locator('text=/success|успешно|pomyślnie/i')).toBeVisible({ timeout: 20000 }),
    ]);
  });

  test('REG-006: should show error for weak password', async ({ page }) => {
    const user = generateTestUser('free');

    // Fill basic info
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="firstName"]').fill(user.firstName);
    await page.locator('input[name="lastName"]').fill(user.lastName);
    await page.locator('input[name="companyName"]').fill(user.companyName);

    // Fill weak password
    await page.locator('input#password').fill('weak');
    await page.locator('input#password').blur();

    // Check password requirements show unmet criteria
    const requirementsBox = page.locator('text=/password requirements|wymagania/i').locator('..');
    await expect(requirementsBox).toBeVisible();

    // Check that some requirements are not met (red indicators)
    const unmetRequirements = page.locator('.bg-gray-300, .bg-gray-600');
    expect(await unmetRequirements.count()).toBeGreaterThan(0);
  });

  test('REG-007: should show error for existing email', async ({ page }) => {
    // This test assumes there's already a user with a known email
    const existingEmail = 'existing@example.com';

    await page.locator('input[name="email"]').fill(existingEmail);
    await page.locator('input[name="firstName"]').fill('Test');
    await page.locator('input[name="lastName"]').fill('User');
    await page.locator('input[name="companyName"]').fill('Test Company');

    // Select Free plan with provider
    await page.locator('select#llmProvider').selectOption('openai');
    await page.locator('input#llmApiKey').fill('sk-test-key');

    // Fill password
    await page.locator('input#password').fill('TestPassword123!');
    await page.locator('input#confirmPassword').fill('TestPassword123!');

    // Agree to terms
    await page.locator('input#agreeToTerms').check();

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for error message about existing email
    await expect(page.locator('text=/already registered|już zarejestrowany|уже зарегистрирован/i')).toBeVisible({
      timeout: 15000,
    });
  });

  test('should show password mismatch error', async ({ page }) => {
    await page.locator('input#password').fill('TestPassword123!');
    await page.locator('input#confirmPassword').fill('DifferentPassword123!');
    await page.locator('input#confirmPassword').blur();

    // Check for mismatch error
    await expect(page.locator('text=/passwords do not match|hasła nie są zgodne|пароли не совпадают/i')).toBeVisible();
  });

  test('should require LLM provider for Free plan', async ({ page }) => {
    const user = generateTestUser('free');

    // Fill basic info but skip LLM provider
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="firstName"]').fill(user.firstName);
    await page.locator('input[name="lastName"]').fill(user.lastName);
    await page.locator('input[name="companyName"]').fill(user.companyName);
    await page.locator('input#password').fill(user.password);
    await page.locator('input#confirmPassword').fill(user.password);
    await page.locator('input#agreeToTerms').check();

    // LLM provider dropdown should be visible and required
    await expect(page.locator('select#llmProvider')).toBeVisible();

    // Try to submit without selecting provider
    await page.locator('button[type="submit"]').click();

    // Should show validation error or not submit
    const url = page.url();
    expect(url).toContain('/register'); // Should stay on register page
  });

  test('should switch language between EN and PL', async ({ page }) => {
    // Check default language
    await expect(page.getByRole('button', { name: /English/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Polski/i })).toBeVisible();

    // Switch to Polish
    await page.getByRole('button', { name: /Polski/i }).click();

    // Check Polish text appears (use heading to avoid matching button)
    await expect(page.getByRole('heading', { name: /Utwórz konto|Zarejestruj/i })).toBeVisible();

    // Switch back to English
    await page.getByRole('button', { name: /English/i }).click();

    // Check English text appears (use heading to avoid matching button)
    await expect(page.getByRole('heading', { name: /Create.*account|Sign up/i })).toBeVisible();
  });

  test('should open Terms of Service modal', async ({ page }) => {
    // Dismiss cookie banner first if visible
    await dismissCookieBanner(page);

    // Click on Terms of Service link
    await page.getByRole('button', { name: /terms of service|regulamin/i }).click();

    // Check modal is visible (exclude cookie banner by checking for aria-modal="true")
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toBeVisible();
    await expect(page.locator('text=/terms|regulamin|условия/i').first()).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).not.toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    // Dismiss cookie banner first if visible (it can block clicks)
    await dismissCookieBanner(page);

    // Click on sign in link - actual text may be "Sign in" or "Login" or "Zaloguj się"
    const signInLink = page.getByRole('link', { name: /sign in|login|zaloguj|войти/i });
    await expect(signInLink).toBeVisible({ timeout: 5000 });
    await signInLink.click();

    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/login/, { timeout: 15000 });
  });
});
