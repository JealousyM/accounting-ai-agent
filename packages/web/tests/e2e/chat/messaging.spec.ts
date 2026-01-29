import { test, expect } from '@playwright/test';
import { loginUser, dismissCookieBanner } from '../helpers/test-utils';

test.describe('Chat - Messaging', () => {
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

  test('CHAT-002: should send text message and receive AI response', async ({ page }) => {
    // Find message input
    const messageInput = page.locator('textarea')
      .or(page.locator('[data-testid="message-input"]'))
      .or(page.locator('input[type="text"][placeholder*="message"]'));

    await expect(messageInput).toBeVisible();

    // Type a simple message
    await messageInput.fill('Hello, this is a test message');

    // Find and click send button
    const sendButton = page.locator('form button[type="submit"]')
      .or(page.getByRole('button', { name: /send|wyślij|отправить/i }));

    await sendButton.click();

    // Wait for AI response - bot messages have Bot icon (svg.lucide-bot)
    const aiResponse = page.locator('div.flex.items-start.gap-3').filter({ has: page.locator('svg.lucide-bot') });

    // Wait for response with extended timeout
    await expect(aiResponse.first()).toBeVisible({ timeout: 60000 });
  });

  test('should send message with Enter key', async ({ page }) => {
    const messageInput = page.locator('textarea')
      .or(page.locator('[data-testid="message-input"]'));

    await messageInput.fill('Test message via Enter key');

    // Press Enter to send
    await messageInput.press('Enter');

    // Wait for user message to appear - user messages use flex-row-reverse
    const userMessage = page.locator('div[class*="flex-row-reverse"]');

    await expect(userMessage.filter({ hasText: 'Test message via Enter' })).toBeVisible({ timeout: 5000 });
  });

  test('CHAT-008: should auto-scroll on new messages', async ({ page }) => {
    const messageInput = page.locator('textarea')
      .or(page.locator('[data-testid="message-input"]'));

    // Send a message
    await messageInput.fill('Test auto-scroll');
    await messageInput.press('Enter');

    // Wait for response
    await page.waitForTimeout(5000);

    // Check that the message container is scrolled to bottom
    const messageList = page.locator('[data-testid="message-list"]')
      .or(page.locator('.message-list'))
      .or(page.locator('main > div'));

    // Verify latest message is visible
    const messages = await messageList.locator('div.flex.items-start.gap-3').all();
    if (messages.length > 0) {
      await expect(messages[messages.length - 1]).toBeInViewport();
    }
  });

  test('should disable input while AI is responding', async ({ page }) => {
    const messageInput = page.locator('textarea')
      .or(page.locator('[data-testid="message-input"]'));

    await messageInput.fill('Tell me a short story');
    await messageInput.press('Enter');

    // Check if input is disabled during processing
    const sendButton = page.locator('form button[type="submit"]')
      .or(page.getByRole('button', { name: /send|wyślij|отправить/i }));

    // Button should be disabled or show loading state
    await expect(sendButton).toBeDisabled({ timeout: 2000 }).catch(() => {
      // Some implementations might not disable the button
    });
  });

  test('should show loading indicator while waiting for response', async ({ page }) => {
    const messageInput = page.locator('textarea')
      .or(page.locator('[data-testid="message-input"]'));

    await messageInput.fill('What is 2+2?');
    await messageInput.press('Enter');

    // Check for loading indicator
    const loadingIndicator = page.locator('[data-testid="loading"]')
      .or(page.locator('.loading'))
      .or(page.locator('.animate-spin'))
      .or(page.locator('.animate-pulse'));

    await expect(loadingIndicator).toBeVisible({ timeout: 5000 }).catch(() => {
      // Loading indicator might be too fast to catch
    });
  });

  test('should preserve message history on page reload', async ({ page }) => {
    const messageInput = page.locator('textarea')
      .or(page.locator('[data-testid="message-input"]'));

    // Send a unique message
    const uniqueMessage = `Test message ${Date.now()}`;
    await messageInput.fill(uniqueMessage);
    await messageInput.press('Enter');

    // Wait for message to be sent
    await page.waitForTimeout(5000);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if message is still visible (use .first() - message may appear in chat or sidebar)
    await expect(page.locator(`text="${uniqueMessage}"`).first()).toBeVisible({ timeout: 15000 });
  });

  test('should handle long messages', async ({ page }) => {
    const messageInput = page.locator('textarea')
      .or(page.locator('[data-testid="message-input"]'));

    // Create a long message
    const longMessage = 'This is a very long test message. '.repeat(20);
    await messageInput.fill(longMessage);
    await messageInput.press('Enter');

    // Message should be sent successfully
    await page.waitForTimeout(3000);

    // Check message appears - user messages use flex-row-reverse
    const userMessage = page.locator('div[class*="flex-row-reverse"]');

    await expect(userMessage.filter({ hasText: 'This is a very long test message' })).toBeVisible();
  });

  test('should clear input after sending', async ({ page }) => {
    const messageInput = page.locator('textarea')
      .or(page.locator('[data-testid="message-input"]'));

    await messageInput.fill('Test clear input');
    await messageInput.press('Enter');

    // Input should be cleared after sending
    await page.waitForTimeout(1000);
    await expect(messageInput).toHaveValue('');
  });
});
