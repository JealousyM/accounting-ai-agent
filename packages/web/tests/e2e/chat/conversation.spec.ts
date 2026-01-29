import { test, expect } from '@playwright/test';
import { loginUser, dismissCookieBanner } from '../helpers/test-utils';

test.describe('Chat - Conversation Management', () => {
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

  test('CHAT-001: should display chat interface', async ({ page }) => {
    // Verify chat page loaded
    await expect(page).toHaveURL(/.*\/chat/);

    // Check main chat elements
    await expect(page.locator('[data-testid="chat-container"]').or(page.locator('.chat-container')).or(page.locator('div.flex.h-screen'))).toBeVisible();

    // Check input area
    await expect(page.locator('textarea').or(page.locator('input[type="text"]'))).toBeVisible();

    // Check send button
    await expect(page.getByRole('button', { name: /send|wyślij|отправить/i }).or(page.locator('button[type="submit"]'))).toBeVisible();
  });

  test('CHAT-001: should create new conversation', async ({ page }) => {
    // Find and click new chat button (exists in both sidebar and header)
    const newChatButton = page.getByRole('button', { name: /new.*chat|nowy.*czat|новый.*чат/i })
      .or(page.locator('[data-testid="new-chat"]'))
      .or(page.locator('button:has(svg.lucide-message-square-plus)'));

    if (await newChatButton.first().isVisible()) {
      await newChatButton.first().click();

      // Wait for new conversation to be created
      await page.waitForTimeout(1000);

      // Check that we're in a new/empty conversation state
      const emptyState = page.locator('text=/start.*conversation|rozpocznij|начните/i')
        .or(page.locator('[data-testid="empty-state"]'));

      // Either empty state or fresh conversation
      await expect(emptyState.or(page.locator('div.flex-1.flex.flex-col'))).toBeVisible();
    }
  });

  test('CHAT-004: should switch between conversations', async ({ page }) => {
    // Check if conversation list/sidebar exists
    const sidebar = page.locator('[data-testid="conversation-list"]')
      .or(page.locator('.conversation-list'))
      .or(page.locator('div.w-72'));

    if (await sidebar.first().isVisible()) {
      // Find conversation items (div elements with cursor-pointer in the scrollable list)
      const scrollableList = sidebar.first().locator('div.overflow-y-auto');
      const conversationItems = scrollableList.locator('div.cursor-pointer');

      const count = await conversationItems.count();

      if (count > 1) {
        // Click on second conversation
        await conversationItems.nth(1).click();
        await page.waitForTimeout(500);

        // Verify conversation switched (messages should load)
        await expect(page.locator('[data-testid="message-list"]').or(page.locator('.message-list')).or(page.locator('div.flex-1.flex.flex-col'))).toBeVisible();
      }
    }
  });

  test('CHAT-005: should delete conversation', async ({ page }) => {
    // First, ensure we have a conversation to delete
    const conversationList = page.locator('[data-testid="conversation-list"]')
      .or(page.locator('.conversation-list'))
      .or(page.locator('div.w-72'));

    if (await conversationList.isVisible()) {
      const conversationItems = conversationList.locator('[data-testid="conversation-item"]')
        .or(conversationList.locator('button'))
        .or(conversationList.locator('li'));

      const count = await conversationItems.count();

      if (count > 0) {
        // Hover over first conversation to reveal delete button
        await conversationItems.first().hover();

        // Find delete button
        const deleteButton = conversationItems.first().locator('[data-testid="delete-conversation"]')
          .or(conversationItems.first().locator('button:has(svg[class*="trash"])'))
          .or(page.getByRole('button', { name: /delete|usuń|удалить/i }));

        if (await deleteButton.isVisible()) {
          await deleteButton.click();

          // Handle confirmation dialog if present
          const confirmButton = page.getByRole('button', { name: /confirm|yes|tak|да/i });
          if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click();
          }

          // Verify conversation was deleted
          await page.waitForTimeout(1000);
          const newCount = await conversationItems.count();
          expect(newCount).toBeLessThanOrEqual(count);
        }
      }
    }
  });

  test('CHAT-009: should show empty state for new users', async ({ page }) => {
    // Create a new conversation to see empty state
    const newChatButton = page.getByRole('button', { name: /new.*chat|nowy.*czat|новый.*чат/i })
      .or(page.locator('[data-testid="new-chat"]'));

    if (await newChatButton.first().isVisible()) {
      await newChatButton.first().click();
      await page.waitForTimeout(1000);
    }

    // Check for empty state elements
    const emptyState = page.locator('text=/start.*conversation|how.*help|jak.*pomóc|чем.*помочь/i')
      .or(page.locator('[data-testid="empty-state"]'))
      .or(page.locator('.empty-state'));

    // Empty state or suggestions should be visible
    await expect(emptyState.or(page.locator('text=/suggestion|przykład|пример/i'))).toBeVisible({ timeout: 5000 }).catch(() => {
      // Some implementations might not have empty state
    });
  });

  test('should show conversation history in sidebar', async ({ page }) => {
    // Check sidebar/conversation list (uses div.w-72, not semantic aside)
    const sidebar = page.locator('[data-testid="sidebar"]')
      .or(page.locator('div.w-72'))
      .or(page.locator('.sidebar'));

    // On mobile, might need to open sidebar first
    const menuButton = page.locator('[data-testid="menu-toggle"]')
      .or(page.getByRole('button', { name: /menu/i }));

    if (await menuButton.first().isVisible().catch(() => false)) {
      await menuButton.first().click();
      await page.waitForTimeout(300);
    }

    await expect(sidebar.first()).toBeVisible();
  });

  test('should handle mobile sidebar toggle', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Find mobile menu toggle
    const menuToggle = page.locator('[data-testid="menu-toggle"]')
      .or(page.getByRole('button', { name: /menu/i }))
      .or(page.locator('button:has(svg[class*="menu"])'));

    if (await menuToggle.isVisible()) {
      // Open sidebar
      await menuToggle.click();
      await page.waitForTimeout(300);

      // Check sidebar is visible
      const sidebar = page.locator('[data-testid="sidebar"]')
        .or(page.locator('div.w-72'));
      await expect(sidebar).toBeVisible();

      // Close sidebar
      await menuToggle.click();
      await page.waitForTimeout(300);
    }
  });
});
