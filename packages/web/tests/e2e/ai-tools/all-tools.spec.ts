/**
 * Comprehensive AI Tools Test Suite
 * Tests all 44 tools across 3 languages (EN, PL, RU)
 * Total: 132 test cases
 */

import { test, expect, Page } from '@playwright/test';
import { loginUser } from '../helpers/test-utils';
import { allTools, toolsByCategory, Language, ToolTestQuery } from './tools-config';

const languages: Language[] = ['en', 'pl', 'ru'];

// Helper function to run tool test
async function testTool(
  page: Page,
  tool: ToolTestQuery,
  lang: Language
) {
  // Find message input
  const messageInput = page.locator('textarea')
    .or(page.locator('[data-testid="message-input"]'));

  await expect(messageInput).toBeVisible();

  // Get the query in the current language
  const query = tool[lang];

  // Send the query
  await messageInput.fill(query);
  await messageInput.press('Enter');

  // Wait for AI response
  const aiResponse = page.locator('[data-testid="ai-message"]')
    .or(page.locator('.message-ai'))
    .or(page.locator('[data-role="assistant"]'));

  await expect(aiResponse.last()).toBeVisible({ timeout: 90000 });

  // Get response text
  const responseText = await aiResponse.last().textContent() || '';

  // Check response matches expected pattern
  const expectedPattern = tool.expectedKeywords[lang];
  expect(responseText).toMatch(expectedPattern);

  return responseText;
}

// Test each category
for (const [category, tools] of Object.entries(toolsByCategory)) {
  test.describe(`AI Tools - ${category.charAt(0).toUpperCase() + category.slice(1)}`, () => {
    test.beforeEach(async ({ page }) => {
      const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
      const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

      try {
        await loginUser(page, testEmail, testPassword);
      } catch {
        test.skip();
      }
    });

    for (const tool of tools) {
      for (const lang of languages) {
        test(`${tool.tool} - ${lang.toUpperCase()}`, async ({ page }) => {
          await testTool(page, tool, lang);
        });
      }
    }
  });
}

// Summary test to verify tool count
test.describe('AI Tools - Summary', () => {
  test('should have 44 tools configured', () => {
    expect(allTools.length).toBe(44);
  });

  test('should have 132 total test cases (44 tools × 3 languages)', () => {
    const totalTests = allTools.length * languages.length;
    expect(totalTests).toBe(132);
  });

  test('each tool should have queries in all languages', () => {
    for (const tool of allTools) {
      expect(tool.en).toBeTruthy();
      expect(tool.pl).toBeTruthy();
      expect(tool.ru).toBeTruthy();
    }
  });

  test('each tool should have expected keywords for all languages', () => {
    for (const tool of allTools) {
      expect(tool.expectedKeywords.en).toBeInstanceOf(RegExp);
      expect(tool.expectedKeywords.pl).toBeInstanceOf(RegExp);
      expect(tool.expectedKeywords.ru).toBeInstanceOf(RegExp);
    }
  });
});
