import { Page, expect } from '@playwright/test';

// Dismiss cookie consent banner if visible
export async function dismissCookieBanner(page: Page) {
  // Wait a bit for potential banner to appear
  await page.waitForTimeout(500);

  try {
    const cookieBanner = page.locator('[role="dialog"][aria-labelledby="cookie-banner-title"]');
    const acceptButton = page.getByRole('button', { name: /Accept All|Akceptuj wszystkie|Принять все/i });

    // Check if cookie banner is visible with a short timeout
    const bannerVisible = await cookieBanner.isVisible().catch(() => false);

    if (bannerVisible) {
      const buttonVisible = await acceptButton.isVisible().catch(() => false);
      if (buttonVisible) {
        // Use force click with short timeout to avoid hanging
        await acceptButton.click({ timeout: 2000 }).catch(() => {});
        // Wait for banner to disappear
        await cookieBanner.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
      }
    }
  } catch {
    // Ignore any errors - cookie banner dismissal is optional
  }
}

// Stripe test card numbers
export const STRIPE_TEST_CARDS = {
  valid: '4242424242424242',
  declined: '4000000000000002',
  expired: '4000000000000069',
  insufficientFunds: '4000000000009995',
} as const;

// Test user data generator
export function generateTestUser(plan: 'free' | 'pro' = 'free') {
  const timestamp = Date.now();
  return {
    email: `test-${timestamp}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    companyName: `Test Company ${timestamp}`,
    password: 'TestPassword123!',
    plan,
  };
}

// Fill registration form
export async function fillRegistrationForm(
  page: Page,
  user: ReturnType<typeof generateTestUser>,
  options: {
    selectProPlan?: boolean;
    billingPeriod?: 'monthly' | 'yearly';
    llmProvider?: 'openai' | 'google';
    llmApiKey?: string;
  } = {}
) {
  // Fill basic info
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="firstName"]').fill(user.firstName);
  await page.locator('input[name="lastName"]').fill(user.lastName);
  await page.locator('input[name="companyName"]').fill(user.companyName);

  // Select plan
  if (options.selectProPlan) {
    // Click on Pro plan label (the plan card, not the AI Provider label)
    await page.locator('label:has-text("Pro"):has-text("PLN")').first().click();

    // Select billing period if specified (buttons contain nested divs with text)
    if (options.billingPeriod === 'yearly') {
      await page.locator('button:has-text("Yearly"), button:has-text("Rocznie")').first().click();
    }
  } else {
    // Click on Free plan label (should be default, but click explicitly)
    await page.locator('label:has-text("Free")').first().click();

    // For Free plan, need to select LLM provider
    if (options.llmProvider) {
      await page.locator('select#llmProvider').selectOption(options.llmProvider);

      if (options.llmApiKey) {
        await page.locator('input#llmApiKey').fill(options.llmApiKey);
      }
    }
  }

  // Fill password
  await page.locator('input#password').fill(user.password);
  await page.locator('input#confirmPassword').fill(user.password);

  // Agree to terms
  await page.locator('input#agreeToTerms').check();
}

// Login helper
export async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to chat (increased timeout for slower environments / parallel workers)
  await page.waitForURL(/.*\/chat/, { timeout: 30000 });
}

// Logout helper
export async function logoutUser(page: Page) {
  // Click on profile/user menu
  const userMenu = page.locator('[data-testid="user-menu"]').or(page.getByRole('button', { name: /profile|logout|выход/i }));
  await userMenu.click();

  // Click logout
  await page.getByRole('button', { name: /logout|sign out|выход/i }).click();

  // Wait for redirect to login
  await page.waitForURL(/.*\/login/);
}

// Fill Stripe checkout form (for Stripe hosted checkout)
export async function fillStripeCheckout(
  page: Page,
  cardNumber: string,
  options: {
    expiry?: string;
    cvc?: string;
    country?: string;
    zip?: string;
  } = {}
) {
  const { expiry = '12/34', cvc = '123', country = 'Poland', zip = '00-001' } = options;

  // Wait for Stripe checkout to load
  await page.waitForURL(/.*checkout\.stripe\.com/);
  await page.waitForLoadState('networkidle');

  // Fill card details
  const cardFrame = page.frameLocator('iframe[name*="privateStripeFrame"]').first();

  // Card number
  await cardFrame.locator('[placeholder*="card number"]').fill(cardNumber);

  // Expiry
  await cardFrame.locator('[placeholder*="MM / YY"]').fill(expiry);

  // CVC
  await cardFrame.locator('[placeholder*="CVC"]').fill(cvc);

  // Country
  await page.locator('select[name="billingCountry"]').selectOption({ label: country });

  // ZIP/Postal code (if visible)
  const zipInput = page.locator('input[name="billingPostalCode"]');
  if (await zipInput.isVisible()) {
    await zipInput.fill(zip);
  }

  // Submit payment
  await page.getByRole('button', { name: /pay|subscribe|zapłać/i }).click();
}

// Wait for toast/notification
export async function waitForToast(page: Page, textPattern: RegExp | string) {
  const toast = page.locator('[role="alert"], [data-testid="toast"]');
  await expect(toast.filter({ hasText: textPattern })).toBeVisible({ timeout: 10000 });
}

// Check if user is logged in
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // Check for elements that indicate logged in state
    const chatUrl = page.url().includes('/chat');
    const userMenu = await page.locator('[data-testid="user-menu"]').isVisible();
    return chatUrl || userMenu;
  } catch {
    return false;
  }
}

// Set locale for tests
export async function setLocale(page: Page, locale: 'en' | 'pl' | 'ru') {
  // Click on locale button based on current page location
  const localeButton = page.getByRole('button', { name: new RegExp(locale, 'i') });
  if (await localeButton.isVisible()) {
    await localeButton.click();
  }
}

// Generate random string
export function randomString(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}
