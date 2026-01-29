import { test, expect } from '@playwright/test';
import { loginUser } from '../helpers/test-utils';
import { paymentTools, Language } from './tools-config';

const languages: Language[] = ['en', 'pl', 'ru'];

test.describe('AI Tools - Payments', () => {
  test.beforeEach(async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

    try {
      await loginUser(page, testEmail, testPassword);
    } catch {
      test.skip();
    }
  });

  // Generate tests for each payment tool in each language
  for (const tool of paymentTools) {
    for (const lang of languages) {
      test(`${tool.tool} - ${lang.toUpperCase()}`, async ({ page }) => {
        // Find message input
        const messageInput = page.locator('textarea')
          .or(page.locator('[data-testid="message-input"]'));

        await expect(messageInput).toBeVisible();

        // Get the query in the current language
        const query = tool[lang];

        // Send the query
        await messageInput.fill(query);
        await messageInput.press('Enter');

        // Wait for AI response (with extended timeout for API call)
        const aiResponse = page.locator('[data-testid="ai-message"]')
          .or(page.locator('.message-ai'))
          .or(page.locator('[data-role="assistant"]'));

        await expect(aiResponse.last()).toBeVisible({ timeout: 90000 });

        // Get response text
        const responseText = await aiResponse.last().textContent() || '';

        // Check that response matches expected pattern for the language
        const expectedPattern = tool.expectedKeywords[lang];
        expect(responseText).toMatch(expectedPattern);
      });
    }
  }
});
