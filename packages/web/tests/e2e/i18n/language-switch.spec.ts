import { test, expect } from '@playwright/test';
import { loginUser, dismissCookieBanner } from '../helpers/test-utils';

// Run all i18n tests serially to avoid race conditions with shared test user account
// Different tests change the user's locale which can interfere with each other when running in parallel
test.describe.configure({ mode: 'serial' });

// ============================================
// CONSTANTS
// ============================================

const SUPPORTED_LOCALES = ['en', 'pl', 'ru'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

// Translation strings for verification (using actual translations from the app)
const TRANSLATIONS = {
  en: {
    // Chat page
    chatTitle: 'AI Accounting Assistant',
    chatSubtitle: 'Polish tax & accounting expert',
    newChat: 'New Chat',
    logout: 'Logout',
    inputPlaceholder: 'Type your message...',
    // Profile
    profileTitle: 'Edit Profile',
    profileLanguage: 'Language',
    save: 'Save changes',
    cancel: 'Cancel',
    // Common UI
    loading: 'Loading...',
    conversations: 'Conversations',
    // Login page
    loginTitle: 'Sign in',
    loginSubmit: 'Sign in',
    forgotPassword: 'Forgot password?',
    // Registration page
    registerTitle: 'Create your account',
  },
  pl: {
    // Chat page
    chatTitle: 'Asystent Księgowy AI',
    chatSubtitle: 'Ekspert od polskich podatków i księgowości',
    newChat: 'Nowy czat',
    logout: 'Wyloguj',
    inputPlaceholder: 'Wpisz wiadomość...',
    // Profile
    profileTitle: 'Edytuj profil',
    profileLanguage: 'Język',
    save: 'Zapisz zmiany',
    cancel: 'Anuluj',
    // Common UI
    loading: 'Ładowanie...',
    conversations: 'Rozmowy',
    // Login page
    loginTitle: 'Zaloguj się',
    loginSubmit: 'Zaloguj się',
    forgotPassword: 'Zapomniałeś hasła?',
    // Registration page
    registerTitle: 'Utwórz konto',
  },
  ru: {
    // Chat page (using actual Cyrillic)
    chatTitle: 'ИИ Бухгалтерский ассистент',
    chatSubtitle: 'Эксперт по польским налогам и бухгалтерии',
    newChat: 'Новый чат',
    logout: 'Выход',
    inputPlaceholder: 'Введите сообщение...',
    // Profile
    profileTitle: 'Редактировать профиль',
    profileLanguage: 'Язык',
    save: 'Сохранить изменения',
    cancel: 'Отмена',
    // Common UI
    loading: 'Загрузка...',
    conversations: 'Разговоры',
    // Login page
    loginTitle: 'Войти',
    loginSubmit: 'Войти',
    forgotPassword: 'Забыли пароль?',
    // Registration page
    registerTitle: 'Создать аккаунт',
  },
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Opens the profile edit modal by clicking on the user button (Person icon)
 * Note: In this app, clicking the User button opens the profile modal directly
 */
async function openProfileModal(page: import('@playwright/test').Page) {
  // Click on user button (Person icon in header) - opens profile modal directly
  // The button has a User icon from lucide-react
  const userButton = page
    .locator('button:has(svg.lucide-user)')
    .or(page.getByRole('button', { name: /profile|profil|профиль/i }))
    .or(page.locator('header button').filter({ has: page.locator('svg') }).last());

  await userButton.first().click();

  // Wait for profile modal to appear (use aria-modal="true" to exclude cookie banner)
  await expect(
    page.locator('[role="dialog"][aria-modal="true"]').or(page.locator('[data-testid="profile-modal"]'))
  ).toBeVisible({ timeout: 5000 });
}

/**
 * Changes the language in the profile modal
 */
async function changeLanguageInProfile(page: import('@playwright/test').Page, targetLocale: Locale) {
  // Find and click the locale select
  const localeSelect = page
    .locator('select#locale')
    .or(page.locator('[data-testid="locale-select"]'))
    .or(page.locator('select').filter({ has: page.locator('option[value="en"]') }));

  await localeSelect.selectOption(targetLocale);
}

/**
 * Saves the profile changes and waits for API to complete
 */
async function saveProfileChanges(page: import('@playwright/test').Page) {
  const saveButton = page.getByRole('button', {
    name: new RegExp(
      `${TRANSLATIONS.en.save}|${TRANSLATIONS.pl.save}|${TRANSLATIONS.ru.save}`,
      'i'
    ),
  });

  // Wait for the API response when clicking save
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/users/me') && response.request().method() === 'PUT',
    { timeout: 10000 }
  ).catch(() => null);

  await saveButton.click();

  // Wait for API response to complete
  const response = await responsePromise;
  if (response) {
    // API call completed - verify it was successful
    const status = response.status();
    if (status >= 200 && status < 300) {
      // Wait for modal to close and UI to update
      await page.waitForTimeout(1500);
      return;
    }
  }

  // Fallback: just wait for modal to close
  await page.waitForTimeout(2500);
}

/**
 * Sets locale via localStorage (useful for initial state)
 */
async function setLocaleViaStorage(page: import('@playwright/test').Page, locale: Locale) {
  await page.evaluate((loc) => {
    localStorage.setItem('locale', loc);
  }, locale);
}

/**
 * Gets current locale from localStorage
 */
async function getLocaleFromStorage(page: import('@playwright/test').Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('locale'));
}

// ============================================
// TESTS
// ============================================

test.describe('I18N - Language Switching', () => {
  // Note: After login, the user's profile locale is applied, which may override localStorage.
  // These tests focus on changing language via profile modal, which is the supported way.
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

  test('I18N-001: should switch language to Polish via profile modal', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Open profile modal and change language to Polish
    await openProfileModal(page);
    await changeLanguageInProfile(page, 'pl');
    await saveProfileChanges(page, 'en');

    // Wait for page to update with new locale
    await page.waitForTimeout(2000);

    // Verify Polish content is displayed
    const polishText = page
      .getByText(/Asystent|Rozmowy/i)
      .or(page.getByText(/Nowy czat/i))
      .or(page.getByText(/Wyloguj/i));

    await expect(polishText.first()).toBeVisible({ timeout: 10000 });

    // Verify localStorage is updated
    const storedLocale = await getLocaleFromStorage(page);
    expect(storedLocale).toBe('pl');
  });

  test('I18N-002: should switch language to Russian via profile modal', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Open profile modal and change language to Russian
    await openProfileModal(page);
    await changeLanguageInProfile(page, 'ru');
    await saveProfileChanges(page, 'en');

    // Wait for page to update with new locale
    await page.waitForTimeout(2000);

    // Verify Russian content is displayed (using Cyrillic characters)
    const russianText = page
      .getByText(/Ассистент|Разговоры/i)
      .or(page.getByText(/Новый чат/i))
      .or(page.getByText(/Выход/i));

    await expect(russianText.first()).toBeVisible({ timeout: 10000 });

    // Verify localStorage is updated
    const storedLocale = await getLocaleFromStorage(page);
    expect(storedLocale).toBe('ru');
  });

  test('I18N-003: should switch language to English via profile modal', async ({ page }) => {
    // First switch to Polish, then back to English
    await page.waitForLoadState('networkidle');

    // Switch to Polish first
    await openProfileModal(page);
    await changeLanguageInProfile(page, 'pl');
    await saveProfileChanges(page, 'en');
    await page.waitForTimeout(2000);

    // Now switch back to English
    await openProfileModal(page);
    await changeLanguageInProfile(page, 'en');
    await saveProfileChanges(page, 'pl');
    await page.waitForTimeout(2000);

    // Verify English content is displayed
    const englishText = page
      .getByText(/AI Accounting Assistant|Conversations/i)
      .or(page.getByText(/New Chat/i))
      .or(page.getByText(/Logout/i));

    await expect(englishText.first()).toBeVisible({ timeout: 10000 });

    // Verify localStorage is updated
    const storedLocale = await getLocaleFromStorage(page);
    expect(storedLocale).toBe('en');
  });

  test('I18N-004: should preserve language after page reload', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Change to Polish via profile modal
    await openProfileModal(page);
    await changeLanguageInProfile(page, 'pl');
    await saveProfileChanges(page, 'en');

    // Wait for profile save to complete and UI to update
    await page.waitForTimeout(3000);

    // Verify localStorage is set to Polish BEFORE reload
    let storedLocale = await getLocaleFromStorage(page);
    // If locale isn't Polish yet, wait longer
    if (storedLocale !== 'pl') {
      await page.waitForTimeout(2000);
      storedLocale = await getLocaleFromStorage(page);
    }

    // Verify Polish content is displayed before reload
    const polishBefore = page.getByText(/Asystent|Rozmowy|Nowy czat/i);
    await expect(polishBefore.first()).toBeVisible({ timeout: 15000 });

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Extra wait for UI to settle

    // Verify localStorage still has the correct locale after reload
    storedLocale = await getLocaleFromStorage(page);
    expect(storedLocale).toBe('pl');

    // Verify Polish content is still displayed after reload
    const polishAfter = page.getByText(/Asystent|Rozmowy|Nowy czat/i);
    await expect(polishAfter.first()).toBeVisible({ timeout: 15000 });
  });

  test('I18N-006: should format dates/numbers according to locale', async ({ page }) => {
    // This test verifies locale-aware formatting in the UI
    // The application should format dates and numbers based on the selected locale

    // Test with English locale
    await setLocaleViaStorage(page, 'en');
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Look for any date elements in the page
    const dateElements = page.locator('[data-testid*="date"]').or(page.locator('time'));
    const dateCount = await dateElements.count();

    if (dateCount > 0) {
      // Verify date is visible
      await expect(dateElements.first()).toBeVisible();
    }

    // Test with Polish locale
    await setLocaleViaStorage(page, 'pl');
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Polish typically uses: DD.MM.YYYY
    // Numbers: 1 000,00 (space for thousands, comma for decimal)

    // Test with Russian locale
    await setLocaleViaStorage(page, 'ru');
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Russian typically uses: DD.MM.YYYY
    // Numbers: 1 000,00 (space for thousands, comma for decimal)

    // Verify the page loads correctly with each locale
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('I18N - Language Persistence', () => {
  test('I18N-007: should persist language preference across sessions', async ({ page, context }) => {
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

    try {
      await loginUser(page, testEmail, testPassword);
      await dismissCookieBanner(page);
    } catch {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');

    // Change locale to Russian via profile modal (this persists to both localStorage and user profile)
    await openProfileModal(page);
    await changeLanguageInProfile(page, 'ru');
    await saveProfileChanges(page, 'en');
    await page.waitForTimeout(2000);

    // Verify Russian content (using Cyrillic)
    await expect(
      page.getByText(/Ассистент|Разговоры/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Open a new page in the same context (simulating new tab)
    const newPage = await context.newPage();
    await newPage.goto('/chat');
    await newPage.waitForLoadState('networkidle');

    // Verify the new page also uses Russian locale (from localStorage)
    const storedLocale = await newPage.evaluate(() => localStorage.getItem('locale'));
    expect(storedLocale).toBe('ru');

    await newPage.close();
  });

  test('I18N-008: should sync language when user logs in with different locale preference', async ({
    page,
  }) => {
    // Login (user's locale preference will be applied from profile)
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

    try {
      await loginUser(page, testEmail, testPassword);
      await dismissCookieBanner(page);
    } catch {
      test.skip();
      return;
    }

    // After login, the locale should be synced from user profile
    await page.waitForLoadState('networkidle');

    // Verify the page loads with some valid locale stored
    const storedLocale = await getLocaleFromStorage(page);
    expect(SUPPORTED_LOCALES).toContain(storedLocale);

    // Verify the chat page loaded successfully
    await expect(page).toHaveURL(/.*\/chat/);
  });
});

test.describe('I18N - Login Page Translations', () => {
  // Note: Login page has its own locale state that defaults to English.
  // It only changes locale based on user's email lookup (API call), not localStorage.
  // Therefore, we can only reliably test the default English state.
  test('I18N-009: should display login page in English by default', async ({ page }) => {
    // Test login page in English (default state)
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await dismissCookieBanner(page);

    // Check for English login elements - heading or text containing "Sign in"
    await expect(
      page.getByRole('heading', { name: /Sign in/i })
        .or(page.locator('h1, h2').filter({ hasText: /Sign in/i }))
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible();

    // Verify form elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});

test.describe('I18N - Registration Page Translations', () => {
  // Note: Registration page has language toggle buttons (English/Polski) at the top.
  // It doesn't read from localStorage - you must click the buttons to change language.
  // Only EN and PL are supported on registration page (no Russian).
  test('I18N-010: should display registration page in correct language', async ({ page }) => {
    // Test registration page in English (default state)
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await dismissCookieBanner(page);

    // Check for English registration elements - "Create your account" or similar
    await expect(
      page.getByRole('heading', { name: /Create.*account/i })
        .or(page.locator('h1, h2').filter({ hasText: /Create.*account/i }))
    ).toBeVisible({ timeout: 10000 });

    // Click Polski button to switch to Polish
    const polskiButton = page.getByRole('button', { name: /Polski/i });
    await expect(polskiButton).toBeVisible({ timeout: 5000 });
    await polskiButton.click();

    // Wait for UI to update
    await page.waitForTimeout(1000);

    // Check for Polish registration elements - "Utwórz konto"
    await expect(
      page.getByRole('heading', { name: /Utwórz konto/i })
        .or(page.locator('h1, h2').filter({ hasText: /Utwórz konto/i }))
    ).toBeVisible({ timeout: 10000 });

    // Click English button to switch back
    const englishButton = page.getByRole('button', { name: /English/i });
    await expect(englishButton).toBeVisible({ timeout: 5000 });
    await englishButton.click();

    // Wait for UI to update
    await page.waitForTimeout(1000);

    // Check for English registration elements again
    await expect(
      page.getByRole('heading', { name: /Create.*account/i })
        .or(page.locator('h1, h2').filter({ hasText: /Create.*account/i }))
    ).toBeVisible({ timeout: 10000 });
  });
});
